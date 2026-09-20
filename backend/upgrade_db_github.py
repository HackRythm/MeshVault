"""
MeshVault GitHub Integration Database Migration Script
Creates the `project_github` table if it does not already exist.
Runs on both SQLite (local dev) and PostgreSQL (Neon production).
"""

import os
import sys

# ─── Detect DB URL ─────────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
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

def migrate():
    if IS_POSTGRES:
        import psycopg2
        print("[upgrade_db_github] Connecting to PostgreSQL...")
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = False
        cur = conn.cursor()
        def table_exists(table):
            cur.execute("SELECT tablename FROM pg_tables WHERE tablename=%s", (table,))
            return cur.fetchone() is not None
    else:
        import sqlite3
        db_path = DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")
        if not db_path:
            db_path = os.path.join(os.path.dirname(__file__), "meshvault.db")
        print(f"[upgrade_db_github] Connecting to SQLite: {db_path}")
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        def table_exists(table):
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
            return cur.fetchone() is not None

    if not table_exists("project_github"):
        print("[upgrade_db_github] Creating project_github table...")
        if IS_POSTGRES:
            cur.execute("""
                CREATE TABLE project_github (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
                    github_owner VARCHAR(100) NOT NULL,
                    github_repo VARCHAR(100) NOT NULL,
                    github_url VARCHAR(255) NOT NULL,
                    linked_at TIMESTAMP DEFAULT NOW()
                )
            """)
            cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_project_github_project_id ON project_github(project_id)")
        else:
            cur.execute("""
                CREATE TABLE project_github (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
                    github_owner VARCHAR(100) NOT NULL,
                    github_repo VARCHAR(100) NOT NULL,
                    github_url VARCHAR(255) NOT NULL,
                    linked_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_project_github_project_id ON project_github(project_id)")
        print("[upgrade_db_github] OK: project_github table created successfully.")
    else:
        print("[upgrade_db_github] project_github table already exists — skip.")

    conn.commit()
    cur.close()
    conn.close()
    print("[upgrade_db_github] OK: Migration complete!")

if __name__ == "__main__":
    migrate()
