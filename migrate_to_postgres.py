"""
Migrate data from SQLite (soc.db) to PostgreSQL.
Usage:
  1. Start PostgreSQL:  docker-compose up -d db
  2. Run:               python3 migrate_to_postgres.py
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

SQLITE_URL   = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'soc.db')}"
POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5433/soc_db")


def migrate():
    print("🔄 Connecting to SQLite...")
    sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})

    print("🔄 Connecting to PostgreSQL...")
    try:
        pg_engine = create_engine(POSTGRES_URL, pool_pre_ping=True)
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        print(f"❌ Cannot connect to PostgreSQL: {e}")
        print("   Make sure Docker is running: docker-compose up -d db")
        sys.exit(1)

    # Import models and create tables in PostgreSQL
    os.environ["DATABASE_URL"] = POSTGRES_URL
    from app.database import Base
    from app import models  # noqa: F401 — needed to register models

    Base.metadata.create_all(bind=pg_engine)
    print("✅ PostgreSQL tables created")

    SQLiteSession = sessionmaker(bind=sqlite_engine)
    PGSession     = sessionmaker(bind=pg_engine)

    sqlite_db = SQLiteSession()
    pg_db     = PGSession()

    # Migrate Users
    users = sqlite_db.query(models.User).all()
    print(f"📦 Migrating {len(users)} users...")
    for u in users:
        exists = pg_db.query(models.User).filter_by(email=u.email).first()
        if not exists:
            pg_db.add(models.User(
                id=u.id, email=u.email, username=u.username,
                hashed_password=u.hashed_password, role=u.role,
                is_active=u.is_active, reset_token=u.reset_token,
                reset_expires=u.reset_expires, created_at=u.created_at,
            ))
    pg_db.commit()

    # Migrate Events
    events = sqlite_db.query(models.Event).all()
    print(f"📦 Migrating {len(events)} events...")
    for e in events:
        exists = pg_db.query(models.Event).filter_by(id=e.id).first()
        if not exists:
            pg_db.add(models.Event(
                id=e.id, process_name=e.process_name, command_line=e.command_line,
                user=e.user, severity=e.severity, anomaly_score=e.anomaly_score,
                mitre_technique=e.mitre_technique, created_at=e.created_at,
                is_acknowledged=e.is_acknowledged, acknowledged_at=e.acknowledged_at,
            ))
    pg_db.commit()

    sqlite_db.close()
    pg_db.close()

    print(f"✅ Migration complete: {len(users)} users, {len(events)} events")
    print("   Now set DATABASE_URL in .env and restart the backend.")


if __name__ == "__main__":
    migrate()
