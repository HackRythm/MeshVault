"""
MeshVault Clean Database Reset Script
Clears all demo/seed workspaces, projects, groups, milestones, review requests, activities,
and populates ONLY the specified official users:
- Ardra Adsa (STAFF)
- Hashwin (STUDENT)
- Sharvesh (STUDENT)
- Bhavesh (STUDENT)
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
from models import (
    User, Workspace, Group, GroupMembership, Project, Milestone, Activity,
    ReviewRequest, UserSession, WorkspaceAccess, GradingScheme, GradingCriterion,
    ReviewComment, WorkspaceGroup, WorkspaceProject, ProjectEvaluation, StudentGrade,
    ProjectGitHub
)
from auth import hash_password


def reset_database():
    print("==================================================")
    print("  Resetting MeshVault Database to Clean State    ")
    print("==================================================")

    db = SessionLocal()
    try:
        # 1. Delete all transactional and organizational data
        print("Clearing tables...")
        db.query(StudentGrade).delete()
        db.query(ProjectEvaluation).delete()
        db.query(ReviewComment).delete()
        db.query(GradingCriterion).delete()
        db.query(GradingScheme).delete()
        db.query(WorkspaceAccess).delete()
        db.query(WorkspaceGroup).delete()
        db.query(WorkspaceProject).delete()
        db.query(ProjectGitHub).delete()
        db.query(Activity).delete()
        db.query(ReviewRequest).delete()
        db.query(Milestone).delete()
        db.query(Project).delete()
        db.query(GroupMembership).delete()
        db.query(Group).delete()
        db.query(Workspace).delete()
        db.query(UserSession).delete()
        db.query(User).delete()
        db.commit()
        print("OK: All projects, workspaces, groups, and sessions removed.")

        # 2. Add ONLY the 4 requested users
        target_users = [
            {
                "name": "Ardra Adsa",
                "email": "ardra.adsa@university.edu",
                "user_id": "STAFF-002",
                "password_hash": hash_password("23aid204"),
                "role": "STAFF",
            },
            {
                "name": "Hashwin",
                "email": "hashwin@university.edu",
                "user_id": "STU-009",
                "password_hash": hash_password("student123"),
                "role": "STUDENT",
            },
            {
                "name": "Sharvesh",
                "email": "sharvesh@university.edu",
                "user_id": "STU-010",
                "password_hash": hash_password("student123"),
                "role": "STUDENT",
            },
            {
                "name": "Bhavesh",
                "email": "bhavesh@university.edu",
                "user_id": "STU-011",
                "password_hash": hash_password("student123"),
                "role": "STUDENT",
            },
        ]

        for u_data in target_users:
            user = User(
                name=u_data["name"],
                email=u_data["email"],
                user_id=u_data["user_id"],
                password_hash=u_data["password_hash"],
                role=u_data["role"],
            )
            db.add(user)
            print(f"OK: Created user: {u_data['name']} ({u_data['role']}) - {u_data['email']}")

        db.commit()
        print("\n==================================================")
        print("OK: Database reset complete! Accounts clean.")
        print("==================================================")
    except Exception as e:
        db.rollback()
        print(f"Error resetting database: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    reset_database()
