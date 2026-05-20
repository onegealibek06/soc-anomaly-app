from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.ai_engine import ai_analyst
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app import models, schemas
from app.anomaly_detector import AnomalyDetector
from mitre_mapper import MitreMapper
import subprocess
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = "soc_diploma_secret_2026"
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key. Access Denied.")
    return api_key


# Создаём таблицы в БД
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SOC Anomaly Detection", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Инициализируем компоненты
detector = AnomalyDetector()
mitre_mapper = MitreMapper()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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
        train_model_on_existing_data(db)
    finally:
        db.close()


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/train")
def trigger_training(api_key: str = Depends(verify_api_key), db: Session = Depends(get_db)):
    train_model_on_existing_data(db)
    return {"status": "success", "message": "Модель IsolationForest успешно переобучена"}


@app.post("/ingest", response_model=schemas.EventOut)
def ingest_event(
    event: schemas.EventCreate,
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    # 1. MITRE ATT&CK маппинг (выполняем первым, нужен для ML-буста)
    techniques = mitre_mapper.get_attack_info(event.command_line)
    mitre_text = mitre_mapper.format_techniques(techniques)
    mitre_boost = mitre_mapper.get_severity_boost(techniques)

    # 2. ML Scoring с учётом MITRE-буста
    score = detector.score(event.dict(), mitre_boost=mitre_boost)

    # 3. Severity — многоуровневая логика
    #    ВАЖНО: наличие MITRE-техники само по себе НЕ делает событие high/critical.
    #    Техника только усиливает ML-скор через mitre_boost в detector.score().
    severity = _calculate_severity(score, techniques)

    db_event = models.Event(
        **event.dict(),
        anomaly_score=score,
        severity=severity,
        mitre_technique=mitre_text,
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


def _calculate_severity(score: float, techniques: list) -> str:
    """
    Severity определяется по итоговому ML+rule-based score.
    MITRE уже учтён в score через mitre_boost — двойной учёт исключён.

    Пороги (откалиброваны по реальным данным):
      critical  ≥ 0.60   — явные атаки: шелл, мимикац, шифрование данных
      high      ≥ 0.45   — высокий риск: persistence, shadow dump, exfil
      medium    ≥ 0.30   — умеренный риск: разведка, LOLBin, подозрительные пути
      low       ≥ 0.12   — низкий риск: curl, wget, одиночные команды разведки
      normal    < 0.12   — легитимная активность
    """
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
    limit: int = 100,
    severity: str | None = None,
    search: str | None = None,
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
    return query.order_by(models.Event.id.desc()).limit(limit).all()


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
    """Статистика для дашборда."""
    from sqlalchemy import func
    events = db.query(models.Event).all()
    total = len(events)
    if total == 0:
        return {"total": 0, "by_severity": {}, "avg_score": 0, "top_processes": []}

    by_severity = {}
    for e in events:
        by_severity[e.severity] = by_severity.get(e.severity, 0) + 1

    avg_score = sum(e.anomaly_score for e in events) / total

    process_counts: dict = {}
    for e in events:
        process_counts[e.process_name] = process_counts.get(e.process_name, 0) + 1
    top_processes = sorted(process_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "total": total,
        "by_severity": by_severity,
        "avg_score": round(avg_score, 4),
        "top_processes": [{"name": p, "count": c} for p, c in top_processes],
    }


@app.post("/simulate")
async def run_simulation(api_key: str = Depends(verify_api_key)):
    """
    Запускает демо-симуляцию: набор реалистичных атак Windows/Linux/macOS.
    Для отправки реальных процессов своего устройства — используй agent.py.
    """
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
    """
    Скачать agent.py — без авторизации, чтобы гости могли легко получить файл.
    Пример: curl http://192.168.0.12:8000/download/agent -o agent.py
    """
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


@app.get("/")
def root():
    return {
        "name": "SOC Anomaly Detection API",
        "version": "2.0.0",
        "dashboard": "Open http://<this-ip>:3000 in your browser",
        "agent_download": "GET /download/agent",
        "docs": "/docs",
    }