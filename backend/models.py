"""
MeshVault SQLAlchemy ORM Models
Defines the 7 core database entities:
  User, Workspace, Group, GroupMembership, Project, Milestone, Activity
"""

from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    Date,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Boolean,
)
from sqlalchemy.orm import relationship

from database import Base


# ─── User ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    user_id = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # STAFF or STUDENT
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    group_memberships = relationship("GroupMembership", back_populates="user")
    activities = relationship("Activity", back_populates="user")
    created_workspaces = relationship("Workspace", back_populates="creator")

    def __repr__(self):
        return f"<User {self.user_id} ({self.role})>"


# ─── Workspace ───────────────────────────────────────────────────────────────

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    course_code = Column(String(50), nullable=False)
    course_name = Column(String(200), nullable=False)
    academic_year = Column(String(20), nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_restricted = Column(Boolean, default=False, nullable=False)
    join_code = Column(String(50), unique=True, nullable=True, index=True)

    # Relationships
    creator = relationship("User", back_populates="created_workspaces")
    workspace_groups = relationship(
        "WorkspaceGroup", back_populates="workspace", cascade="all, delete-orphan"
    )
    workspace_projects = relationship(
        "WorkspaceProject", back_populates="workspace", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Workspace {self.course_code}: {self.name}>"


# ─── WorkspaceGroup ──────────────────────────────────────────────────────────

class WorkspaceGroup(Base):
    __tablename__ = "workspace_groups"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(30), nullable=False, default="PENDING")  # PENDING | APPROVED | REJECTED | REMOVAL_PENDING | REMOVED
    rejection_reason = Column(Text, nullable=True)
    requested_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)

    # Relationships
    workspace = relationship("Workspace", back_populates="workspace_groups")
    group = relationship("Group", back_populates="workspace_groups")
    requester = relationship("User")

    __table_args__ = (
        UniqueConstraint("workspace_id", "group_id", name="uq_workspace_group"),
    )


# ─── WorkspaceProject ────────────────────────────────────────────────────────

class WorkspaceProject(Base):
    __tablename__ = "workspace_projects"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(30), nullable=False, default="PENDING")  # PENDING | APPROVED | REJECTED | REMOVAL_PENDING | REMOVED
    rejection_reason = Column(Text, nullable=True)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    requested_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)

    # Relationships
    workspace = relationship("Workspace", back_populates="workspace_projects")
    project = relationship("Project", back_populates="workspace_projects")
    requester = relationship("User")

    __table_args__ = (
        UniqueConstraint("workspace_id", "project_id", name="uq_workspace_project"),
    )


# ─── Group ───────────────────────────────────────────────────────────────────

class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    code = Column(String(50), unique=True, nullable=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    workspace_groups = relationship(
        "WorkspaceGroup", back_populates="group", cascade="all, delete-orphan"
    )
    memberships = relationship(
        "GroupMembership", back_populates="group", cascade="all, delete-orphan"
    )
    projects = relationship("Project", back_populates="group")

    def __repr__(self):
        return f"<Group {self.name}>"


# ─── Group Membership ───────────────────────────────────────────────────────

class GroupMembership(Base):
    __tablename__ = "group_memberships"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_leader = Column(Boolean, default=False, nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    group = relationship("Group", back_populates="memberships")
    user = relationship("User", back_populates="group_memberships")

    # A user can only belong to a group once
    __table_args__ = (
        UniqueConstraint("group_id", "user_id", name="uq_group_user"),
    )

    def __repr__(self):
        return f"<GroupMembership group={self.group_id} user={self.user_id}>"


# ─── Project ─────────────────────────────────────────────────────────────────

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    # project_id is the human-readable ID manually entered by the user
    # Example: "AID-DSA-G11-01"
    project_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    course = Column(String(100), nullable=True)
    status = Column(String(30), nullable=False, default="NOT_STARTED")
    priority = Column(String(20), nullable=False, default="MEDIUM")
    progress = Column(Float, default=0.0)  # 0.0 to 100.0
    deadline = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workspace_projects = relationship(
        "WorkspaceProject", back_populates="project", cascade="all, delete-orphan"
    )
    group = relationship("Group", back_populates="projects")
    milestones = relationship(
        "Milestone", back_populates="project", cascade="all, delete-orphan"
    )
    activities = relationship(
        "Activity", back_populates="project", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Project {self.project_id}: {self.name}>"


# ─── Milestone ───────────────────────────────────────────────────────────────

class Milestone(Base):
    __tablename__ = "milestones"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING | IN_PROGRESS | COMPLETED
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="milestones")

    def __repr__(self):
        return f"<Milestone {self.title} ({self.status})>"


# ─── Activity ────────────────────────────────────────────────────────────────

class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    activity_type = Column(String(50), nullable=False)
    # Activity types: PROJECT_CREATED, PROJECT_UPDATED, PROGRESS_UPDATED,
    #                 STATUS_CHANGED, MILESTONE_ADDED
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="activities")
    user = relationship("User", back_populates="activities")

    def __repr__(self):
        return f"<Activity {self.activity_type} on project={self.project_id}>"


# ─── Review Request ──────────────────────────────────────────────────────────

class ReviewRequest(Base):
    __tablename__ = "review_requests"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    request_type = Column(String(50), nullable=False)  # Progress Update, Milestone Update, etc.
    message = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING, PROCESSED
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project")
    user = relationship("User")

    def __repr__(self):
        return f"<ReviewRequest id={self.id} project={self.project_id} status={self.status}>"


# ─── User Session ────────────────────────────────────────────────────────────

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")


# ─── Workspace Access ──────────────────────────────────────────────────────────

class WorkspaceAccess(Base):
    __tablename__ = "workspace_access"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)

    # Relationships
    workspace = relationship("Workspace")
    user = relationship("User")
    group = relationship("Group")


# ─── Grading Scheme ────────────────────────────────────────────────────────────

class GradingScheme(Base):
    __tablename__ = "grading_schemes"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    workspace = relationship("Workspace")
    criteria = relationship("GradingCriterion", back_populates="scheme", cascade="all, delete-orphan")


class GradingCriterion(Base):
    __tablename__ = "grading_criteria"

    id = Column(Integer, primary_key=True, index=True)
    scheme_id = Column(Integer, ForeignKey("grading_schemes.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    max_marks = Column(Float, nullable=False)
    weight = Column(Float, nullable=True)
    sort_order = Column(Integer, default=0)

    # Relationships
    scheme = relationship("GradingScheme", back_populates="criteria")


# ─── Review Comment ───────────────────────────────────────────────────────────

class ReviewComment(Base):
    __tablename__ = "review_comments"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    parent_comment_id = Column(Integer, ForeignKey("review_comments.id", ondelete="CASCADE"), nullable=True)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    workspace = relationship("Workspace")
    project = relationship("Project")
    user = relationship("User")
    # Self-referential: a top-level comment can have many replies
    replies = relationship(
        "ReviewComment",
        primaryjoin="ReviewComment.parent_comment_id == ReviewComment.id",
        foreign_keys="ReviewComment.parent_comment_id",
        lazy="select",
    )


# ─── Project Evaluation ────────────────────────────────────────────────────────

class ProjectEvaluation(Base):
    """Append-only grading history. Each evaluation event creates a new record.
    Faculty can never modify a previous evaluation — only add a new one.
    Workspace-scoped so cross-workspace isolation is enforced at query time.
    """
    __tablename__ = "project_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    evaluator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    grading_scheme_id = Column(Integer, ForeignKey("grading_schemes.id"), nullable=True)
    score = Column(Float, nullable=False)  # aggregate score
    max_score = Column(Float, nullable=False, default=100.0)
    notes = Column(Text, nullable=True)
    criterion_scores = Column(Text, nullable=True)  # JSON string: [{criterion_id, name, score, max_marks}]
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    workspace = relationship("Workspace")
    project = relationship("Project")
    evaluator = relationship("User")
    grading_scheme = relationship("GradingScheme")

