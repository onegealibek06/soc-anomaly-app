"""
agent.py — Реальный агент мониторинга процессов устройства.

Читает настоящие запущенные процессы с macOS/Linux/Windows через psutil
и отправляет их в SOC-систему для ML-анализа.

Запуск:
    python agent.py                    # непрерывный мониторинг
    python agent.py --once             # разовое сканирование
    python agent.py --interval 5       # сканировать каждые 5 секунд
"""

import psutil
import requests
import time
import argparse
import sys
import os
import socket
from datetime import datetime

BASE_URL = os.environ.get("SOC_BACKEND_URL", "http://127.0.0.1:8000")
HEADERS  = {"X-API-Key": os.environ.get("SOC_API_KEY", "soc_diploma_secret_2026")}

# Цвета для терминала
COLORS = {
    "critical": "\033[91m",   # красный
    "high":     "\033[93m",   # жёлтый
    "medium":   "\033[94m",   # синий
    "low":      "\033[96m",   # циан
    "normal":   "\033[92m",   # зелёный
    "reset":    "\033[0m",
    "bold":     "\033[1m",
    "dim":      "\033[2m",
}

# Процессы которые пропускаем — системный шум macOS/Linux
SKIP_NAMES = {
    # macOS системные демоны
    "kernel_task", "launchd", "logd", "notifyd", "distnoted",
    "cfprefsd", "UserEventAgent", "SpeechSynthesisServer",
    "com.apple.WebKit", "com.apple.appkit", "trustd", "securityd",
    "WindowServer", "hidd", "bluetoothd", "airportd", "mDNSResponder",
    "nsurlsessiond", "symptomsd", "mobileassetd", "secd", "coreduetd",
    "corespeechd", "coreaudiod", "coremediaiod", "rapportd", "sharingd",
    "familycircled", "routined", "remindd", "callservicesd", "IMDPersistenceAgent",
    "bird", "cloudd", "nsurlstoraged", "parsec-fbf", "parsecd", "diskarbitrationd",
    "fseventsd", "opendirectoryd", "syslogd", "configd", "powerd",
    "mediaremoted", "screencapturekit", "ScreenTimeAgent",
    # Linux системные
    "kthreadd", "migration", "rcu_sched", "watchdog", "cpuhp",
    "kdevtmpfs", "kauditd", "khungtaskd", "kworker",
    # Агент сам себя пропускает
    "agent.py",
}

# Отслеживаем уже отправленные процессы: (pid, create_time) → True
_seen: dict = {}


def clean_username(username: str | None) -> str:
    """'DOMAIN\\user' или 'user@host' → 'user'"""
    if not username:
        return "unknown"
    # Windows: DOMAIN\user
    if "\\" in username:
        username = username.split("\\")[-1]
    # macOS/Linux: user@host
    if "@" in username:
        username = username.split("@")[0]
    return username or "unknown"


def collect_processes() -> list[dict]:
    """Собирает все новые процессы с устройства."""
    new_events = []
    hostname = socket.gethostname().split('.')[0]  # короткое имя хоста

    for proc in psutil.process_iter(["pid", "name", "cmdline", "username", "create_time"]):
        try:
            info   = proc.info
            pid    = info["pid"]
            name   = (info.get("name") or "").strip()
            ctime  = info.get("create_time") or 0
            cmdlist = info.get("cmdline") or []
            user   = clean_username(info.get("username"))

            # Пропускаем системный шум
            if not name or name in SKIP_NAMES:
                continue
            if pid in (0, 1):  # PID 0 и 1 — ядро
                continue

            # Уникальный ключ — PID + время создания (исключает дубликаты)
            key = (pid, round(ctime, 2))
            if key in _seen:
                continue
            _seen[key] = True

            # Строим командную строку
            if cmdlist:
                cmdline = " ".join(str(c) for c in cmdlist)
            else:
                # Если cmdline недоступен — используем имя процесса
                cmdline = name

            # Обрезаем слишком длинные строки
            cmdline = cmdline[:600]

            new_events.append({
                "process_name": name[:100],
                "command_line": cmdline,
                "user": f"{clean_username(info.get('username'))}@{hostname}",
            })

        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    return new_events


def send_event(event: dict) -> dict | None:
    """Отправляет событие в SOC-бэкенд, возвращает результат."""
    try:
        resp = requests.post(
            f"{BASE_URL}/ingest",
            json=event,
            headers=HEADERS,
            timeout=8,
        )
        if resp.status_code == 200:
            return resp.json()
        else:
            print(f"  {COLORS['dim']}[SKIP] {resp.status_code}: {resp.text[:60]}{COLORS['reset']}")
            return None
    except requests.exceptions.ConnectionError:
        print(f"\n  {COLORS['critical']}[ERROR]{COLORS['reset']} Бэкенд недоступен: {BASE_URL}")
        print(f"  Убедись что FastAPI запущен: uvicorn app.main:app --reload\n")
        return None
    except requests.exceptions.Timeout:
        print(f"  {COLORS['dim']}[TIMEOUT] {event['process_name']}{COLORS['reset']}")
        return None
    except Exception as e:
        print(f"  {COLORS['dim']}[ERR] {e}{COLORS['reset']}")
        return None


def run_scan(verbose: bool = True) -> int:
    """Выполняет одно сканирование. Возвращает количество отправленных событий."""
    events = collect_processes()
    sent = 0

    if not events:
        if verbose:
            print(f"  {COLORS['dim']}[—] Новых процессов не обнаружено{COLORS['reset']}")
        return 0

    if verbose:
        print(f"\n  {COLORS['bold']}🔍 Обнаружено новых процессов: {len(events)}{COLORS['reset']}")

    for event in events:
        result = send_event(event)
        if result:
            sev   = result.get("severity", "normal")
            score = result.get("anomaly_score", 0.0)
            mitre = result.get("mitre_technique") or "—"
            color = COLORS.get(sev, "")
            reset = COLORS["reset"]
            dim   = COLORS["dim"]

            if verbose:
                print(
                    f"  {color}[{sev.upper():8}]{reset} "
                    f"{event['process_name'][:22]:<22} "
                    f"{dim}score={score:.4f}  user={event['user']:<12}  "
                    f"mitre={mitre[:40]}{reset}"
                )
            sent += 1

    return sent


def main():
    parser = argparse.ArgumentParser(description="SOC Real-Device Agent")
    parser.add_argument("--once",     action="store_true", help="Разовое сканирование и выход")
    parser.add_argument("--interval", type=int, default=8, help="Интервал сканирования в секундах (по умолчанию 8)")
    parser.add_argument("--quiet",    action="store_true", help="Минимальный вывод")
    args = parser.parse_args()

    verbose = not args.quiet

    print(f"\n{'═'*65}")
    print(f"  {COLORS['bold']}SOC ANOMALY DETECTION — Real Device Agent{COLORS['reset']}")
    print(f"  Backend : {BASE_URL}")
    print(f"  Platform: {sys.platform}")
    print(f"  Mode    : {'one-shot' if args.once else f'continuous (every {args.interval}s)'}")
    print(f"{'═'*65}\n")

    if args.once:
        total = run_scan(verbose=verbose)
        print(f"\n  ✅ Готово. Отправлено событий: {total}\n")
        return

    # Непрерывный мониторинг
    scan_num = 0
    total_sent = 0
    try:
        while True:
            scan_num += 1
            ts = datetime.now().strftime("%H:%M:%S")
            if verbose:
                print(f"\n{'─'*65}")
                print(f"  {COLORS['dim']}Скан #{scan_num}  [{ts}]{COLORS['reset']}")

            sent = run_scan(verbose=verbose)
            total_sent += sent

            if verbose:
                print(f"  {COLORS['dim']}Итого отправлено за сессию: {total_sent} | Следующий скан через {args.interval}с{COLORS['reset']}")

            time.sleep(args.interval)

    except KeyboardInterrupt:
        print(f"\n\n  ✅ Агент остановлен. Всего отправлено событий: {total_sent}\n")


if __name__ == "__main__":
    main()
