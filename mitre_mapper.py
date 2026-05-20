import re


class MitreMapper:
    def __init__(self):
        # Полная база MITRE ATT&CK техник — Windows + Linux + macOS
        # pattern: регекс с границами слов для точного совпадения
        self.rules = [
            # ──────── EXECUTION (TA0002) ────────
            {
                "pattern": r"\bpowershell\b",
                "technique": "T1059.001",
                "tactic": "Execution",
                "name": "PowerShell Execution",
                "platform": "Windows",
                "impact": "Выполнение произвольного кода через PowerShell.",
                "remediation": "Включить ScriptBlock Logging (Event ID 4104). Ограничить через Constrained Language Mode.",
                "severity_boost": 0.2,
            },
            {
                "pattern": r"\bcmd\.exe\b",
                "technique": "T1059.003",
                "tactic": "Execution",
                "name": "Windows Command Shell",
                "platform": "Windows",
                "impact": "Выполнение команд через cmd.exe.",
                "remediation": "Мониторинг Event ID 4688. Ограничить доступ к cmd.exe через AppLocker.",
                "severity_boost": 0.1,
            },
            {
                "pattern": r"\b(bash|sh|zsh|dash|ksh)\b",
                "technique": "T1059.004",
                "tactic": "Execution",
                "name": "Unix Shell Execution",
                "platform": "Linux/macOS",
                "impact": "Выполнение shell-команд.",
                "remediation": "Мониторинг auditd. Ограничить интерактивный доступ к shell для служебных аккаунтов.",
                "severity_boost": 0.1,
            },
            {
                "pattern": r"\bpython[23]?\b",
                "technique": "T1059.006",
                "tactic": "Execution",
                "name": "Python Script Execution",
                "platform": "Cross-platform",
                "impact": "Выполнение произвольного Python-кода.",
                "remediation": "Мониторинг запуска интерпретаторов. Контроль скриптов в /tmp и AppData.",
                "severity_boost": 0.05,
            },
            {
                "pattern": r"\b(mshta|wscript|cscript)\b",
                "technique": "T1059.007",
                "tactic": "Execution",
                "name": "JavaScript/VBScript via Windows Scripting Host",
                "platform": "Windows",
                "impact": "Выполнение скриптов через встроенные движки Windows.",
                "remediation": "Отключить Windows Scripting Host через GPO если не используется.",
                "severity_boost": 0.35,
            },
            {
                "pattern": r"\b(rundll32|regsvr32|regasm|regsvcs)\b",
                "technique": "T1218",
                "tactic": "Defense Evasion",
                "name": "Signed Binary Proxy Execution (LOLBin)",
                "platform": "Windows",
                "impact": "Обход защиты через запуск кода внутри легитимных Windows-процессов.",
                "remediation": "Мониторинг вызовов rundll32/regsvr32 с нестандартными DLL. Применить AppLocker.",
                "severity_boost": 0.4,
            },

            # ──────── DISCOVERY (TA0007) ────────
            {
                "pattern": r"\bwhoami\b",
                "technique": "T1033",
                "tactic": "Discovery",
                "name": "System Owner/User Discovery",
                "platform": "Cross-platform",
                "impact": "Разведка: определение текущего пользователя.",
                "remediation": "Само по себе не критично. Анализировать в контексте цепочки команд.",
                "severity_boost": 0.1,
            },
            {
                "pattern": r"\bnet\s+user\b",
                "technique": "T1087.001",
                "tactic": "Discovery",
                "name": "Local Account Discovery",
                "platform": "Windows",
                "impact": "Разведка локальных учётных записей.",
                "remediation": "Проверить, не является ли частью разведки привилегированных аккаунтов.",
                "severity_boost": 0.2,
            },
            {
                "pattern": r"\b(ipconfig|ifconfig|ip\s+addr)\b",
                "technique": "T1016",
                "tactic": "Discovery",
                "name": "System Network Configuration Discovery",
                "platform": "Cross-platform",
                "impact": "Разведка сетевой конфигурации.",
                "remediation": "Анализировать в контексте других команд разведки.",
                "severity_boost": 0.1,
            },
            {
                "pattern": r"\b(systeminfo|uname|hostnamectl)\b",
                "technique": "T1082",
                "tactic": "Discovery",
                "name": "System Information Discovery",
                "platform": "Cross-platform",
                "impact": "Сбор информации об ОС и конфигурации системы.",
                "remediation": "Мониторинг массового запуска команд разведки.",
                "severity_boost": 0.1,
            },
            {
                "pattern": r"\b(tasklist|ps\s+-aux|ps\s+aux|pgrep)\b",
                "technique": "T1057",
                "tactic": "Discovery",
                "name": "Process Discovery",
                "platform": "Cross-platform",
                "impact": "Перечисление запущенных процессов.",
                "remediation": "Контролировать в связке с другими разведывательными командами.",
                "severity_boost": 0.1,
            },
            {
                "pattern": r"\bnmap\b",
                "technique": "T1046",
                "tactic": "Discovery",
                "name": "Network Service Discovery",
                "platform": "Cross-platform",
                "impact": "Сканирование портов и сервисов сети.",
                "remediation": "Немедленно изолировать хост. Nmap на сервере — явный признак горизонтального перемещения.",
                "severity_boost": 0.5,
            },
            {
                "pattern": r"\b(netstat|ss\s+-tulnp)\b",
                "technique": "T1049",
                "tactic": "Discovery",
                "name": "System Network Connections Discovery",
                "platform": "Cross-platform",
                "impact": "Разведка сетевых соединений.",
                "remediation": "Анализировать в контексте других сетевых команд.",
                "severity_boost": 0.1,
            },

            # ──────── PERSISTENCE (TA0003) ────────
            {
                "pattern": r"\bschtasks\b",
                "technique": "T1053.005",
                "tactic": "Persistence",
                "name": "Scheduled Task",
                "platform": "Windows",
                "impact": "Закрепление в системе через планировщик задач.",
                "remediation": "Проверить список задач: schtasks /query /fo LIST /v. Удалить подозрительные.",
                "severity_boost": 0.35,
            },
            {
                "pattern": r"\breg\s+(add|delete|import)\b",
                "technique": "T1547.001",
                "tactic": "Persistence",
                "name": "Registry Run Keys / Startup Folder",
                "platform": "Windows",
                "impact": "Закрепление через ключи автозагрузки реестра.",
                "remediation": "Проверить HKCU/HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run.",
                "severity_boost": 0.4,
            },
            {
                "pattern": r"\bcrontab\b",
                "technique": "T1053.003",
                "tactic": "Persistence",
                "name": "Cron Persistence",
                "platform": "Linux/macOS",
                "impact": "Закрепление через cron-задачи.",
                "remediation": "Проверить crontab -l и /etc/cron*. Удалить посторонние записи.",
                "severity_boost": 0.35,
            },
            {
                "pattern": r"\b(launchctl|launchd)\b",
                "technique": "T1543.001",
                "tactic": "Persistence",
                "name": "Launch Agent/Daemon",
                "platform": "macOS",
                "impact": "Закрепление через Launch Agent или Daemon.",
                "remediation": "Проверить ~/Library/LaunchAgents и /Library/LaunchDaemons.",
                "severity_boost": 0.35,
            },
            {
                "pattern": r"\b(systemctl\s+enable|service\s+\w+\s+enable)\b",
                "technique": "T1543.002",
                "tactic": "Persistence",
                "name": "Systemd Service",
                "platform": "Linux",
                "impact": "Закрепление через systemd сервис.",
                "remediation": "Проверить systemctl list-units --type=service. Убрать посторонние сервисы.",
                "severity_boost": 0.3,
            },
            {
                "pattern": r"authorized_keys",
                "technique": "T1098.004",
                "tactic": "Persistence",
                "name": "SSH Authorized Keys",
                "platform": "Linux/macOS",
                "impact": "Добавление SSH-ключа для постоянного доступа без пароля.",
                "remediation": "Проверить ~/.ssh/authorized_keys. Удалить неизвестные ключи.",
                "severity_boost": 0.5,
            },

            # ──────── PRIVILEGE ESCALATION (TA0004) ────────
            {
                "pattern": r"\bsudo\s+-[ils]\b",
                "technique": "T1548.003",
                "tactic": "Privilege Escalation",
                "name": "Sudo and Sudo Caching",
                "platform": "Linux/macOS",
                "impact": "Попытка проверить или злоупотребить sudo-привилегиями.",
                "remediation": "Проверить /etc/sudoers. Ограничить NOPASSWD записи.",
                "severity_boost": 0.3,
            },
            {
                "pattern": r"\bchmod\s+\+s\b",
                "technique": "T1548.001",
                "tactic": "Privilege Escalation",
                "name": "Setuid and Setgid",
                "platform": "Linux/macOS",
                "impact": "Установка SUID-бита для повышения привилегий.",
                "remediation": "Найти SUID файлы: find / -perm -4000. Убрать бит с подозрительных файлов.",
                "severity_boost": 0.5,
            },
            {
                "pattern": r"\bnet\s+(localgroup|group)\s+administrators\b",
                "technique": "T1078.001",
                "tactic": "Privilege Escalation",
                "name": "Default Account Abuse (Admin Group)",
                "platform": "Windows",
                "impact": "Добавление аккаунта в группу администраторов.",
                "remediation": "Немедленно проверить членство в группе администраторов.",
                "severity_boost": 0.6,
            },

            # ──────── DEFENSE EVASION (TA0005) ────────
            {
                "pattern": r"-[eE]ncodedCommand\b",
                "technique": "T1027.010",
                "tactic": "Defense Evasion",
                "name": "Command Obfuscation (EncodedCommand)",
                "platform": "Windows",
                "impact": "Скрытие реального содержимого команды через Base64.",
                "remediation": "Декодировать и проанализировать Base64-команду. Включить Script Block Logging.",
                "severity_boost": 0.5,
            },
            {
                "pattern": r"\b(history\s+-c|unset\s+HISTFILE|export\s+HISTSIZE=0)\b",
                "technique": "T1070.003",
                "tactic": "Defense Evasion",
                "name": "Clear Command History",
                "platform": "Linux/macOS",
                "impact": "Уничтожение следов активности атакующего.",
                "remediation": "Настроить централизованную отправку логов для предотвращения их локального удаления.",
                "severity_boost": 0.4,
            },
            {
                "pattern": r"\b(wevtutil\s+cl|clear-eventlog)\b",
                "technique": "T1070.001",
                "tactic": "Defense Evasion",
                "name": "Clear Windows Event Logs",
                "platform": "Windows",
                "impact": "Удаление Windows Event Logs для сокрытия следов.",
                "remediation": "Настроить централизованный SIEM. Мониторинг Event ID 1102 (очистка лога).",
                "severity_boost": 0.5,
            },
            {
                "pattern": r"\bkillall\b",
                "technique": "T1489",
                "tactic": "Impact",
                "name": "Service Stop",
                "platform": "Linux/macOS",
                "impact": "Остановка сервисов — возможная подготовка к деструктивным действиям.",
                "remediation": "Проверить какие именно сервисы были остановлены.",
                "severity_boost": 0.2,
            },

            # ──────── CREDENTIAL ACCESS (TA0006) ────────
            {
                "pattern": r"\b(mimikatz|sekurlsa|lsadump)\b",
                "technique": "T1003.001",
                "tactic": "Credential Access",
                "name": "LSASS Memory Dump",
                "platform": "Windows",
                "impact": "Дамп учётных данных из памяти LSASS.",
                "remediation": "Включить Credential Guard. Изолировать хост немедленно.",
                "severity_boost": 0.9,
            },
            {
                "pattern": r"\b(cat\s+/etc/passwd|cat\s+/etc/shadow)\b",
                "technique": "T1003.008",
                "tactic": "Credential Access",
                "name": "/etc/passwd and /etc/shadow Dump",
                "platform": "Linux",
                "impact": "Чтение файлов с хэшами паролей.",
                "remediation": "Проверить права доступа к /etc/shadow. Немедленно сменить пароли.",
                "severity_boost": 0.7,
            },

            # ──────── LATERAL MOVEMENT (TA0008) ────────
            {
                "pattern": r"\b(psexec|wmic\s+/node)\b",
                "technique": "T1021.006",
                "tactic": "Lateral Movement",
                "name": "Remote Services: Windows Remote Management",
                "platform": "Windows",
                "impact": "Удалённое выполнение команд на других хостах.",
                "remediation": "Проверить подключения. Ограничить PsExec через GPO.",
                "severity_boost": 0.5,
            },
            {
                "pattern": r"\bssh\s+.+@\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b",
                "technique": "T1021.004",
                "tactic": "Lateral Movement",
                "name": "SSH Lateral Movement",
                "platform": "Linux/macOS",
                "impact": "SSH-подключение к внутренним хостам по IP — признак горизонтального перемещения.",
                "remediation": "Проверить SSH-активность. Настроить certificate-based auth.",
                "severity_boost": 0.4,
            },

            # ──────── COLLECTION / EXFILTRATION (TA0009/TA0010) ────────
            {
                "pattern": r"\b(curl|wget)\b",
                "technique": "T1105",
                "tactic": "Command and Control",
                "name": "Ingress Tool Transfer",
                "platform": "Cross-platform",
                "impact": "Передача файлов с/на внешний ресурс.",
                "remediation": "Проверить URL. Если это продакшн-сервер, подозрительна загрузка из интернета.",
                "severity_boost": 0.15,  # низкий буст — curl легитимен сам по себе
            },
            {
                "pattern": r"\bbitsadmin\b",
                "technique": "T1197",
                "tactic": "Defense Evasion",
                "name": "BITS Jobs Abuse",
                "platform": "Windows",
                "impact": "Скрытая фоновая передача файлов через BITS.",
                "remediation": "Проверить задачи: bitsadmin /list /allusers /verbose.",
                "severity_boost": 0.4,
            },
            {
                "pattern": r"\b(certutil\s+-urlcache|-decode)\b",
                "technique": "T1140",
                "tactic": "Defense Evasion",
                "name": "Deobfuscate via CertUtil",
                "platform": "Windows",
                "impact": "Certutil используется для скачивания или декодирования вредоносных файлов.",
                "remediation": "Проверить историю certutil. Изолировать хост при подозрении.",
                "severity_boost": 0.45,
            },
            {
                "pattern": r"\b(nc|ncat|netcat)\s+-[el]\b",
                "technique": "T1059.004",
                "tactic": "Command and Control",
                "name": "Reverse Shell via Netcat",
                "platform": "Cross-platform",
                "impact": "Установка реверс-шелла — типичный C2-канал.",
                "remediation": "Немедленно изолировать хост. Блокировать исходящий трафик на нестандартных портах.",
                "severity_boost": 0.8,
            },
            {
                "pattern": r"\b(mkfifo|/dev/tcp|/dev/udp)\b",
                "technique": "T1059.004",
                "tactic": "Command and Control",
                "name": "Named Pipe / TCP Reverse Shell",
                "platform": "Linux/macOS",
                "impact": "Создание именованного канала для реверс-шелла.",
                "remediation": "Немедленно изолировать хост и провести анализ памяти.",
                "severity_boost": 0.8,
            },

            # ──────── IMPACT (TA0040) ────────
            {
                "pattern": r"\b(rm\s+-rf\s+/|del\s+/[fqs]+\s+[a-z]:\\)\b",
                "technique": "T1485",
                "tactic": "Impact",
                "name": "Data Destruction",
                "platform": "Cross-platform",
                "impact": "Массовое удаление файлов — деструктивная атака.",
                "remediation": "Немедленно отключить хост от сети. Восстановить из резервной копии.",
                "severity_boost": 0.9,
            },
            {
                "pattern": r"\b(openssl\s+enc|gpg\s+-[ce])\b",
                "technique": "T1486",
                "tactic": "Impact",
                "name": "Data Encrypted for Impact (Ransomware-like)",
                "platform": "Cross-platform",
                "impact": "Шифрование данных — поведение, характерное для ransomware.",
                "remediation": "Немедленно изолировать хост. Проверить статус файловой системы.",
                "severity_boost": 0.7,
            },
        ]

    # Домены, которые НЕ считаются угрозой — легитимные CDN и пакетные репозитории
    TRUSTED_DOMAINS = (
        "github.com", "githubusercontent.com",
        "pypi.org", "python.org",
        "npmjs.com", "registry.npmjs.org",
        "microsoft.com", "windowsupdate.com",
        "apple.com", "icloud.com",
        "ubuntu.com", "debian.org",
        "docker.io", "hub.docker.com",
        "127.0.0.1", "localhost",
    )

    def _is_trusted_url(self, command_line: str) -> bool:
        """True если команда работает только с доверенными доменами."""
        import re
        urls = re.findall(r'https?://([\w\-.]+)', command_line.lower())
        if not urls:
            return False
        return all(
            any(domain in url for domain in self.TRUSTED_DOMAINS)
            for url in urls
        )

    def get_attack_info(self, command_line: str) -> list:
        if not command_line:
            return []
        cmd_lower = command_line.lower()
        is_trusted = self._is_trusted_url(command_line)
        found = []
        seen_techniques = set()

        for rule in self.rules:
            # Пропускаем T1105 (curl/wget) если URL доверенный и нет подозрительного флага (--data, -F)
            if rule["technique"] == "T1105" and is_trusted:
                has_upload_flag = bool(re.search(r'\s(-[dFT]|--data|--upload|--post)', cmd_lower))
                if not has_upload_flag:
                    continue

            # Пропускаем T1059.006 (python) для типичных dev-команд (runserver, pytest, manage.py и т.п.)
            if rule["technique"] == "T1059.006":
                dev_patterns = r'\b(runserver|pytest|manage\.py|setup\.py|pip\s+install|uvicorn|gunicorn|celery)\b'
                if re.search(dev_patterns, cmd_lower):
                    continue

            try:
                if re.search(rule["pattern"], cmd_lower, re.IGNORECASE):
                    if rule["technique"] not in seen_techniques:
                        found.append(rule)
                        seen_techniques.add(rule["technique"])
            except re.error:
                if rule["pattern"] in cmd_lower:
                    found.append(rule)
        return found

    def get_severity_boost(self, techniques: list) -> float:
        """Суммарный буст severity от найденных техник (с потолком 0.85)."""
        if not techniques:
            return 0.0
        total = sum(t.get("severity_boost", 0.1) for t in techniques)
        return min(0.85, total)

    def format_techniques(self, techniques: list) -> str:
        if not techniques:
            return None
        return ", ".join([f"{t['name']} ({t['technique']})" for t in techniques])

    def get_tactics(self, techniques: list) -> list:
        """Возвращает уникальные тактики MITRE ATT&CK."""
        return list(set(t["tactic"] for t in techniques))