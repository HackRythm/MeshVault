"""
MeshVault Database Configuration
SQLAlchemy engine and session setup for local SQLite database.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Read DATABASE_URL from environment (Neon/cloud DB), fallback to local SQLite
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    if "VERCEL" in os.environ:
        DATABASE_URL = "sqlite:////tmp/meshvault.db"
    else:
        db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "meshvault.db")).replace("\\", "/")
        DATABASE_URL = f"sqlite:///{db_path}"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite needs connect_args={"check_same_thread": False}, PostgreSQL doesn't
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
