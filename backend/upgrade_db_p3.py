"""
MeshVault Phase 3 Database Upgrade Script
- Adds workspace_id column to review_comments (nullable for backward compat)
- Adds parent_comment_id column to review_comments (threaded replies)
- Creates project_evaluations table (append-only grading history)
Runs on both SQLite (local dev) and PostgreSQL (Neon production).
"""

import os
import sys

# ─── Detect DB URL ─────────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    # Try reading from .env
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("DATABASE_URL="):
                    DATABASE_URL = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break

# ─── Choose dialect ────────────────────────────────────────────────────────────
IS_POSTGRES = DATABASE_URL.startswith("postgresql") or DATABASE_URL.startswith("postgres")

if IS_POSTGRES:
    import psycopg2
    print(f"[upgrade_db_p3] Connecting to PostgreSQL...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()
    placeholder = "%s"
    def column_exists(table, col):
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name=%s AND column_name=%s
        """, (table, col))
        return cur.fetchone() is not None
    def table_exists(table):
        cur.execute("""
            SELECT tablename FROM pg_tables WHERE tablename=%s
        """, (table,))
        return cur.fetchone() is not None
else:
    import sqlite3
    db_path = DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")
    if not db_path:
        db_path = os.path.join(os.path.dirname(__file__), "meshvault.db")
    print(f"[upgrade_db_p3] Connecting to SQLite: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    placeholder = "?"
    def column_exists(table, col):
        cur.execute(f"PRAGMA table_info({table})")
        return any(row[1] == col for row in cur.fetchall())
    def table_exists(table):
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
        return cur.fetchone() is not None


# ─── 1. Add workspace_id to review_comments ───────────────────────────────────
if not column_exists("review_comments", "workspace_id"):
    print("[upgrade_db_p3] Adding workspace_id to review_comments...")
    cur.execute("""
        ALTER TABLE review_comments
        ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE
    """)
    print("[upgrade_db_p3] ✓ workspace_id added")
else:
    print("[upgrade_db_p3] workspace_id already exists on review_comments — skip")

# ─── 2. Add parent_comment_id to review_comments ──────────────────────────────
if not column_exists("review_comments", "parent_comment_id"):
    print("[upgrade_db_p3] Adding parent_comment_id to review_comments...")
    cur.execute("""
        ALTER TABLE review_comments
        ADD COLUMN parent_comment_id INTEGER REFERENCES review_comments(id) ON DELETE CASCADE
    """)
    print("[upgrade_db_p3] ✓ parent_comment_id added")
else:
    print("[upgrade_db_p3] parent_comment_id already exists on review_comments — skip")

# ─── 3. Create project_evaluations table ──────────────────────────────────────
if not table_exists("project_evaluations"):
    print("[upgrade_db_p3] Creating project_evaluations table...")
    cur.execute("""
        CREATE TABLE project_evaluations (
            id SERIAL PRIMARY KEY,
            workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            evaluator_id INTEGER NOT NULL REFERENCES users(id),
            grading_scheme_id INTEGER REFERENCES grading_schemes(id),
            score FLOAT NOT NULL,
            max_score FLOAT NOT NULL DEFAULT 100.0,
            notes TEXT,
            criterion_scores TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """ if IS_POSTGRES else """
        CREATE TABLE project_evaluations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            evaluator_id INTEGER NOT NULL REFERENCES users(id),
            grading_scheme_id INTEGER REFERENCES grading_schemes(id),
            score REAL NOT NULL,
            max_score REAL NOT NULL DEFAULT 100.0,
            notes TEXT,
            criterion_scores TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    if IS_POSTGRES:
        cur.execute("CREATE INDEX IF NOT EXISTS ix_pe_workspace ON project_evaluations(workspace_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS ix_pe_project ON project_evaluations(project_id)")
    print("[upgrade_db_p3] ✓ project_evaluations table created")
else:
    print("[upgrade_db_p3] project_evaluations already exists — skip")

# ─── Commit ────────────────────────────────────────────────────────────────────
conn.commit()
cur.close()
conn.close()
print("[upgrade_db_p3] ✅ Phase 3 upgrade complete!")
