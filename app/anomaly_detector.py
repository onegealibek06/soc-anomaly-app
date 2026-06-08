import pandas as pd
import re
import os
import joblib
import math
import logging
import numpy as np
from collections import Counter
from sklearn.ensemble import IsolationForest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AnomalyDetector:
    MODEL_FILE = "soc_model.joblib"

    def __init__(self):
        self.model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
        self.is_trained = False
        self.load_model()

    # ── Энтропия Шеннона ──────────────────────────────────────────────────────
    def _calculate_entropy(self, text: str) -> float:
        if not text:
            return 0.0
        counts = Counter(text)
        probs = [c / len(text) for c in counts.values()]
        return -sum(p * math.log2(p) for p in probs)

    # ── Feature Engineering ───────────────────────────────────────────────────
    def _extract_features(self, events: list[dict]) -> pd.DataFrame:
        data = []
        for e in events:
            cmd  = (e.get("command_line",  "") or "").lower()
            proc = (e.get("process_name",  "") or "").lower()
            user = (e.get("user",          "") or "").lower()

            features = {
                # 1. Метрики длины и структуры
                "cmd_length":    len(cmd),
                "arg_count":     len(cmd.split()),
                "pipe_count":    cmd.count("|") + cmd.count(">"),

                # Спецсимволы, типичные для эксплойтов
                "special_chars": len(re.findall(r'[&|;$%^><`!\\]', cmd)),

                # 2. Подозрительные пути (Windows + Linux + macOS)
                "is_suspicious_path": 1 if re.search(
                    r'\b(temp|appdata|recycle\.bin|/tmp|/dev/shm|/var/tmp|/dev/tcp|/dev/udp)\b', cmd
                ) else 0,

                # 3. Признаки обфускации
                "entropy":              self._calculate_entropy(cmd),
                "has_base64":           1 if re.search(r'[A-Za-z0-9+/]{40,}={0,2}', cmd) else 0,
                "obfuscation_markers":  len(re.findall(r'(\^|\$|\{|\}|\+)', cmd)),
                "has_encoded_cmd":      1 if re.search(r'-[eE]ncodedCommand', cmd) else 0,

                # 4. Сетевые индикаторы
                "has_ip":   1 if re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', cmd) else 0,
                "has_url":  1 if re.search(r'https?://', cmd) else 0,

                # 5. Категории команд — Windows
                "is_recon_cmd":    1 if re.search(
                    r'\b(whoami|net\s+user|ipconfig|systeminfo|tasklist|netstat|wmic)\b', cmd
                ) else 0,
                "is_download_tool": 1 if re.search(
                    r'\b(curl|wget|downloadstring|bitsadmin|certutil|invoke-webrequest)\b', cmd
                ) else 0,
                "is_lolbin":        1 if re.search(
                    r'\b(rundll32|regsvr32|mshta|wscript|cscript|regasm|regsvcs)\b', cmd
                ) else 0,
                "is_shell_proc":    1 if re.search(
                    r'\b(powershell|cmd\.exe|bash|sh|zsh|dash)\b', proc
                ) else 0,

                # 6. Категории команд — Linux / macOS
                "is_recon_linux":   1 if re.search(
                    r'\b(id|uname|who|w\b|last|ps\s+aux|ps\s+-aux|pgrep|lsof|ss\b|netstat)\b', cmd
                ) else 0,
                "is_persistence":   1 if re.search(
                    r'\b(crontab|schtasks|reg\s+add|launchctl|systemctl\s+enable|authorized_keys)\b', cmd
                ) else 0,
                "is_privesc":       1 if re.search(
                    r'\b(sudo\s+-[ils]|chmod\s+\+s|net\s+localgroup\s+administrators)\b', cmd
                ) else 0,
                "is_c2_indicator":  1 if re.search(
                    r'\b(nc\s+-[el]|ncat|mkfifo|/dev/tcp|mimikatz|sekurlsa|meterpreter|reverse_shell)\b', cmd
                ) else 0,

                # 7. Признаки уничтожения следов
                "is_log_tampering": 1 if re.search(
                    r'\b(history\s+-c|unset\s+HISTFILE|wevtutil\s+cl|clear-eventlog|rm\s+.*\.log)\b', cmd
                ) else 0,

                # 8. Признак системного vs пользовательского процесса
                "is_system_user":   1 if user in ("system", "root", "nt authority\\system") else 0,
            }
            data.append(features)
        return pd.DataFrame(data)

    # ── Train ─────────────────────────────────────────────────────────────────
    def train(self, events: list[dict]):
        if len(events) < 50:
            logger.warning(f"Недостаточно данных: {len(events)}, нужно ≥50")
            return

        X = self._extract_features(events)
        # contamination=0.08 — ожидаем ~8% аномалий в обучающем наборе
        self.model = IsolationForest(n_estimators=200, contamination=0.08, random_state=42)
        self.model.fit(X)
        self.is_trained = True
        self.save_model()
        logger.info("✅ Модель обучена и сохранена.")

    def save_model(self):
        try:
            joblib.dump(self.model, self.MODEL_FILE)
        except Exception as e:
            logger.error(f"Ошибка сохранения модели: {e}")

    def load_model(self):
        if os.path.exists(self.MODEL_FILE):
            try:
                self.model = joblib.load(self.MODEL_FILE)
                self.is_trained = True
                logger.info("✅ Модель загружена с диска.")
            except Exception as e:
                logger.error(f"Ошибка загрузки модели: {e}")

    # Белый список: процессы+паттерны, которые никогда не являются атакой
    BENIGN_PATTERNS = [
        # Браузеры
        (r'chrome|firefox|safari|edge|opera', r'--type='),
        # Системные процессы Linux
        (r'nginx|apache2|sshd|systemd|cron|journalctl|rsyslog|auditd', r'.*'),
        (r'systemd', r'.*'),
        # Python дев-инструменты
        (r'python[23]?|pip[23]?', r'(manage\.py|runserver|pytest|setup\.py|pip\s+install|uvicorn|gunicorn|celery|migrate|makemigrations)'),
        # Node/JS
        (r'node|npm|npx', r'(server\.js|index\.js|start|install|run\s+dev|run\s+build)'),
        # Git
        (r'git(\.exe)?', r'(pull|push|clone|commit|checkout|status|log|diff)'),
        # curl/wget к доверенным доменам
        (r'curl|wget', r'(github\.com|githubusercontent\.com|pypi\.org|npmjs\.com|microsoft\.com|ubuntu\.com|debian\.org|127\.0\.0\.1|localhost)'),
        # macOS
        (r'finder|launchd|softwareupdate|osascript', r'.*'),
    ]

    def _is_benign(self, event: dict) -> bool:
        """True если процесс попадает в белый список."""
        proc = (event.get('process_name', '') or '').lower()
        cmd  = (event.get('command_line',  '') or '').lower()
        for proc_pattern, cmd_pattern in self.BENIGN_PATTERNS:
            if re.search(proc_pattern, proc) and re.search(cmd_pattern, cmd):
                return True
        return False

    # ── Score ─────────────────────────────────────────────────────────────────
    def score(self, event: dict, mitre_boost: float = 0.0) -> float:
        """
        Возвращает anomaly score [0.0 … 0.99].

        Гибридный подход:
        1. ML-вероятность из IsolationForest (сигмоид от decision_function)
        2. Rule-based буст за явные критические маркеры
        3. MITRE-буст передаётся извне из MitreMapper для точного разделения ответственности

        Финальный скор = max(ml_prob, критические_маркеры) + MITRE_буст * 0.4
        — ML никогда не игнорируется, MITRE только усиливает, не заменяет.
        """
        if not self.is_trained:
            # Если модель не обучена, используем только rule-based эвристику
            return self._rule_based_score(event)

        # Белый список: если это заведомо легитимный процесс — не тратим ML
        if self._is_benign(event):
            return 0.05

        features_df = self._extract_features([event])
        raw_score = float(self.model.decision_function(features_df)[0])

        # Сигмоид — конвертируем decision_function в вероятность [0..1]
        # Чем отрицательнее raw_score, тем более аномально
        ml_prob = 1.0 / (1.0 + math.exp((raw_score + 0.05) * 15))

        # Rule-based буст только за БЕССПОРНО критические маркеры
        f = features_df.iloc[0]
        rule_boost = 0.0

        if f["is_c2_indicator"]:        rule_boost += 0.55  # реверс-шелл = критично всегда
        if f["has_encoded_cmd"]:        rule_boost += 0.35  # -EncodedCommand — почти всегда зловредно
        if f["is_log_tampering"]:       rule_boost += 0.30  # уничтожение логов
        if f["is_privesc"]:             rule_boost += 0.25  # повышение привилегий
        if f["is_persistence"]:         rule_boost += 0.15  # закрепление — умеренный буст
        if f["has_base64"] and f["is_shell_proc"]:
            rule_boost += 0.25  # base64 в shell — обфускация
        if f["has_ip"] and f["is_download_tool"]:
            rule_boost += 0.20  # скачивание по прямому IP
        if f["is_lolbin"]:              rule_boost += 0.15  # LOLBin — подозрительно
        if f["is_suspicious_path"] and f["is_download_tool"]:
            rule_boost += 0.20  # загрузка во временные папки

        # MITRE-буст: влияет на 40% его значения (не перекрывает ML)
        mitre_contribution = mitre_boost * 0.4

        # Итоговый скор: ML-вероятность + буст за критические правила + вклад MITRE
        # max(ml_prob, rule_boost) гарантирует что при явной атаке скор не будет занижен
        base = max(ml_prob, rule_boost * 0.7)
        final = base + mitre_contribution

        return float(min(0.99, final))

    def _rule_based_score(self, event: dict) -> float:
        """Запасной rule-based скор, когда модель не обучена."""
        features_df = self._extract_features([event])
        f = features_df.iloc[0]
        score = 0.05
        if f["is_c2_indicator"]:      score += 0.70
        if f["has_encoded_cmd"]:      score += 0.50
        if f["is_log_tampering"]:     score += 0.40
        if f["is_privesc"]:           score += 0.35
        if f["has_base64"]:           score += 0.25
        if f["is_download_tool"]:     score += 0.10
        if f["is_recon_cmd"]:         score += 0.10
        return float(min(0.99, score))