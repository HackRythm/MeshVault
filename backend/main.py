"""
MeshVault — Local Backend Entry Point

Run:
    cd backend
    uvicorn main:app --reload

Server:
    http://localhost:8000
"""

import sys
import os
from contextlib import asynccontextmanager

# Ensure backend directory is in the import path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from database import engine, SessionLocal, Base
from dsa_engine import ProjectSearchIndex, ProgressBST, ReviewQueue
from routes import router

# ─── Global DSA Instances ───────────────────────────────────────────────────

search_index = ProjectSearchIndex()
progress_bst = ProgressBST()
review_queue = ReviewQueue()


def _rebuild_dsa_structures() -> None:
    """Rebuild all search, progress, and review queue DSA structures from SQLite."""
    db = SessionLocal()
    try:
        idx_count = search_index.rebuild_from_db(db)
        print(f"  Smart Search index rebuilt: {idx_count} project(s) indexed.")

        bst_count = progress_bst.rebuild_from_db(db)
        print(f"  Progress BST rebuilt: {bst_count} project(s) inserted.")

        queue_count = review_queue.rebuild_from_db(db)
        print(f"  Review Queue rebuilt: {queue_count} pending request(s) queued.")
    finally:
        db.close()


# ─── Application Lifespan ───────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    Base.metadata.create_all(bind=engine)
    
    # Run idempotent SQLite migration for is_restricted
    db = SessionLocal()
    try:
        res = db.execute(text("PRAGMA table_info(workspaces)")).fetchall()
        columns = [r[1] for r in res]
        if "is_restricted" not in columns:
            db.execute(text("ALTER TABLE workspaces ADD COLUMN is_restricted BOOLEAN DEFAULT 0"))
            db.commit()
            print("  Migration: Added column 'is_restricted' to 'workspaces' table.")
    except Exception as e:
        print(f"  Migration error: {e}")
        db.rollback()
    finally:
        db.close()

    print()
    print("=" * 50)
    print("  MeshVault Backend Starting")
    print("=" * 50)

    _rebuild_dsa_structures()

    print()
    print("  Ready at http://localhost:8000")
    print("=" * 50)
    print()

    yield

    print("MeshVault Backend shutting down.")


# ─── FastAPI Application ─────────────────────────────────────────────────────

app = FastAPI(
    title="MeshVault",
    description="MeshVault Local Backend — Academic Project Management with DSA",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store DSA structures in app state so routes.py can access them
app.state.search_index = search_index
app.state.progress_bst = progress_bst
app.state.review_queue = review_queue

# Include all API routes
app.include_router(router)


# ─── Health Check ────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "application": "MeshVault",
        "version": "0.1.0",
    }
