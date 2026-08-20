"""
MeshVault Database Configuration
SQLAlchemy engine and session setup for local SQLite database.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Local SQLite database — created automatically if it does not exist
DATABASE_URL = "sqlite:///./meshvault.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Required for SQLite with FastAPI
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
