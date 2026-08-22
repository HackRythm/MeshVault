"""
MeshVault Pydantic Schemas
Validation models for API integration.
"""

from datetime import datetime, date
from typing import Optional, List

from pydantic import BaseModel, field_validator


# ─── Auth ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


# ─── User ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    email: str
    user_id: str
    password: str
    role: str  # STAFF or STUDENT


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    user_id: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    success: bool
    user: Optional[UserOut] = None
    message: Optional[str] = None


# ─── Workspace ───────────────────────────────────────────────────────────────

class WorkspaceCreate(BaseModel):
    name: str
    course_code: str
    course_name: str
    academic_year: str
    description: Optional[str] = None


class WorkspaceOut(BaseModel):
    id: int
    name: str
    course_code: str
    course_name: str
    academic_year: str
    description: Optional[str]
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Group ───────────────────────────────────────────────────────────────────

class GroupCreate(BaseModel):
    workspace_id: int
    name: str
    description: Optional[str] = None


class GroupOut(BaseModel):
    id: int
    workspace_id: int
    name: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Project ─────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    project_id: str  # Manually entered by the user
    name: str
    description: Optional[str] = None
    workspace_id: int
    group_id: int
    course: Optional[str] = None
    status: str = "NOT_STARTED"
    priority: str = "MEDIUM"
    progress: float = 0.0
    deadline: Optional[date] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if len(v) > 100:
            raise ValueError("Project name must be 100 characters or less")
        import re
        if not re.match(r"^[a-z0-9._-]+$", v):
            raise ValueError("Project name can only contain lowercase letters, digits, and '.', '_', '-'")
        return v


class ProjectOut(BaseModel):
    id: int
    project_id: str
    name: str
    description: Optional[str]
    workspace_id: int
    group_id: int
    course: Optional[str]
    status: str
    priority: str
    progress: float
    deadline: Optional[date]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    progress: Optional[float] = None
    deadline: Optional[date] = None
    course: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if len(v) > 100:
                raise ValueError("Project name must be 100 characters or less")
            import re
            if not re.match(r"^[a-z0-9._-]+$", v):
                raise ValueError("Project name can only contain lowercase letters, digits, and '.', '_', '-'")
        return v


# ─── Milestone ───────────────────────────────────────────────────────────────

class MilestoneCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "PENDING"
    due_date: Optional[date] = None


class MilestoneOut(BaseModel):
    id: int
    project_id: int
    title: str
    description: Optional[str]
    status: str
    due_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Activity ────────────────────────────────────────────────────────────────

class ActivityCreate(BaseModel):
    project_id: int
    user_id: int
    activity_type: str
    message: str


class ActivityOut(BaseModel):
    id: int
    project_id: int
    user_id: int
    activity_type: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Review Request ──────────────────────────────────────────────────────────

class ReviewRequestCreate(BaseModel):
    project_id: int
    submitted_by: int
    request_type: str
    message: str


class ReviewRequestOut(BaseModel):
    id: int
    project_id: int
    submitted_by: int
    request_type: str
    message: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Workspace Access ──────────────────────────────────────────────────────────

class WorkspaceAccessUpdate(BaseModel):
    is_restricted: bool
    allowed_user_ids: List[int]
    allowed_group_ids: List[int]


# ─── Grading Scheme ────────────────────────────────────────────────────────────

class GradingCriterionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    max_marks: float
    weight: Optional[float] = None


class GradingCriterionOut(BaseModel):
    id: int
    scheme_id: int
    name: str
    description: Optional[str]
    max_marks: float
    weight: Optional[float]
    sort_order: int

    class Config:
        from_attributes = True


class GradingSchemeCreate(BaseModel):
    criteria: List[GradingCriterionCreate]


class GradingSchemeOut(BaseModel):
    id: int
    workspace_id: int
    created_at: datetime
    criteria: List[GradingCriterionOut]

    class Config:
        from_attributes = True


# ─── Review Comments ───────────────────────────────────────────────────────────

class ReviewCommentCreate(BaseModel):
    comment: str


class ReviewCommentOut(BaseModel):
    id: int
    project_id: int
    user_id: int
    user_name: str
    comment: str
    created_at: datetime

    class Config:
        from_attributes = True

