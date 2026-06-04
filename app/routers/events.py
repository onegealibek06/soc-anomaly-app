from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.core.config import settings
from app.core.security import verify_api_key
from app.core.deps import get_db
from app import models, schemas
from app.anomaly_detector import AnomalyDetector
from app.ai_engine import ai_analyst
from mitre_mapper import MitreMapper
import httpx
import subprocess
import os

router = APIRouter(tags=["events"])

detector     = AnomalyDetector()
mitre_mapper = MitreMapper()


# ── Shared helpers ─────────────────────────────────────────────────────────────

def train_model_on_existing_data(db: Session):
    all_events = db.query(models.Event).all()
    if len(all_events) >= 5:
        events_list = [
            {"process_name": e.process_name, "command_line": e.command_line, "user": e.user}
            for e in all_events
        ]
        detector.train(events_list)


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


def send_incident_alert(event: models.Event):
    if event.severity not in ("critical", "high"):
        return

    ts    = event.created_at.strftime("%Y-%m-%d %H:%M:%S UTC") if event.created_at else "—"
    mitre = event.mitre_technique or "не обнаружено"
    emoji = "🔴" if event.severity == "critical" else "🟠"

    message = (
        f"{emoji} *SOC INCIDENT: {event.severity.upper()}*\n\n"
        f"*Процесс:* `{event.process_name}`\n"
        f"*Пользователь:* `{event.user}`\n"
        f"*ML Score:* `{event.anomaly_score:.4f}`\n"
        f"*MITRE ATT&CK:* {mitre}\n"
        f"*Время:* {ts}\n"
        f"*Event ID:* `#{event.id}`\n\n"
        f"_Требуется реагирование. Sentinel\\.AI_"
    )

    if settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID:
        try:
            with httpx.Client(timeout=5.0) as client:
                client.post(
                    f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                    json={"chat_id": settings.TELEGRAM_CHAT_ID, "text": message, "parse_mode": "MarkdownV2"},
                )
        except Exception:
            pass

    if settings.ALERT_WEBHOOK_URL:
        try:
            with httpx.Client(timeout=5.0) as client:
                client.post(
                    settings.ALERT_WEBHOOK_URL,
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


def _build_events_query(
    db, severity, search, acknowledged,
    date_from, date_to, mitre, min_score, max_score,
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
            dt = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
            query = query.filter(models.Event.created_at >= dt)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
            query = query.filter(models.Event.created_at <= dt)
        except ValueError:
            pass
    if mitre:
        query = query.filter(models.Event.mitre_technique.ilike(f"%{mitre}%"))
    if min_score is not None:
        query = query.filter(models.Event.anomaly_score >= min_score)
    if max_score is not None:
        query = query.filter(models.Event.anomaly_score <= max_score)
    return query


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/train")
def trigger_training(api_key: str = Depends(verify_api_key), db: Session = Depends(get_db)):
    train_model_on_existing_data(db)
    return {"status": "success", "message": "Модель IsolationForest успешно переобучена"}


@router.post("/ingest", response_model=schemas.EventOut)
def ingest_event(
    event: schemas.EventCreate,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    techniques  = mitre_mapper.get_attack_info(event.command_line)
    mitre_text  = mitre_mapper.format_techniques(techniques)
    mitre_boost = mitre_mapper.get_severity_boost(techniques)
    score       = detector.score(event.dict(), mitre_boost=mitre_boost)
    severity    = _calculate_severity(score, techniques)

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
    background_tasks.add_task(send_incident_alert, db_event)
    return db_event


@router.get("/events/count")
def count_events(
    severity: str | None = None, search: str | None = None,
    acknowledged: str | None = None, date_from: str | None = None,
    date_to: str | None = None, mitre: str | None = None,
    min_score: float | None = None, max_score: float | None = None,
    api_key: str = Depends(verify_api_key), db: Session = Depends(get_db),
):
    q = _build_events_query(db, severity, search, acknowledged, date_from, date_to, mitre, min_score, max_score)
    return {"total": q.count()}


@router.get("/events", response_model=list[schemas.EventOut])
def get_events(
    limit: int = 50, offset: int = 0,
    severity: str | None = None, search: str | None = None,
    acknowledged: str | None = None, date_from: str | None = None,
    date_to: str | None = None, mitre: str | None = None,
    min_score: float | None = None, max_score: float | None = None,
    api_key: str = Depends(verify_api_key), db: Session = Depends(get_db),
):
    q = _build_events_query(db, severity, search, acknowledged, date_from, date_to, mitre, min_score, max_score)
    return q.order_by(models.Event.id.desc()).offset(offset).limit(limit).all()


@router.patch("/events/{event_id}/acknowledge")
def acknowledge_event(
    event_id: int,
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.is_acknowledged:
        return {"status": "already_acknowledged", "event_id": event_id, "acknowledged_at": event.acknowledged_at}
    event.is_acknowledged = True
    event.acknowledged_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(event)
    return {"status": "acknowledged", "event_id": event_id, "acknowledged_at": event.acknowledged_at}


@router.get("/events/{event_id}/report")
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


@router.get("/stats")
def get_stats(api_key: str = Depends(verify_api_key), db: Session = Depends(get_db)):
    events = db.query(models.Event).all()
    total  = len(events)
    if total == 0:
        return {"total": 0, "by_severity": {}, "avg_score": 0, "top_processes": [], "unacknowledged_critical": 0}

    by_severity: dict = {}
    for e in events:
        by_severity[e.severity] = by_severity.get(e.severity, 0) + 1

    avg_score = sum(e.anomaly_score for e in events) / total

    process_counts: dict = {}
    for e in events:
        process_counts[e.process_name] = process_counts.get(e.process_name, 0) + 1
    top_processes = sorted(process_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    unacknowledged_critical = sum(
        1 for e in events if e.severity in ("critical", "high") and not e.is_acknowledged
    )
    return {
        "total": total,
        "by_severity": by_severity,
        "avg_score": round(avg_score, 4),
        "top_processes": [{"name": p, "count": c} for p, c in top_processes],
        "unacknowledged_critical": unacknowledged_critical,
    }


@router.post("/simulate")
async def run_simulation(api_key: str = Depends(verify_api_key)):
    try:
        script_path = os.path.join(os.path.dirname(__file__), "..", "..", "generate_data.py")
        subprocess.Popen(["python3", script_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return {"status": "success", "message": "Demo simulation started — Windows · Linux · macOS attacks incoming!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка запуска: {str(e)}")
