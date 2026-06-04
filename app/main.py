from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.database import SessionLocal, engine
from app import models
from app.core.config import settings
from app.routers import auth, events, settings as settings_router
from app.routers.events import train_model_on_existing_data
import os

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SOC Anomaly Detection", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(settings_router.router)


@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        admin_by_email = db.query(models.User).filter(models.User.email == settings.ADMIN_EMAIL).first()
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


@app.get("/download/agent", include_in_schema=True)
def download_agent():
    agent_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "agent.py")
    )
    if not os.path.exists(agent_path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="agent.py not found")
    return FileResponse(path=agent_path, filename="agent.py", media_type="text/x-python")


@app.get("/metrics")
def get_ml_metrics():
    import json
    from fastapi import HTTPException
    metrics_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "model_metrics.json")
    )
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
