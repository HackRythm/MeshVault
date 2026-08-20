"""
MeshVault Local Authentication
Password hashing and verification using bcrypt.
No OAuth, no JWT, no external providers — purely local.
"""

import enum

import bcrypt
from sqlalchemy.orm import Session


# ─── Role Enum ───────────────────────────────────────────────────────────────

class Role(str, enum.Enum):
    """User roles within MeshVault."""
    STAFF = "STAFF"
    STUDENT = "STUDENT"


# ─── Password Utilities ─────────────────────────────────────────────────────

def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


# ─── Authentication ─────────────────────────────────────────────────────────

def authenticate_user(db: Session, email: str, password: str):
    """
    Authenticate a user by email and password.

    Returns the User object if credentials are valid, None otherwise.
    """
    from models import User

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
