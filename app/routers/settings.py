from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from app.core.config import settings
from app.core.security import require_admin
import httpx
import json
import os

router = APIRouter(prefix="/settings", tags=["settings"])


class TelegramConfigRequest(BaseModel):
    bot_token: str
    chat_id: str
    webhook_url: str = ""


@router.get("/sensitive")
def get_sensitive_settings(admin: str = Depends(require_admin)):
    return {
        "api_key":              settings.API_KEY,
        "jwt_secret":           settings.JWT_SECRET,
        "jwt_algorithm":        settings.JWT_ALGO,
        "backend_url":          "http://127.0.0.1:8000",
        "admin_email":          settings.ADMIN_EMAIL,
        "telegram_configured":  bool(settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID),
        "webhook_configured":   bool(settings.ALERT_WEBHOOK_URL),
    }


@router.get("/telegram")
def get_telegram_config(admin: str = Depends(require_admin)):
    token  = settings.TELEGRAM_BOT_TOKEN or ""
    masked = token[:8] + "…" + token[-6:] if len(token) > 14 else ("set" if token else "")
    return {
        "configured":       bool(settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID),
        "bot_token_masked": masked,
        "bot_token":        token,
        "chat_id":          settings.TELEGRAM_CHAT_ID or "",
        "webhook_url":      settings.ALERT_WEBHOOK_URL or "",
    }


@router.post("/telegram")
def save_telegram_config(data: TelegramConfigRequest, admin: str = Depends(require_admin)):
    env_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    )

    lines: list[str] = []
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            lines = f.readlines()

    def _set(key: str, val: str) -> bool:
        for i, line in enumerate(lines):
            if line.startswith(f"{key}=") or line.startswith(f"{key} ="):
                lines[i] = f'{key}="{val}"\n'
                return True
        return False

    for key, val in [
        ("TELEGRAM_BOT_TOKEN", data.bot_token),
        ("TELEGRAM_CHAT_ID",   data.chat_id),
        ("ALERT_WEBHOOK_URL",  data.webhook_url),
    ]:
        if not _set(key, val):
            lines.append(f'{key}="{val}"\n')

    with open(env_path, "w") as f:
        f.writelines(lines)

    settings.TELEGRAM_BOT_TOKEN = data.bot_token or None
    settings.TELEGRAM_CHAT_ID   = data.chat_id   or None
    settings.ALERT_WEBHOOK_URL  = data.webhook_url or None

    return {"status": "saved", "configured": bool(settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID)}


@router.post("/telegram/test")
def test_telegram(admin: str = Depends(require_admin)):
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        raise HTTPException(status_code=400, detail="Telegram not configured")
    try:
        with httpx.Client(timeout=8.0) as client:
            r = client.post(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": settings.TELEGRAM_CHAT_ID,
                    "text": (
                        "✅ <b>SentinelCore — тест соединения</b>\n\n"
                        "Telegram-алерты настроены корректно.\n"
                        "Уведомления о критических инцидентах будут приходить сюда."
                    ),
                    "parse_mode": "HTML",
                },
            )
        resp = r.json()
        if not resp.get("ok"):
            raise HTTPException(status_code=502, detail=f"Telegram error: {resp.get('description', 'unknown')}")
        return {"status": "sent", "message_id": resp["result"]["message_id"]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Connection error: {str(e)}")


@router.get("/metrics", tags=["metrics"])
def get_ml_metrics():
    metrics_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "model_metrics.json")
    )
    if not os.path.exists(metrics_path):
        raise HTTPException(status_code=404, detail="Метрики не найдены. Запусти: python3 evaluate_model.py")
    with open(metrics_path) as f:
        return json.load(f)
