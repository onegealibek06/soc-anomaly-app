import os
from dotenv import load_dotenv

load_dotenv()


class _Settings:
    API_KEY      = os.getenv("API_KEY",      "soc_diploma_secret_2026")
    JWT_SECRET   = os.getenv("JWT_SECRET",   "sentinel_soc_jwt_2026_secure")
    JWT_ALGO     = "HS256"
    ADMIN_EMAIL  = os.getenv("ADMIN_EMAIL",  "admin@sentinel.ai")

    TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
    TELEGRAM_CHAT_ID   = os.getenv("TELEGRAM_CHAT_ID")
    ALERT_WEBHOOK_URL  = os.getenv("ALERT_WEBHOOK_URL")


settings = _Settings()
