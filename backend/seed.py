# -*- coding: utf-8 -*-
"""
MeshVault Seed Script
Populates the local SQLite database with coherent development data.

Run:
    cd backend
    python seed.py
"""

import sys
import os
from datetime import datetime, date, timedelta

# Ensure the backend directory is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal, Base
from models import User, Workspace, Group, GroupMembership, Project, Milestone, Activity, WorkspaceGroup, WorkspaceProject
from auth import hash_password, Role


def seed():
    """Create all tables and populate with sample academic data."""

    # Create all tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Guard against double-seeding
        if db.query(User).first():
            print("Database already contains data. Skipping seed.")
            print("To re-seed, delete meshvault.db and run again.")
            return

        print("Seeding MeshVault database...\n")

        # ─── 1 Staff User ────────────────────────────────────────────────
        staff = User(
            name="Dr. Sarah Mitchell",
            email="s.mitchell@university.edu",
            user_id="STAFF-001",
            password_hash=hash_password("staff123"),
            role=Role.STAFF,
        )
        db.add(staff)
        db.flush()
        print(f"  [Staff]   {staff.name}  ({staff.email})")

        # ─── 6 Student Users ─────────────────────────────────────────────
        students_data = [
            ("Alex Chen",         "alex.chen@university.edu",     "STU-001"),
            ("Maya Johnson",      "maya.johnson@university.edu",  "STU-002"),
            ("Ryan Patel",        "ryan.patel@university.edu",    "STU-003"),
            ("Emma Garcia",       "emma.garcia@university.edu",   "STU-004"),
            ("Noah Kim",          "noah.kim@university.edu",      "STU-005"),
            ("Priya Srinivasan",  "priya.s@university.edu",       "STU-006"),
        ]

        students = []
        for name, email, uid in students_data:
            student = User(
                name=name,
                email=email,
                user_id=uid,
                password_hash=hash_password("student123"),
                role=Role.STUDENT,
            )
            db.add(student)
            students.append(student)

        db.flush()
        print(f"  [Students] {len(students)} student users created")

        # ─── 1 Workspace ─────────────────────────────────────────────────
        workspace = Workspace(
            name="DSA Lab Workspace",
            course_code="CS201",
            course_name="Data Structures & Algorithms",
            academic_year="2025-2026",
            description="Workspace for the Data Structures & Algorithms course "
                        "projects and lab assignments.",
            created_by=staff.id,
            join_code="WS-SEED01",
        )
        db.add(workspace)
        db.flush()
        print(f"  [Workspace] {workspace.name} ({workspace.course_code})")

        # ─── 3 Groups ────────────────────────────────────────────────────
        groups_data = [
            ("Team Alpha", "First project team focused on search algorithms."),
            ("Team Beta",  "Second project team working on optimization problems."),
            ("Team Gamma", "Third project team exploring graph-based solutions."),
        ]

        groups = []
        for name, desc in groups_data:
            group = Group(
                name=name,
                description=desc,
                code=f"GP-{name.upper().replace(' ', '')}",
                created_by=students[0].id,
            )
            db.add(group)
            groups.append(group)

        db.flush()
        print(f"  [Groups]  {len(groups)} groups created")

        # Insert WorkspaceGroup mappings
        for g in groups:
            db.add(WorkspaceGroup(
                workspace_id=workspace.id,
                group_id=g.id,
                requested_by=students[0].id,
                status="APPROVED"
            ))
        db.flush()

        # ─── 6 Group Memberships (2 students per group) ──────────────────
        membership_pairs = [
            (groups[0].id, students[0].id),  # Alex   → Alpha
            (groups[0].id, students[1].id),  # Maya   → Alpha
            (groups[1].id, students[2].id),  # Ryan   → Beta
            (groups[1].id, students[3].id),  # Emma   → Beta
            (groups[2].id, students[4].id),  # Noah   → Gamma
            (groups[2].id, students[5].id),  # Priya  → Gamma
        ]

        for idx, (gid, uid) in enumerate(membership_pairs):
            # Make the first student in each pair (even indices) a leader
            is_leader = (idx % 2 == 0)
            db.add(GroupMembership(group_id=gid, user_id=uid, is_leader=is_leader))

        db.flush()
        print(f"  [Members] {len(membership_pairs)} group memberships created")

        # ─── 4 Projects ──────────────────────────────────────────────────
        today = date.today()

        projects_data = [
            {
                "project_id": "CS-DSA-A01",
                "name": "Binary Search Tree Visualizer",
                "description": "An interactive tool to visualize BST operations "
                               "including insertion, deletion, and traversal.",
                "group": groups[0],
                "status": "IN_PROGRESS",
                "priority": "HIGH",
                "progress": 45.0,
                "deadline": today + timedelta(days=30),
            },
            {
                "project_id": "CS-DSA-A02",
                "name": "Hash Table Performance Analyzer",
                "description": "Compare collision resolution strategies and analyze "
                               "performance under different load factors.",
                "group": groups[0],
                "status": "IN_PROGRESS",
                "priority": "MEDIUM",
                "progress": 25.0,
                "deadline": today + timedelta(days=45),
            },
            {
                "project_id": "CS-DSA-B01",
                "name": "Shortest Path Navigator",
                "description": "Implement and compare Dijkstra and A* pathfinding "
                               "algorithms on grid-based maps.",
                "group": groups[1],
                "status": "NOT_STARTED",
                "priority": "HIGH",
                "progress": 0.0,
                "deadline": today + timedelta(days=60),
            },
            {
                "project_id": "CS-DSA-C01",
                "name": "Sorting Algorithm Benchmark Suite",
                "description": "Benchmark and visualize multiple sorting algorithms "
                               "across various input distributions.",
                "group": groups[2],
                "status": "COMPLETED",
                "priority": "LOW",
                "progress": 100.0,
                "deadline": today - timedelta(days=10),
            },
        ]

        projects = []
        for pdata in projects_data:
            project = Project(
                project_id=pdata["project_id"],
                name=pdata["name"],
                description=pdata["description"],
                group_id=pdata["group"].id,
                course="CS201",
                status=pdata["status"],
                priority=pdata["priority"],
                progress=pdata["progress"],
                deadline=pdata["deadline"],
            )
            db.add(project)
            projects.append(project)

        db.flush()
        print(f"  [Projects] {len(projects)} projects created")

        # Insert WorkspaceProject mappings as APPROVED
        for p in projects:
            # Find requester (leader or first member of the group)
            g_mem = db.query(GroupMembership).filter(GroupMembership.group_id == p.group_id).first()
            req_by = g_mem.user_id if g_mem else students[0].id
            db.add(WorkspaceProject(
                workspace_id=workspace.id,
                project_id=p.id,
                requested_by=req_by,
                status="APPROVED"
            ))
        db.flush()

        # ─── 6 Milestones ─────────────────────────────────────────────────
        milestones_data = [
            # BST Visualizer
            (projects[0].id, "Research & Design",
             "Research BST visualization approaches and create UI wireframes.",
             "COMPLETED", today - timedelta(days=10)),
            (projects[0].id, "Core BST Implementation",
             "Implement insert, delete, and search operations.",
             "IN_PROGRESS", today + timedelta(days=10)),
            # Hash Table Analyzer
            (projects[1].id, "Literature Review",
             "Review collision resolution strategies.",
             "COMPLETED", today - timedelta(days=5)),
            (projects[1].id, "Implementation Phase",
             "Build the analyzer with multiple hash functions.",
             "PENDING", today + timedelta(days=20)),
            # Shortest Path Navigator
            (projects[2].id, "Algorithm Selection",
             "Finalize algorithms and data structures to use.",
             "PENDING", today + timedelta(days=15)),
            # Sorting Benchmark
            (projects[3].id, "Final Report",
             "Compile benchmark results and submit final documentation.",
             "COMPLETED", today - timedelta(days=12)),
        ]

        for pid, title, desc, status, due in milestones_data:
            db.add(Milestone(
                project_id=pid,
                title=title,
                description=desc,
                status=status,
                due_date=due,
            ))

        db.flush()
        print(f"  [Milestones] {len(milestones_data)} milestones created")

        # ─── 8 Activity Records ──────────────────────────────────────────
        activities_data = [
            (projects[0].id, staff.id,
             "PROJECT_CREATED",
             "Project 'Binary Search Tree Visualizer' was created."),
            (projects[0].id, students[0].id,
             "PROGRESS_UPDATED",
             "Progress updated to 45%."),
            (projects[0].id, students[1].id,
             "MILESTONE_ADDED",
             "Milestone 'Core BST Implementation' added."),
            (projects[1].id, staff.id,
             "PROJECT_CREATED",
             "Project 'Hash Table Performance Analyzer' was created."),
            (projects[1].id, students[0].id,
             "STATUS_CHANGED",
             "Status changed to IN_PROGRESS."),
            (projects[2].id, staff.id,
             "PROJECT_CREATED",
             "Project 'Shortest Path Navigator' was created."),
            (projects[3].id, staff.id,
             "PROJECT_CREATED",
             "Project 'Sorting Algorithm Benchmark Suite' was created."),
            (projects[3].id, students[4].id,
             "STATUS_CHANGED",
             "Project marked as COMPLETED."),
        ]

        for pid, uid, atype, msg in activities_data:
            db.add(Activity(
                project_id=pid,
                user_id=uid,
                activity_type=atype,
                message=msg,
            ))

        db.commit()
        print(f"  [Activity] {len(activities_data)} activity records created")

        # ─── Summary ─────────────────────────────────────────────────────
        print("\n" + "=" * 50)
        print("  Database seeded successfully!")
        print("=" * 50)
        print(f"\n  Database file: meshvault.db")
        print(f"\n  Login credentials:")
        print(f"    Staff:   s.mitchell@university.edu / staff123")
        print(f"    Student: alex.chen@university.edu  / student123")
        print(f"             (all students share password: student123)")
        print()

    except Exception as e:
        db.rollback()
        print(f"\n  Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
