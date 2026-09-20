"""
MeshVault Configuration & Environment Variables Management
Loads configuration from .env file and environment variables.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from backend directory or project root
backend_dir = Path(__file__).resolve().parent
root_dir = backend_dir.parent

load_dotenv(backend_dir / ".env")
load_dotenv(root_dir / ".env")

# ─── Environment Variables ────────────────────────────────────────────────────

DATABASE_URL: str = os.getenv("DATABASE_URL", "")
SECRET_KEY: str = os.getenv("SECRET_KEY", "")
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
ALLOWED_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]

# ─── Validate Required Config ────────────────────────────────────────────────

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is required but not set. "
        "Provide a PostgreSQL connection string (e.g. postgresql://user:pass@host/dbname)."
    )

if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY environment variable is required but not set. "
        "Generate one with: python -c 'import secrets; print(secrets.token_hex(32))'"
    )

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

