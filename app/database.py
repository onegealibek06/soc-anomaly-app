from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # PostgreSQL (production)
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
else:
    # SQLite fallback (local dev without Docker)
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    _sqlite_url = f"sqlite:///{os.path.join(BASE_DIR, 'soc.db')}"
    engine = create_engine(_sqlite_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
