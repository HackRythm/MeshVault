import os
import sys
from sqlalchemy import text

# Ensure backend directory is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine

def upgrade():
    connection = engine.connect()
    # Check if we are using PostgreSQL or SQLite
    is_postgres = "postgresql" in str(engine.url)
    
    print(f"Upgrading database (is_postgres={is_postgres})...")
    
    try:
        if is_postgres:
            # PostgreSQL migrations
            queries = [
                "ALTER TABLE groups ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;",
                "ALTER TABLE groups ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);",
                "ALTER TABLE group_memberships ADD COLUMN IF NOT EXISTS is_leader BOOLEAN DEFAULT FALSE;",
                "ALTER TABLE projects ALTER COLUMN workspace_id DROP NOT NULL;",
                "ALTER TABLE groups ALTER COLUMN workspace_id DROP NOT NULL;"
            ]
            for query in queries:
                try:
                    connection.execute(text(query))
                    print(f"Executed: {query}")
                except Exception as ex:
                    print(f"Error executing '{query}': {ex}")
            connection.commit()
        else:
            # SQLite migrations
            # SQLite does not support ADD COLUMN IF NOT EXISTS, so we try-except
            sqlite_queries = [
                ("ALTER TABLE groups ADD COLUMN code VARCHAR(50);", "groups.code"),
                ("ALTER TABLE groups ADD COLUMN created_by INTEGER REFERENCES users(id);", "groups.created_by"),
                ("ALTER TABLE group_memberships ADD COLUMN is_leader BOOLEAN DEFAULT 0;", "group_memberships.is_leader")
            ]
            for query, col in sqlite_queries:
                try:
                    connection.execute(text(query))
                    print(f"Executed: {query}")
                except Exception as ex:
                    print(f"Column/Query '{col}' may already exist: {ex}")
            connection.commit()
        print("Database upgrade completed successfully.")
    except Exception as e:
        print(f"Database upgrade failed: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    upgrade()
