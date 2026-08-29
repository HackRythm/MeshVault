import os
import sys

# Ensure backend directory is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal
from models import User
from auth import hash_password

def add_new_users():
    db = SessionLocal()
    try:
        new_users = [
            {
                "name": "Ardra Adsa",
                "email": "ardra.adsa@university.edu",
                "user_id": "STAFF-002",
                "password": hash_password("23aid204"),
                "role": "STAFF"
            },
            {
                "name": "Hashwin",
                "email": "hashwin@university.edu",
                "user_id": "STU-009",
                "password": hash_password("student123"),
                "role": "STUDENT"
            },
            {
                "name": "Sharvesh",
                "email": "sharvesh@university.edu",
                "user_id": "STU-010",
                "password": hash_password("student123"),
                "role": "STUDENT"
            },
            {
                "name": "Bhavesh",
                "email": "bhavesh@university.edu",
                "user_id": "STU-011",
                "password": hash_password("student123"),
                "role": "STUDENT"
            }
        ]

        for u_data in new_users:
            existing = db.query(User).filter(User.email == u_data["email"]).first()
            if existing:
                print(f"User {u_data['email']} already exists. Updating password...")
                existing.password_hash = u_data["password"]
            else:
                user = User(
                    name=u_data["name"],
                    email=u_data["email"],
                    user_id=u_data["user_id"],
                    password_hash=u_data["password"],
                    role=u_data["role"]
                )
                db.add(user)
                print(f"Created user: {u_data['name']} ({u_data['email']})")
        db.commit()
        print("Success: Users successfully added to the database.")
    except Exception as e:
        db.rollback()
        print(f"Error adding users: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_new_users()
