"""
MeshVault — Migration: Workspace ID, Group Identity & Access Control
Adds:
  - workspaces.workspace_id  (WS-001 format, unique, persistent)
  - groups.group_number       (human-readable G1, G11 etc.)
  - workspace_access.status / requested_at / processed_at / rejection_reason
  - UNIQUE(workspace_id, group_number) on groups
Backfills existing data.
"""

import sys
import os
import sqlite3

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "meshvault.db")


def get_columns(cursor, table):
    cursor.execute(f"PRAGMA table_info({table})")
    return [row[1] for row in cursor.fetchall()]


def migrate():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    print("=" * 60)
    print("MeshVault — Access Control Migration")
    print("=" * 60)

    # ── 1. Workspaces: add workspace_id column ──────────────────────────────
    ws_cols = get_columns(c, "workspaces")
    if "workspace_id" not in ws_cols:
        print("\n[1] Adding 'workspace_id' column to 'workspaces' table...")
        c.execute("ALTER TABLE workspaces ADD COLUMN workspace_id VARCHAR(50)")
        # Backfill existing workspaces
        c.execute("SELECT id FROM workspaces ORDER BY id")
        rows = c.fetchall()
        for idx, (ws_id,) in enumerate(rows, start=1):
            ws_code = f"WS-{idx:03d}"
            c.execute("UPDATE workspaces SET workspace_id = ? WHERE id = ?", (ws_code, ws_id))
            print(f"    Backfilled workspace id={ws_id} -> {ws_code}")
        conn.commit()
        print("    Done.")
    else:
        # Backfill any NULL workspace_id values
        c.execute("SELECT id FROM workspaces WHERE workspace_id IS NULL ORDER BY id")
        nulls = c.fetchall()
        if nulls:
            # Find current max
            c.execute("SELECT workspace_id FROM workspaces WHERE workspace_id IS NOT NULL")
            max_num = 0
            for (wid,) in c.fetchall():
                if wid and wid.startswith("WS-"):
                    try:
                        num = int(wid[3:])
                        if num > max_num:
                            max_num = num
                    except ValueError:
                        pass
            for ws_id_row in nulls:
                max_num += 1
                ws_code = f"WS-{max_num:03d}"
                c.execute("UPDATE workspaces SET workspace_id = ? WHERE id = ?", (ws_code, ws_id_row[0]))
                print(f"    Backfilled workspace id={ws_id_row[0]} -> {ws_code}")
            conn.commit()
        print("[1] 'workspace_id' column already exists on 'workspaces'.")

    # Create unique index on workspace_id if not exists
    c.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='ix_workspaces_workspace_id'")
    if not c.fetchone():
        c.execute("CREATE UNIQUE INDEX ix_workspaces_workspace_id ON workspaces(workspace_id)")
        conn.commit()
        print("    Created unique index on workspaces.workspace_id")

    # ── 2. Groups: add group_number column ──────────────────────────────────
    gr_cols = get_columns(c, "groups")
    if "group_number" not in gr_cols:
        print("\n[2] Adding 'group_number' column to 'groups' table...")
        c.execute("ALTER TABLE groups ADD COLUMN group_number VARCHAR(50)")
        # Backfill existing groups that have a workspace_id
        c.execute("SELECT id, workspace_id, name FROM groups ORDER BY id")
        rows = c.fetchall()
        # Track per-workspace counters for backfill
        ws_counters = {}
        for gid, ws_id, name in rows:
            if ws_id is not None:
                counter = ws_counters.get(ws_id, 0) + 1
                ws_counters[ws_id] = counter
                g_num = f"G{counter}"
            else:
                # Groups without workspace get a generic number
                g_num = f"G-legacy-{gid}"
            c.execute("UPDATE groups SET group_number = ? WHERE id = ?", (g_num, gid))
            print(f"    Backfilled group id={gid} (ws={ws_id}) -> {g_num}")
        conn.commit()
        print("    Done.")
    else:
        print("[2] 'group_number' column already exists on 'groups'.")

    # Ensure workspace_id column exists on groups (it does from inspection)
    if "workspace_id" not in gr_cols:
        print("\n[2b] Adding 'workspace_id' column to 'groups' table...")
        c.execute("ALTER TABLE groups ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id)")
        conn.commit()
        print("    Done.")
    else:
        print("[2b] 'workspace_id' column already exists on 'groups'.")

    # ── 3. Workspace Access: add status + request fields ─────────────────────
    wa_cols = get_columns(c, "workspace_access")
    changes_made = False
    if "status" not in wa_cols:
        print("\n[3] Adding 'status' column to 'workspace_access' table...")
        c.execute("ALTER TABLE workspace_access ADD COLUMN status VARCHAR(30) DEFAULT 'APPROVED'")
        # Backfill existing records
        c.execute("UPDATE workspace_access SET status = 'APPROVED' WHERE status IS NULL")
        changes_made = True

    if "requested_at" not in wa_cols:
        c.execute("ALTER TABLE workspace_access ADD COLUMN requested_at DATETIME")
        changes_made = True

    if "processed_at" not in wa_cols:
        c.execute("ALTER TABLE workspace_access ADD COLUMN processed_at DATETIME")
        changes_made = True

    if "rejection_reason" not in wa_cols:
        c.execute("ALTER TABLE workspace_access ADD COLUMN rejection_reason TEXT")
        changes_made = True

    if changes_made:
        conn.commit()
        print("    Done: Added status, requested_at, processed_at, rejection_reason to workspace_access.")
    else:
        print("[3] workspace_access already has join-request columns.")

    # ── 4. Auto-create WorkspaceAccess for workspace creators ─────────────────
    print("\n[4] Ensuring workspace creators have WorkspaceAccess records...")
    c.execute("SELECT id, created_by FROM workspaces")
    for ws_id, creator_id in c.fetchall():
        c.execute(
            "SELECT id FROM workspace_access WHERE workspace_id = ? AND user_id = ?",
            (ws_id, creator_id)
        )
        if not c.fetchone():
            c.execute(
                "INSERT INTO workspace_access (workspace_id, user_id, status) VALUES (?, ?, 'APPROVED')",
                (ws_id, creator_id)
            )
            print(f"    Created access for creator user_id={creator_id} on workspace_id={ws_id}")
    conn.commit()

    # ── 5. Auto-create WorkspaceAccess for students in approved workspace groups ──
    print("\n[5] Ensuring students in approved workspace groups have WorkspaceAccess...")
    c.execute("""
        SELECT DISTINCT gm.user_id, wg.workspace_id
        FROM group_memberships gm
        JOIN workspace_groups wg ON gm.group_id = wg.group_id
        WHERE wg.status = 'APPROVED'
    """)
    for user_id, ws_id in c.fetchall():
        c.execute(
            "SELECT id FROM workspace_access WHERE workspace_id = ? AND user_id = ?",
            (ws_id, user_id)
        )
        if not c.fetchone():
            c.execute(
                "INSERT INTO workspace_access (workspace_id, user_id, status) VALUES (?, ?, 'APPROVED')",
                (ws_id, user_id)
            )
            print(f"    Created access for student user_id={user_id} on workspace_id={ws_id}")
    conn.commit()

    # ── Verification ─────────────────────────────────────────────────────────
    print("\n[Verification]")
    c.execute("SELECT id, workspace_id, name FROM workspaces")
    for row in c.fetchall():
        print(f"  Workspace: id={row[0]}, workspace_id={row[1]}, name={row[2]}")

    c.execute("SELECT id, workspace_id, group_number, name FROM groups")
    for row in c.fetchall():
        print(f"  Group: id={row[0]}, workspace_id={row[1]}, group_number={row[2]}, name={row[3]}")

    c.execute("SELECT id, workspace_id, user_id, status FROM workspace_access")
    for row in c.fetchall():
        print(f"  WorkspaceAccess: id={row[0]}, ws={row[1]}, user={row[2]}, status={row[3]}")

    print("\n" + "=" * 60)
    print("Migration completed successfully.")
    print("=" * 60)

    conn.close()


if __name__ == "__main__":
    migrate()
