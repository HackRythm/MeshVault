"""
MeshVault Production Database Idempotent Repair Script
Cleans corrupted staff memberships, populates missing workspace IDs,
and establishes canonical WorkspaceGroup and WorkspaceProject relationships.
"""

import os
import sys

backend_dir = r"D:\Meshvault\backend"
sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, ".env"))

from database import SessionLocal
from models import (
    User, Workspace, WorkspaceGroup, WorkspaceProject, Group, GroupMembership, Project
)

def run_repair():
    db = SessionLocal()
    print("=== STARTING IDEMPOTENT NEON POSTGRESQL REPAIR ===\n")
    
    # 1. Populate Workspace workspace_id if NULL
    ws1 = db.query(Workspace).filter(Workspace.id == 1).first()
    if ws1:
        if not ws1.workspace_id:
            ws1.workspace_id = "WS-001"
            print("[REPAIR] Updated Workspace ID 1 workspace_id to 'WS-001'")
        else:
            print(f"[OK] Workspace ID 1 already has workspace_id='{ws1.workspace_id}'")
    
    # 2. Identify Staff users
    staff_users = db.query(User).filter(User.role == "STAFF").all()
    staff_ids = [u.id for u in staff_users]
    print(f"[INFO] Found {len(staff_ids)} staff user(s): {staff_ids}")
    
    # 3. Clean invalid staff memberships from student groups
    invalid_memberships = db.query(GroupMembership).filter(GroupMembership.user_id.in_(staff_ids)).all()
    for m in invalid_memberships:
        print(f"[REPAIR] Removing invalid staff membership: ID={m.id}, group_id={m.group_id}, user_id={m.user_id}")
        db.delete(m)
    
    # 4. Promote legitimate student Hashwin (ID 9) in Group 5 (A11) to leader
    hashwin_mem = db.query(GroupMembership).filter(
        GroupMembership.group_id == 5,
        GroupMembership.user_id == 9
    ).first()
    if hashwin_mem:
        if not hashwin_mem.is_leader:
            hashwin_mem.is_leader = True
            print("[REPAIR] Promoted student Hashwin (ID 9) to leader in Group 5 (A11)")
        else:
            print("[OK] Student Hashwin (ID 9) is already leader in Group 5")
    
    # 5. Clean empty orphaned Group 4 (A11) if it has no members and no projects
    grp4 = db.query(Group).filter(Group.id == 4).first()
    if grp4:
        grp4_mems = db.query(GroupMembership).filter(GroupMembership.group_id == 4).count()
        grp4_projs = db.query(Project).filter(Project.group_id == 4).count()
        if grp4_mems == 0 and grp4_projs == 0:
            db.query(WorkspaceGroup).filter(WorkspaceGroup.group_id == 4).delete()
            db.delete(grp4)
            print("[REPAIR] Deleted empty orphaned Group ID 4 (A11)")
        else:
            print(f"[INFO] Group ID 4 has mems={grp4_mems}, projs={grp4_projs}; keeping.")
            
    # 6. Ensure canonical WorkspaceGroup entries exist for Workspace 1
    valid_groups = db.query(Group).all()
    for g in valid_groups:
        wg = db.query(WorkspaceGroup).filter(
            WorkspaceGroup.workspace_id == 1,
            WorkspaceGroup.group_id == g.id
        ).first()
        if not wg:
            wg = WorkspaceGroup(
                workspace_id=1,
                group_id=g.id,
                requested_by=g.created_by or 1,
                status="APPROVED"
            )
            db.add(wg)
            print(f"[REPAIR] Created canonical WorkspaceGroup for Workspace 1 and Group {g.id} ({g.name})")
        else:
            if wg.status != "APPROVED":
                wg.status = "APPROVED"
                print(f"[REPAIR] Updated WorkspaceGroup for Workspace 1 and Group {g.id} to APPROVED")
            else:
                print(f"[OK] WorkspaceGroup for Workspace 1 and Group {g.id} is APPROVED")
                
    # 7. Ensure canonical WorkspaceProject entries exist for Workspace 1
    valid_projects = db.query(Project).all()
    for p in valid_projects:
        wp = db.query(WorkspaceProject).filter(
            WorkspaceProject.workspace_id == 1,
            WorkspaceProject.project_id == p.id
        ).first()
        if not wp:
            wp = WorkspaceProject(
                workspace_id=1,
                project_id=p.id,
                requested_by=1,
                status="APPROVED"
            )
            db.add(wp)
            print(f"[REPAIR] Created canonical WorkspaceProject for Workspace 1 and Project {p.id} ({p.name})")
        else:
            if wp.status != "APPROVED":
                wp.status = "APPROVED"
                print(f"[REPAIR] Updated WorkspaceProject for Workspace 1 and Project {p.id} to APPROVED")
            else:
                print(f"[OK] WorkspaceProject for Workspace 1 and Project {p.id} is APPROVED")

    db.commit()
    db.close()
    print("\n=== REPAIR COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_repair()
