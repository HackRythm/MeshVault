import os
import random
import string
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Setup path to import database/models
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///meshvault.db"

print(f"Connecting to database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def generate_join_code(db_session):
    while True:
        # Generate a 6-character random uppercase alphanumeric code
        rand_str = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        code = f"WS-{rand_str}"
        # Verify it's unique
        res = db_session.execute(text("SELECT id FROM workspaces WHERE join_code = :code"), {"code": code}).first()
        if not res:
            return code

def run_migration():
    # 1. Determine dialect
    is_sqlite = engine.dialect.name == "sqlite"
    print(f"Dialect: {engine.dialect.name}")

    # 2. Add join_code column to workspaces if not exists
    try:
        if is_sqlite:
            db.execute(text("ALTER TABLE workspaces ADD COLUMN join_code VARCHAR(50)"))
            print("  Added join_code column to workspaces (SQLite)")
        else:
            db.execute(text("ALTER TABLE workspaces ADD COLUMN join_code VARCHAR(50)"))
            print("  Added join_code column to workspaces (PostgreSQL)")
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"  join_code column check/addition status: {e}")

    # 3. Create workspace_groups table if not exists
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS workspace_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                group_id INTEGER NOT NULL,
                requested_by INTEGER NOT NULL,
                status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
                rejection_reason TEXT,
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                approved_at TIMESTAMP,
                rejected_at TIMESTAMP,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
                FOREIGN KEY (requested_by) REFERENCES users(id),
                UNIQUE (workspace_id, group_id)
            )
        """ if is_sqlite else """
            CREATE TABLE IF NOT EXISTS workspace_groups (
                id SERIAL PRIMARY KEY,
                workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                requested_by INTEGER NOT NULL REFERENCES users(id),
                status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
                rejection_reason TEXT,
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                approved_at TIMESTAMP,
                rejected_at TIMESTAMP,
                UNIQUE (workspace_id, group_id)
            )
        """))
        print("  Created table workspace_groups")
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"  Error creating workspace_groups: {e}")

    # 4. Create workspace_projects table if not exists
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS workspace_projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                project_id INTEGER NOT NULL,
                status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
                rejection_reason TEXT,
                requested_by INTEGER NOT NULL,
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                approved_at TIMESTAMP,
                rejected_at TIMESTAMP,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (requested_by) REFERENCES users(id),
                UNIQUE (workspace_id, project_id)
            )
        """ if is_sqlite else """
            CREATE TABLE IF NOT EXISTS workspace_projects (
                id SERIAL PRIMARY KEY,
                workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                requested_by INTEGER NOT NULL REFERENCES users(id),
                status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
                rejection_reason TEXT,
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                approved_at TIMESTAMP,
                rejected_at TIMESTAMP,
                UNIQUE (workspace_id, project_id)
            )
        """))
        print("  Created table workspace_projects")
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"  Error creating workspace_projects: {e}")

    # 5. Populate join_codes for existing workspaces
    try:
        workspaces = db.execute(text("SELECT id, join_code FROM workspaces")).all()
        for ws in workspaces:
            if not ws.join_code:
                code = generate_join_code(db)
                db.execute(text("UPDATE workspaces SET join_code = :code WHERE id = :id"), {"code": code, "id": ws.id})
                print(f"  Generated join_code {code} for workspace ID {ws.id}")
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"  Error populating join_codes: {e}")

    # 6. Migrate Phase 1 direct workspace relationships
    try:
        # Migrate groups
        res_groups = db.execute(text("SELECT id, workspace_id, created_by FROM groups WHERE workspace_id IS NOT NULL")).all()
        for g in res_groups:
            exists = db.execute(text("SELECT id FROM workspace_groups WHERE workspace_id = :ws_id AND group_id = :g_id"), {"ws_id": g.workspace_id, "g_id": g.id}).first()
            if not exists:
                req_by = g.created_by if g.created_by else 1
                db.execute(text("""
                    INSERT INTO workspace_groups (workspace_id, group_id, requested_by, status, approved_at)
                    VALUES (:ws_id, :g_id, :req_by, 'APPROVED', CURRENT_TIMESTAMP)
                """), {"ws_id": g.workspace_id, "g_id": g.id, "req_by": req_by})
                print(f"  Migrated Group {g.id} to Workspace {g.workspace_id} as APPROVED")
        
        # Migrate projects
        res_projects = db.execute(text("SELECT id, workspace_id, group_id FROM projects WHERE workspace_id IS NOT NULL")).all()
        for p in res_projects:
            exists = db.execute(text("SELECT id FROM workspace_projects WHERE workspace_id = :ws_id AND project_id = :p_id"), {"ws_id": p.workspace_id, "p_id": p.id}).first()
            if not exists:
                member = db.execute(text("SELECT user_id FROM group_memberships WHERE group_id = :g_id"), {"g_id": p.group_id}).first()
                req_by = member.user_id if member else 2
                db.execute(text("""
                    INSERT INTO workspace_projects (workspace_id, project_id, requested_by, status, approved_at)
                    VALUES (:ws_id, :p_id, :req_by, 'APPROVED', CURRENT_TIMESTAMP)
                """), {"ws_id": p.workspace_id, "p_id": p.id, "req_by": req_by})
                print(f"  Migrated Project {p.id} to Workspace {p.workspace_id} as APPROVED")
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"  Error migrating Phase 1 relationships: {e}")

    print("\nMigration complete!")

if __name__ == "__main__":
    run_migration()
