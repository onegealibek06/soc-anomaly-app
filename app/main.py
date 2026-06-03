from fastapi import FastAPI, Depends, HTTPException, Security, BackgroundTasks, Header
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.ai_engine import ai_analyst
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app import models, schemas
from app.anomaly_detector import AnomalyDetector
from mitre_mapper import MitreMapper
from pydantic import BaseModel, field_validator
from datetime import datetime, timezone, timedelta
import subprocess
import httpx
import json
import os
import secrets
import jwt as pyjwt
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

API_KEY      = os.getenv("API_KEY", "soc_diploma_secret_2026")
JWT_SECRET   = os.getenv("JWT_SECRET", "sentinel_soc_jwt_2026_secure")
JWT_ALGO     = "HS256"
# Email that always gets the "admin" role on registration (configurable via .env)
ADMIN_EMAIL  = os.getenv("ADMIN_EMAIL", "admin@sentinel.ai")

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _require_admin(authorization: str | None = Header(default=None)) -> str:
    """Dependency: only accepts a valid JWT with role='admin'."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = _decode_jwt(authorization.split(" ", 1)[1])
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalid or expired")
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload["sub"]


# ── Pydantic request models ────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
ALERT_WEBHOOK_URL = os.getenv("ALERT_WEBHOOK_URL")


def _decode_jwt(token: str) -> dict:
    return pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])

async def verify_api_key(
    api_key: str = Security(api_key_header),
    authorization: str | None = Header(default=None),
):
    # Accept X-API-Key header
    if api_key == API_KEY:
        return api_key
    # Accept Bearer JWT
    if authorization and authorization.startswith("Bearer "):
        try:
            _decode_jwt(authorization.split(" ", 1)[1])
            return "jwt"
        except Exception:
            pass
    raise HTTPException(status_code=403, detail="Invalid API Key. Access Denied.")


models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SOC Anomaly Detection", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = AnomalyDetector()
mitre_mapper = MitreMapper()


# ─── DB session ───────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── Auth ─────────────────────────────────────────────────────────────────────

def _make_token(username: str, role: str) -> str:
    return pyjwt.encode(
        {"sub": username, "role": role,
         "exp": datetime.now(timezone.utc) + timedelta(hours=24)},
        JWT_SECRET, algorithm=JWT_ALGO,
    )


@app.post("/auth/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    if db.query(models.User).filter(models.User.username == data.username).first():
        raise HTTPException(status_code=409, detail="Username already taken")
    # First ever user OR email matches ADMIN_EMAIL → admin role
    is_first = db.query(models.User).count() == 0
    role = "admin" if (is_first or data.email == ADMIN_EMAIL) else "analyst"
    user = models.User(
        email=data.email,
        username=data.username,
        hashed_password=pwd_ctx.hash(data.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = _make_token(user.username, user.role)
    return {"access_token": token, "token_type": "bearer",
            "username": user.username, "role": user.role}


@app.post("/auth/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not pwd_ctx.verify(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    token = _make_token(user.username, user.role)
    return {"access_token": token, "token_type": "bearer",
            "username": user.username, "role": user.role}


@app.post("/auth/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    # Always return 200 — don't leak whether email exists
    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token   = token
        user.reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        # In production: send email with link. For demo we return token directly.
        return {"message": "Reset link sent", "demo_token": token}
    return {"message": "If that email is registered, a reset link has been sent"}


@app.post("/auth/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.reset_token == data.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    # SQLite stores datetimes as naive — compare without tzinfo
    now_naive = datetime.utcnow()
    expires = user.reset_expires
    if expires:
        if expires.tzinfo is not None:
            expires = expires.replace(tzinfo=None)
        if expires < now_naive:
            raise HTTPException(status_code=400, detail="Reset token has expired")
    user.hashed_password = pwd_ctx.hash(data.new_password)
    user.reset_token     = None
    user.reset_expires   = None
    db.commit()
    return {"message": "Password updated successfully"}


@app.get("/auth/me")
def get_me(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = _decode_jwt(authorization.split(" ", 1)[1])
        return {"username": payload["sub"], "role": payload.get("role", "analyst")}
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalid or expired")


def train_model_on_existing_data(db: Session):
    all_events = db.query(models.Event).all()
    if len(all_events) >= 5:
        events_list = [
            {"process_name": e.process_name, "command_line": e.command_line, "user": e.user}
            for e in all_events
        ]
        detector.train(events_list)


@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        # ── Ensure admin role is assigned ──────────────────────────────────
        # 1. User whose email matches ADMIN_EMAIL → admin
        # 2. Fallback: the earliest registered user (lowest ID) → admin
        # This runs every startup so adding ADMIN_EMAIL to .env is enough to promote.
        admin_by_email = db.query(models.User).filter(models.User.email == ADMIN_EMAIL).first()
        if admin_by_email:
            if admin_by_email.role != "admin":
                admin_by_email.role = "admin"
                db.commit()
        else:
            first_user = db.query(models.User).order_by(models.User.id.asc()).first()
            if first_user and first_user.role != "admin":
                first_user.role = "admin"
                db.commit()
        train_model_on_existing_data(db)
    finally:
        db.close()


# ─── Incident Alert ───────────────────────────────────────────────────────────

def send_incident_alert(event: models.Event):
    """Авто-алерт для high/critical инцидентов через Telegram и/или webhook."""
    if event.severity not in ("critical", "high"):
        return

    ts = event.created_at.strftime("%Y-%m-%d %H:%M:%S UTC") if event.created_at else "—"
    mitre = event.mitre_technique or "не обнаружено"

    severity_emoji = "🔴" if event.severity == "critical" else "🟠"

    message = (
        f"{severity_emoji} *SOC INCIDENT: {event.severity.upper()}*\n\n"
        f"*Процесс:* `{event.process_name}`\n"
        f"*Пользователь:* `{event.user}`\n"
        f"*ML Score:* `{event.anomaly_score:.4f}`\n"
        f"*MITRE ATT&CK:* {mitre}\n"
        f"*Время:* {ts}\n"
        f"*Event ID:* `#{event.id}`\n\n"
        f"_Требуется реагирование. Sentinel\\.AI_"
    )

    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        try:
            with httpx.Client(timeout=5.0) as client:
                client.post(
                    f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                    json={
                        "chat_id": TELEGRAM_CHAT_ID,
                        "text": message,
                        "parse_mode": "MarkdownV2",
                    },
                )
        except Exception:
            pass

    if ALERT_WEBHOOK_URL:
        try:
            with httpx.Client(timeout=5.0) as client:
                client.post(
                    ALERT_WEBHOOK_URL,
                    json={
                        "severity": event.severity,
                        "process_name": event.process_name,
                        "command_line": event.command_line,
                        "user": event.user,
                        "anomaly_score": event.anomaly_score,
                        "mitre_technique": event.mitre_technique,
                        "event_id": event.id,
                        "created_at": event.created_at.isoformat() if event.created_at else None,
                    },
                )
        except Exception:
            pass


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/train")
def trigger_training(api_key: str = Depends(verify_api_key), db: Session = Depends(get_db)):
    train_model_on_existing_data(db)
    return {"status": "success", "message": "Модель IsolationForest успешно переобучена"}


@app.post("/ingest", response_model=schemas.EventOut)
def ingest_event(
    event: schemas.EventCreate,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    # 1. MITRE ATT&CK маппинг
    techniques = mitre_mapper.get_attack_info(event.command_line)
    mitre_text = mitre_mapper.format_techniques(techniques)
    mitre_boost = mitre_mapper.get_severity_boost(techniques)

    # 2. ML Scoring
    score = detector.score(event.dict(), mitre_boost=mitre_boost)

    # 3. Severity
    severity = _calculate_severity(score, techniques)

    db_event = models.Event(
        **event.dict(),
        anomaly_score=score,
        severity=severity,
        mitre_technique=mitre_text,
        created_at=datetime.now(timezone.utc),
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    # 4. Авто-алерт в фоне (не блокирует ответ API)
    background_tasks.add_task(send_incident_alert, db_event)

    return db_event


def _calculate_severity(score: float, techniques: list) -> str:
    if score >= 0.60:
        return "critical"
    elif score >= 0.45:
        return "high"
    elif score >= 0.30:
        return "medium"
    elif score >= 0.12:
        return "low"
    else:
        return "normal"


@app.get("/events", response_model=list[schemas.EventOut])
def get_events(
    limit: int = 200,
    severity: str | None = None,
    search: str | None = None,
    acknowledged: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    mitre: str | None = None,
    min_score: float | None = None,
    max_score: float | None = None,
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    query = db.query(models.Event)
    if severity:
        query = query.filter(models.Event.severity == severity)
    if search:
        query = query.filter(
            models.Event.process_name.ilike(f"%{search}%")
            | models.Event.command_line.ilike(f"%{search}%")
            | models.Event.user.ilike(f"%{search}%")
        )
    if acknowledged == "false":
        query = query.filter(models.Event.is_acknowledged == False)
    elif acknowledged == "true":
        query = query.filter(models.Event.is_acknowledged == True)
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
            query = query.filter(models.Event.created_at >= dt_from)
        except ValueError:
            pass
    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
            query = query.filter(models.Event.created_at <= dt_to)
        except ValueError:
            pass
    if mitre:
        query = query.filter(models.Event.mitre_technique.ilike(f"%{mitre}%"))
    if min_score is not None:
        query = query.filter(models.Event.anomaly_score >= min_score)
    if max_score is not None:
        query = query.filter(models.Event.anomaly_score <= max_score)
    return query.order_by(models.Event.id.desc()).limit(limit).all()


@app.patch("/events/{event_id}/acknowledge")
def acknowledge_event(
    event_id: int,
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    """Подтвердить обработку инцидента (Incident Response: Acknowledge)."""
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.is_acknowledged:
        return {
            "status": "already_acknowledged",
            "event_id": event_id,
            "acknowledged_at": event.acknowledged_at,
        }
    event.is_acknowledged = True
    event.acknowledged_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(event)
    return {
        "status": "acknowledged",
        "event_id": event_id,
        "acknowledged_at": event.acknowledged_at,
    }


@app.get("/events/{event_id}/report")
def get_event_report(
    event_id: int,
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    report_text = ai_analyst.analyze_event({
        "process_name": event.process_name,
        "command_line": event.command_line,
        "user": event.user,
        "severity": event.severity,
        "anomaly_score": event.anomaly_score,
    })
    return {"id": event_id, "report": report_text}


@app.get("/stats")
def get_stats(api_key: str = Depends(verify_api_key), db: Session = Depends(get_db)):
    events = db.query(models.Event).all()
    total = len(events)
    if total == 0:
        return {
            "total": 0,
            "by_severity": {},
            "avg_score": 0,
            "top_processes": [],
            "unacknowledged_critical": 0,
        }

    by_severity = {}
    for e in events:
        by_severity[e.severity] = by_severity.get(e.severity, 0) + 1

    avg_score = sum(e.anomaly_score for e in events) / total

    process_counts: dict = {}
    for e in events:
        process_counts[e.process_name] = process_counts.get(e.process_name, 0) + 1
    top_processes = sorted(process_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    unacknowledged_critical = sum(
        1 for e in events
        if e.severity in ("critical", "high") and not e.is_acknowledged
    )

    return {
        "total": total,
        "by_severity": by_severity,
        "avg_score": round(avg_score, 4),
        "top_processes": [{"name": p, "count": c} for p, c in top_processes],
        "unacknowledged_critical": unacknowledged_critical,
    }


@app.post("/simulate")
async def run_simulation(api_key: str = Depends(verify_api_key)):
    try:
        script_path = os.path.join(os.path.dirname(__file__), "..", "generate_data.py")
        subprocess.Popen(
            ["python3", script_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return {"status": "success", "message": "Demo simulation started — Windows · Linux · macOS attacks incoming!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка запуска: {str(e)}")


@app.get("/download/agent", include_in_schema=True)
def download_agent():
    agent_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "agent.py")
    )
    if not os.path.exists(agent_path):
        raise HTTPException(status_code=404, detail="agent.py not found")
    return FileResponse(
        path=agent_path,
        filename="agent.py",
        media_type="text/x-python",
    )


@app.post("/auth/promote")
def promote_to_admin(
    payload: dict,
    admin: str = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    """Admin-only: promote another user to admin role by email."""
    email = payload.get("email", "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="email required")
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = "admin"
    db.commit()
    return {"message": f"{user.username} is now admin"}


@app.get("/settings/sensitive")
def get_sensitive_settings(admin: str = Depends(_require_admin)):
    """Admin-only: returns platform secrets (API key, JWT config, env flags)."""
    return {
        "api_key":         API_KEY,
        "jwt_secret":      JWT_SECRET,
        "jwt_algorithm":   JWT_ALGO,
        "backend_url":     "http://127.0.0.1:8000",
        "admin_email":     ADMIN_EMAIL,
        "telegram_configured": bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID),
        "webhook_configured":  bool(ALERT_WEBHOOK_URL),
    }


class TelegramConfigRequest(BaseModel):
    bot_token: str
    chat_id: str
    webhook_url: str = ""


@app.get("/settings/telegram")
def get_telegram_config(admin: str = Depends(_require_admin)):
    """Admin-only: return current Telegram config (masked token)."""
    token = TELEGRAM_BOT_TOKEN or ""
    masked = token[:8] + "…" + token[-6:] if len(token) > 14 else ("set" if token else "")
    return {
        "configured": bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID),
        "bot_token_masked": masked,
        "bot_token":  token,
        "chat_id":    TELEGRAM_CHAT_ID or "",
        "webhook_url": ALERT_WEBHOOK_URL or "",
    }


@app.post("/settings/telegram")
def save_telegram_config(
    data: TelegramConfigRequest,
    admin: str = Depends(_require_admin),
):
    """Admin-only: persist Telegram credentials to .env and reload in memory."""
    global TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, ALERT_WEBHOOK_URL

    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    env_path = os.path.abspath(env_path)

    # Read existing .env or start fresh
    lines: list[str] = []
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            lines = f.readlines()

    def _set(key: str, val: str) -> bool:
        """Update existing key or return False if not found."""
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

    # Reload in memory immediately (no restart required)
    TELEGRAM_BOT_TOKEN = data.bot_token or None
    TELEGRAM_CHAT_ID   = data.chat_id   or None
    ALERT_WEBHOOK_URL  = data.webhook_url or None

    return {"status": "saved", "configured": bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)}


@app.post("/settings/telegram/test")
def test_telegram(admin: str = Depends(_require_admin)):
    """Admin-only: send a test message to verify the current Telegram config."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        raise HTTPException(status_code=400, detail="Telegram not configured")
    try:
        with httpx.Client(timeout=8.0) as client:
            r = client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": TELEGRAM_CHAT_ID,
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


@app.get("/metrics")
def get_ml_metrics():
    """Реальные ML-метрики модели из evaluate_model.py."""
    metrics_path = os.path.join(os.path.dirname(__file__), "..", "model_metrics.json")
    if not os.path.exists(metrics_path):
        raise HTTPException(status_code=404, detail="Метрики не найдены. Запусти: python3 evaluate_model.py")
    with open(metrics_path) as f:
        return json.load(f)


@app.get("/")
def root():
    return {
        "name": "SOC Anomaly Detection API",
        "version": "2.0.0",
        "dashboard": "Open http://<this-ip>:3000 in your browser",
        "agent_download": "GET /download/agent",
        "docs": "/docs",
    }
