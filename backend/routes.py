"""
MeshVault API Routes
All API endpoints for the MeshVault local backend.
"""

import secrets
from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from models import (
    User, Workspace, Group, GroupMembership, Project, Milestone, Activity, ReviewRequest,
    UserSession, WorkspaceAccess, GradingScheme, GradingCriterion, ReviewComment
)
from schemas import (
    LoginRequest, ProjectCreate, ProjectUpdate, MilestoneCreate, ReviewRequestCreate, WorkspaceCreate,
    WorkspaceAccessUpdate, GradingSchemeCreate, ReviewCommentCreate
)
from auth import authenticate_user

router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    session = db.query(UserSession).filter(UserSession.token == token).first()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session token")
    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def has_workspace_access(workspace_id: int, current_user: User, db: Session) -> bool:
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        return False

    if current_user.role == "STAFF":
        return ws.created_by == current_user.id

    # Student must belong to at least one group in this workspace
    mems = db.query(GroupMembership).filter(GroupMembership.user_id == current_user.id).all()
    gids = [m.group_id for m in mems]
    if not gids:
        return False

    ws_groups = db.query(Group).filter(Group.workspace_id == workspace_id, Group.id.in_(gids)).all()
    if not ws_groups:
        return False

    if not ws.is_restricted:
        return True

    # Restricted: check explicit permissions
    # 1. Allowed individually?
    access = db.query(WorkspaceAccess).filter(
        WorkspaceAccess.workspace_id == workspace_id,
        WorkspaceAccess.user_id == current_user.id
    ).first()
    if access:
        return True

    # 2. Allowed via group?
    ws_gids = [g.id for g in ws_groups]
    access_group = db.query(WorkspaceAccess).filter(
        WorkspaceAccess.workspace_id == workspace_id,
        WorkspaceAccess.group_id.in_(ws_gids)
    ).first()
    if access_group:
        return True

    return False


# ─── Auth ────────────────────────────────────────────────────────────────────

@router.post("/auth/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Verify credentials against SQLite and return user info."""
    user = authenticate_user(db, body.email, body.password)
    if user is None:
        return {"success": False, "message": "Invalid credentials"}
    
    # Generate session token
    token = secrets.token_hex(32)
    session = UserSession(user_id=user.id, token=token)
    db.add(session)
    db.commit()
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user.id,
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "created_at": str(user.created_at),
        },
    }


# ─── Workspaces ──────────────────────────────────────────────────────────────

@router.get("/workspaces")
def list_workspaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List workspaces — role-aware filtering."""
    if current_user.role == "STUDENT":
        mems = db.query(GroupMembership).filter(GroupMembership.user_id == current_user.id).all()
        gids = [m.group_id for m in mems]
        if not gids:
            return []
        grps = db.query(Group).filter(Group.id.in_(gids)).all()
        wids = list({g.workspace_id for g in grps})
        allowed_wids = [wid for wid in wids if has_workspace_access(wid, current_user, db)]
        workspaces = db.query(Workspace).filter(Workspace.id.in_(allowed_wids)).all()
    elif current_user.role == "STAFF":
        workspaces = db.query(Workspace).filter(Workspace.created_by == current_user.id).all()
    else:
        workspaces = db.query(Workspace).all()

    result = []
    for w in workspaces:
        ws_groups = db.query(Group).filter(Group.workspace_id == w.id).all()
        gids = [g.id for g in ws_groups]
        student_count = (
            db.query(GroupMembership).filter(GroupMembership.group_id.in_(gids)).count()
            if gids else 0
        )
        result.append({
            "id": w.id,
            "name": w.name,
            "course_code": w.course_code,
            "course_name": w.course_name,
            "academic_year": w.academic_year,
            "description": w.description,
            "created_by": w.created_by,
            "created_at": str(w.created_at),
            "group_count": len(ws_groups),
            "project_count": db.query(Project).filter(Project.workspace_id == w.id).count(),
            "student_count": student_count,
            "is_restricted": w.is_restricted,
        })
    return result


@router.post("/workspaces", status_code=201)
def create_workspace(
    body: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new academic workspace."""
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden")
    ws = Workspace(
        name=body.name,
        course_code=body.course_code,
        course_name=body.course_name,
        academic_year=body.academic_year,
        description=body.description,
        created_by=current_user.id,
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)
    return {
        "id": ws.id,
        "name": ws.name,
        "course_code": ws.course_code,
        "course_name": ws.course_name,
        "academic_year": ws.academic_year,
        "description": ws.description,
        "created_by": ws.created_by,
        "created_at": str(ws.created_at),
    }


@router.get("/workspaces/{workspace_id}")
def get_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Single workspace with its groups and projects."""
    if not has_workspace_access(workspace_id, current_user, db):
        raise HTTPException(status_code=403, detail="Forbidden")

    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(404, "Workspace not found")

    groups_query = db.query(Group).filter(Group.workspace_id == workspace_id)
    projects_query = db.query(Project).filter(Project.workspace_id == workspace_id)

    if current_user.role == "STUDENT":
        mems = db.query(GroupMembership).filter(GroupMembership.user_id == current_user.id).all()
        gids = [m.group_id for m in mems]
        groups_query = groups_query.filter(Group.id.in_(gids))
        projects_query = projects_query.filter(Project.group_id.in_(gids))

    groups = groups_query.all()
    group_list = []
    for g in groups:
        group_list.append({
            "id": g.id,
            "name": g.name,
            "description": g.description,
            "member_count": db.query(GroupMembership).filter(GroupMembership.group_id == g.id).count(),
            "project_count": db.query(Project).filter(Project.group_id == g.id).count(),
        })

    projects = projects_query.all()
    project_list = []
    for p in projects:
        grp = db.query(Group).filter(Group.id == p.group_id).first()
        project_list.append(_project_dict(p, grp))

    return {
        "id": ws.id,
        "name": ws.name,
        "course_code": ws.course_code,
        "course_name": ws.course_name,
        "academic_year": ws.academic_year,
        "description": ws.description,
        "created_at": str(ws.created_at),
        "is_restricted": ws.is_restricted,
        "groups": group_list,
        "projects": project_list,
    }


# ─── Groups ─────────────────────────────────────────────────────────────────

@router.get("/groups")
def list_groups(
    workspace_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List groups — optionally filtered by workspace or user role."""
    if workspace_id and not has_workspace_access(workspace_id, current_user, db):
        raise HTTPException(status_code=403, detail="Forbidden")

    query = db.query(Group)
    if workspace_id:
        query = query.filter(Group.workspace_id == workspace_id)
    if current_user.role == "STUDENT":
        mems = db.query(GroupMembership).filter(GroupMembership.user_id == current_user.id).all()
        gids = [m.group_id for m in mems]
        query = query.filter(Group.id.in_(gids))

    groups = query.all()
    result = []
    for g in groups:
        if has_workspace_access(g.workspace_id, current_user, db):
            result.append({
                "id": g.id,
                "workspace_id": g.workspace_id,
                "name": g.name,
                "description": g.description,
                "created_at": str(g.created_at),
                "member_count": db.query(GroupMembership).filter(GroupMembership.group_id == g.id).count(),
                "project_count": db.query(Project).filter(Project.group_id == g.id).count(),
            })
    return result


@router.get("/groups/{group_id}")
def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Single group with members and projects."""
    grp = db.query(Group).filter(Group.id == group_id).first()
    if not grp:
        raise HTTPException(404, "Group not found")

    if not has_workspace_access(grp.workspace_id, current_user, db):
        raise HTTPException(status_code=403, detail="Forbidden")

    mems = db.query(GroupMembership).filter(GroupMembership.group_id == group_id).all()
    members = []
    for m in mems:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            members.append({"id": u.id, "name": u.name, "email": u.email, "user_id": u.user_id})

    projects = db.query(Project).filter(Project.group_id == group_id).all()
    project_list = [_project_dict(p) for p in projects]

    ws = db.query(Workspace).filter(Workspace.id == grp.workspace_id).first()

    return {
        "id": grp.id,
        "workspace_id": grp.workspace_id,
        "workspace_name": ws.name if ws else "",
        "name": grp.name,
        "description": grp.description,
        "created_at": str(grp.created_at),
        "members": members,
        "projects": project_list,
    }


# ─── Projects ───────────────────────────────────────────────────────────────

@router.get("/projects")
def list_projects(
    workspace_id: Optional[int] = None,
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List projects with group/workspace names attached."""
    if workspace_id and not has_workspace_access(workspace_id, current_user, db):
        raise HTTPException(status_code=403, detail="Forbidden")

    query = db.query(Project)
    if workspace_id:
        query = query.filter(Project.workspace_id == workspace_id)
    if group_id:
        query = query.filter(Project.group_id == group_id)
    if current_user.role == "STUDENT":
        mems = db.query(GroupMembership).filter(GroupMembership.user_id == current_user.id).all()
        gids = [m.group_id for m in mems]
        if not gids:
            return []
        query = query.filter(Project.group_id.in_(gids))

    projects = query.order_by(Project.created_at.desc()).all()
    result = []
    for p in projects:
        if has_workspace_access(p.workspace_id, current_user, db):
            grp = db.query(Group).filter(Group.id == p.group_id).first()
            ws = db.query(Workspace).filter(Workspace.id == p.workspace_id).first()
            d = _project_dict(p, grp)
            d["workspace_name"] = ws.name if ws else ""
            result.append(d)
    return result


@router.post("/projects", status_code=201)
def create_project(
    body: ProjectCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a project — validates unique project_id."""
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden")
    if not has_workspace_access(body.workspace_id, current_user, db):
        raise HTTPException(status_code=403, detail="Forbidden")

    if db.query(Project).filter(Project.project_id == body.project_id).first():
        raise HTTPException(409, "Project ID already exists")
    ws = db.query(Workspace).filter(Workspace.id == body.workspace_id).first()
    if not ws:
        raise HTTPException(404, "Workspace not found")
    grp = db.query(Group).filter(Group.id == body.group_id).first()
    if not grp:
        raise HTTPException(404, "Group not found")

    project = Project(
        project_id=body.project_id,
        name=body.name,
        description=body.description,
        workspace_id=body.workspace_id,
        group_id=body.group_id,
        course=body.course,
        status=body.status,
        priority=body.priority,
        progress=body.progress,
        deadline=body.deadline,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Update search index
    request.app.state.search_index.add_project(project)

    d = _project_dict(project, grp)
    d["workspace_name"] = ws.name

    # Update Progress BST
    request.app.state.progress_bst.insert(dict(d))

    return d


@router.get("/projects/{project_id}")
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full project detail with milestones, activities, and group members."""
    proj = db.query(Project).filter(Project.project_id == project_id).first()
    if not proj:
        raise HTTPException(404, "Project not found")

    if not has_workspace_access(proj.workspace_id, current_user, db):
        raise HTTPException(status_code=403, detail="Forbidden")

    if current_user.role == "STUDENT":
        mems = db.query(GroupMembership).filter(
            GroupMembership.user_id == current_user.id,
            GroupMembership.group_id == proj.group_id
        ).first()
        if not mems:
            raise HTTPException(status_code=403, detail="Forbidden")

    grp = db.query(Group).filter(Group.id == proj.group_id).first()
    ws = db.query(Workspace).filter(Workspace.id == proj.workspace_id).first()

    milestones = db.query(Milestone).filter(Milestone.project_id == proj.id).all()
    milestone_list = [
        {
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "status": m.status,
            "due_date": str(m.due_date) if m.due_date else None,
            "created_at": str(m.created_at),
        }
        for m in milestones
    ]

    activities = (
        db.query(Activity)
        .filter(Activity.project_id == proj.id)
        .order_by(Activity.created_at.desc())
        .all()
    )
    activity_list = []
    for a in activities:
        u = db.query(User).filter(User.id == a.user_id).first()
        activity_list.append({
            "id": a.id,
            "user_id": a.user_id,
            "user_name": u.name if u else "Unknown",
            "activity_type": a.activity_type,
            "message": a.message,
            "created_at": str(a.created_at),
        })

    members = []
    if grp:
        mems = db.query(GroupMembership).filter(GroupMembership.group_id == grp.id).all()
        for mem in mems:
            u = db.query(User).filter(User.id == mem.user_id).first()
            if u:
                members.append({"id": u.id, "name": u.name, "email": u.email, "user_id": u.user_id})

    d = _project_dict(proj, grp)
    d["workspace_name"] = ws.name if ws else ""
    d["milestones"] = milestone_list
    d["activities"] = activity_list
    d["members"] = members
    return d


@router.put("/projects/{project_id}")
def update_project(
    project_id: str,
    body: ProjectUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a project — refreshes search index and Progress BST."""
    proj = db.query(Project).filter(Project.project_id == project_id).first()
    if not proj:
        raise HTTPException(404, "Project not found")

    if not has_workspace_access(proj.workspace_id, current_user, db):
        raise HTTPException(status_code=403, detail="Forbidden")

    if current_user.role == "STUDENT":
        mems = db.query(GroupMembership).filter(
            GroupMembership.user_id == current_user.id,
            GroupMembership.group_id == proj.group_id
        ).first()
        if not mems:
            raise HTTPException(status_code=403, detail="Forbidden")

    old_project_data = _project_dict(proj)

    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(proj, key, val)

    db.commit()
    db.refresh(proj)

    # Refresh search index
    idx = request.app.state.search_index
    idx.remove_project(project_id)
    idx.add_project(proj)

    # Refresh Progress BST
    bst = request.app.state.progress_bst
    bst.delete(old_project_data)

    grp = db.query(Group).filter(Group.id == proj.group_id).first()
    ws = db.query(Workspace).filter(Workspace.id == proj.workspace_id).first()
    d = _project_dict(proj, grp)
    d["workspace_name"] = ws.name if ws else ""

    bst.insert(dict(d))

    return d


@router.delete("/projects/{project_id}")
def delete_project(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a project and remove it from search index and Progress BST."""
    proj = db.query(Project).filter(Project.project_id == project_id).first()
    if not proj:
        raise HTTPException(404, "Project not found")

    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden")

    if not has_workspace_access(proj.workspace_id, current_user, db):
        raise HTTPException(status_code=403, detail="Forbidden")

    project_data = _project_dict(proj)

    # Delete from database
    db.delete(proj)
    db.commit()

    # Remove from search index and Progress BST
    request.app.state.search_index.remove_project(project_id)
    request.app.state.progress_bst.delete(project_data)

    return {"success": True, "message": f"Project {project_id} deleted."}


# ─── Milestones ──────────────────────────────────────────────────────────────

@router.post("/projects/{project_id}/milestones", status_code=201)
def add_milestone(
    project_id: str,
    body: MilestoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a milestone to a project."""
    proj = db.query(Project).filter(Project.project_id == project_id).first()
    if not proj:
        raise HTTPException(404, "Project not found")

    if not has_workspace_access(proj.workspace_id, current_user, db):
        raise HTTPException(status_code=403, detail="Forbidden")

    if current_user.role == "STUDENT":
        mems = db.query(GroupMembership).filter(
            GroupMembership.user_id == current_user.id,
            GroupMembership.group_id == proj.group_id
        ).first()
        if not mems:
            raise HTTPException(status_code=403, detail="Forbidden")

    ms = Milestone(
        project_id=proj.id,
        title=body.title,
        description=body.description,
        status=body.status,
        due_date=body.due_date,
    )
    db.add(ms)
    db.commit()
    db.refresh(ms)

    return {
        "id": ms.id,
        "project_id": ms.project_id,
        "title": ms.title,
        "description": ms.description,
        "status": ms.status,
        "due_date": str(ms.due_date) if ms.due_date else None,
        "created_at": str(ms.created_at),
    }

@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregated dashboard stats — role-aware."""
    if current_user.role == "STUDENT":
        mems = db.query(GroupMembership).filter(GroupMembership.user_id == current_user.id).all()
        gids = [m.group_id for m in mems]
        total_groups = len(gids)
        total_students = sum(
            db.query(GroupMembership).filter(GroupMembership.group_id == gid).count()
            for gid in gids
        )
        all_projects = (
            db.query(Project).filter(Project.group_id.in_(gids)).all() if gids else []
        )
        projects = [p for p in all_projects if has_workspace_access(p.workspace_id, current_user, db)]
    else:
        total_groups = db.query(Group).count()
        total_students = db.query(User).filter(User.role == "STUDENT").count()
        all_projects = db.query(Project).all()
        projects = [p for p in all_projects if has_workspace_access(p.workspace_id, current_user, db)]

    total_projects = len(projects)
    active_projects = sum(1 for p in projects if p.status == "IN_PROGRESS")
    completed_projects = sum(1 for p in projects if p.status == "COMPLETED")

    # Upcoming deadlines
    today = date.today()
    upcoming = sorted(
        [
            {
                "project_id": p.project_id,
                "name": p.name,
                "deadline": str(p.deadline),
                "group_id": p.group_id,
                "group_name": (db.query(Group).filter(Group.id == p.group_id).first() or Group(name="")).name,
                "status": p.status,
                "progress": p.progress,
            }
            for p in projects
            if p.deadline and p.deadline >= today and p.status != "COMPLETED"
        ],
        key=lambda x: x["deadline"],
    )[:5]

    # Recent activity
    if current_user.role == "STUDENT" and projects:
        pids = [p.id for p in projects]
        recent = (
            db.query(Activity)
            .filter(Activity.project_id.in_(pids))
            .order_by(Activity.created_at.desc())
            .limit(10)
            .all()
        )
    else:
        recent_all = db.query(Activity).order_by(Activity.created_at.desc()).all()
        recent = []
        for a in recent_all:
            pr = db.query(Project).filter(Project.id == a.project_id).first()
            if pr and has_workspace_access(pr.workspace_id, current_user, db):
                recent.append(a)
                if len(recent) >= 10:
                    break

    activity_list = []
    for a in recent:
        u = db.query(User).filter(User.id == a.user_id).first()
        pr = db.query(Project).filter(Project.id == a.project_id).first()
        activity_list.append({
            "id": a.id,
            "user_name": u.name if u else "Unknown",
            "project_name": pr.name if pr else "Unknown",
            "project_id": pr.project_id if pr else "",
            "activity_type": a.activity_type,
            "message": a.message,
            "created_at": str(a.created_at),
        })

    group_members = []
    if current_user.role == "STUDENT":
        mems = db.query(GroupMembership).filter(GroupMembership.user_id == current_user.id).all()
        gids = [m.group_id for m in mems]
        if gids:
            all_mems = db.query(GroupMembership).filter(GroupMembership.group_id.in_(gids)).all()
            member_ids = {m.user_id for m in all_mems}
            db_members = db.query(User).filter(User.id.in_(member_ids)).all()
            for u in db_members:
                group_members.append({
                    "id": u.id,
                    "name": u.name,
                    "email": u.email,
                    "user_id": u.user_id
                })

    return {
        "total_groups": total_groups,
        "total_students": total_students,
        "total_projects": total_projects,
        "active_projects": active_projects,
        "completed_projects": completed_projects,
        "upcoming_deadlines": upcoming,
        "recent_activity": activity_list,
        "group_members": group_members,
    }


@router.get("/activities")
def list_activities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full audit activities — role-aware scoping."""
    if current_user.role == "STUDENT":
        mems = db.query(GroupMembership).filter(GroupMembership.user_id == current_user.id).all()
        gids = [m.group_id for m in mems]
        projects = db.query(Project).filter(Project.group_id.in_(gids)).all() if gids else []
        pids = [p.id for p in projects if has_workspace_access(p.workspace_id, current_user, db)]
        recent = (
            db.query(Activity)
            .filter(Activity.project_id.in_(pids))
            .order_by(Activity.created_at.desc())
            .all()
        )
    else:
        recent_all = db.query(Activity).order_by(Activity.created_at.desc()).all()
        recent = []
        for a in recent_all:
            pr = db.query(Project).filter(Project.id == a.project_id).first()
            if pr and has_workspace_access(pr.workspace_id, current_user, db):
                recent.append(a)

    activity_list = []
    for a in recent:
        u = db.query(User).filter(User.id == a.user_id).first()
        pr = db.query(Project).filter(Project.id == a.project_id).first()
        activity_list.append({
            "id": a.id,
            "user_name": u.name if u else "Unknown",
            "project_name": pr.name if pr else "Unknown",
            "project_id": pr.project_id if pr else "",
            "activity_type": a.activity_type,
            "message": a.message,
            "created_at": str(a.created_at),
        })
    return activity_list


# ─── Smart Search ────────────────────────────────────────────────────────────

@router.get("/search/projects")
def search_projects(
    q: str = Query("", description="Search query"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Smart Search — delegates to dsa_engine.ProjectSearchIndex."""
    idx = request.app.state.search_index
    query = q.strip()
    if not query:
        return {"query": q, "count": 0, "results": []}

    # Gather potential matches
    results = []
    exact = idx.search_by_id(query)
    if exact:
        # Avoid mutating the indexed dict directly
        results = [dict(exact)]
    else:
        name_hits = idx.search_by_name(query)
        if name_hits:
            results = [dict(r) for r in name_hits]
        else:
            partial = idx.partial_search(query)
            results = [dict(r) for r in partial]

    # Filter results by role, user visibility, and workspace restrictions
    filtered = []
    for r in results:
        ws_id = r.get("workspace_id")
        if ws_id and has_workspace_access(ws_id, current_user, db):
            if current_user.role == "STUDENT":
                mems = db.query(GroupMembership).filter(GroupMembership.user_id == current_user.id).all()
                gids = {m.group_id for m in mems}
                if r.get("group_id") in gids:
                    filtered.append(r)
            else:
                filtered.append(r)

    for r in filtered:
        _enrich(r, db)

    return {"query": q, "count": len(filtered), "results": filtered}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _project_dict(p, group=None):
    """Convert a Project model to a dict with optional group_name."""
    return {
        "id": p.id,
        "project_id": p.project_id,
        "name": p.name,
        "description": p.description,
        "workspace_id": p.workspace_id,
        "group_id": p.group_id,
        "group_name": group.name if group else "",
        "course": p.course,
        "status": p.status,
        "priority": p.priority,
        "progress": p.progress,
        "deadline": str(p.deadline) if p.deadline else None,
        "created_at": str(p.created_at),
        "updated_at": str(p.updated_at),
    }


def _enrich(result: dict, db: Session):
    """Add group_name and workspace_name to a search result dict."""
    grp = db.query(Group).filter(Group.id == result.get("group_id")).first()
    ws = db.query(Workspace).filter(Workspace.id == result.get("workspace_id")).first()
    result["group_name"] = grp.name if grp else ""
    result["workspace_name"] = ws.name if ws else ""


# ─── Progress Explorer (BST) ──────────────────────────────────────────────────

@router.get("/progress")
def get_progress(
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all projects sorted by progress using ProgressBST inorder traversal and filtered by scoping."""
    bst = request.app.state.progress_bst
    results = bst.inorder()

    filtered = []
    for r in results:
        ws_id = r.get("workspace_id")
        if ws_id and has_workspace_access(ws_id, current_user, db):
            if current_user.role == "STUDENT":
                mems = db.query(GroupMembership).filter(GroupMembership.user_id == current_user.id).all()
                gids = {m.group_id for m in mems}
                if r.get("group_id") in gids:
                    filtered.append(r)
            else:
                filtered.append(r)

    for r in filtered:
        _enrich(r, db)

    return filtered


@router.get("/progress/range")
def get_progress_range(
    min: float = Query(0.0, alias="min"),
    max: float = Query(100.0, alias="max"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve projects within a progress range using ProgressBST and filter by role/user visibility."""
    bst = request.app.state.progress_bst
    results = bst.range_search(min, max)

    filtered = []
    for r in results:
        ws_id = r.get("workspace_id")
        if ws_id and has_workspace_access(ws_id, current_user, db):
            if current_user.role == "STUDENT":
                mems = db.query(GroupMembership).filter(GroupMembership.user_id == current_user.id).all()
                gids = {m.group_id for m in mems}
                if r.get("group_id") in gids:
                    filtered.append(r)
            else:
                filtered.append(r)

    for r in filtered:
        _enrich(r, db)

    return filtered


# ─── Review Queue ────────────────────────────────────────────────────────────

@router.get("/review-queue")
def get_review_queue(
    workspace_id: Optional[int] = None,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all pending review requests in FIFO order from the ReviewQueue, filtered by workspace."""
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden")

    q = request.app.state.review_queue
    raw_items = list(q._items)
    
    enriched_items = []
    for item in raw_items:
        proj = db.query(Project).filter(Project.id == item["project_id"]).first()
        if not proj:
            continue
        if workspace_id and proj.workspace_id != workspace_id:
            continue
        if not has_workspace_access(proj.workspace_id, current_user, db):
            continue
        
        grp = db.query(Group).filter(Group.id == proj.group_id).first()
        submitter = db.query(User).filter(User.id == item["submitted_by"]).first()
        
        enriched_items.append({
            "id": item["id"],
            "project_id": proj.project_id,
            "project_name": proj.name,
            "group_name": grp.name if grp else "N/A",
            "submitted_by": submitter.name if submitter else "Unknown",
            "request_type": item["request_type"],
            "message": item["message"],
            "status": item["status"],
            "created_at": item["created_at"],
        })
    return enriched_items


@router.get("/review-queue/next")
def get_review_queue_next(
    workspace_id: Optional[int] = None,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Peek the next pending review request in FIFO order (respecting workspace filtering if provided)."""
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden")

    q = request.app.state.review_queue
    if q.is_empty():
        return None
    
    for item in q._items:
        proj = db.query(Project).filter(Project.id == item["project_id"]).first()
        if not proj:
            continue
        if workspace_id and proj.workspace_id != workspace_id:
            continue
        if not has_workspace_access(proj.workspace_id, current_user, db):
            continue
        
        grp = db.query(Group).filter(Group.id == proj.group_id).first()
        submitter = db.query(User).filter(User.id == item["submitted_by"]).first()
        
        return {
            "id": item["id"],
            "project_id": proj.project_id,
            "project_name": proj.name,
            "group_name": grp.name if grp else "N/A",
            "submitted_by": submitter.name if submitter else "Unknown",
            "request_type": item["request_type"],
            "message": item["message"],
            "status": item["status"],
            "created_at": item["created_at"],
        }
    return None


@router.post("/review-queue", status_code=201)
def submit_review_request(
    body: ReviewRequestCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a review request and enqueue it."""
    proj = db.query(Project).filter(Project.id == body.project_id).first()
    if not proj:
        raise HTTPException(404, "Project not found")

    if not has_workspace_access(proj.workspace_id, current_user, db):
        raise HTTPException(status_code=403, detail="Forbidden")

    if current_user.role == "STUDENT":
        # must be group member
        mems = db.query(GroupMembership).filter(
            GroupMembership.user_id == current_user.id,
            GroupMembership.group_id == proj.group_id
        ).first()
        if not mems:
            raise HTTPException(status_code=403, detail="Forbidden")

    submitter = db.query(User).filter(User.id == body.submitted_by).first()
    if not submitter:
        raise HTTPException(404, "User not found")

    req = ReviewRequest(
        project_id=body.project_id,
        submitted_by=body.submitted_by,
        request_type=body.request_type,
        message=body.message,
        status="PENDING",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    data = {
        "id": req.id,
        "project_id": req.project_id,
        "submitted_by": req.submitted_by,
        "request_type": req.request_type,
        "message": req.message,
        "status": req.status,
        "created_at": str(req.created_at),
    }

    # Push to in-memory ReviewQueue
    request.app.state.review_queue.enqueue(data)

    return data


@router.post("/review-queue/process")
def process_review_request(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Process (DEQUEUE) the oldest pending review request."""
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden")

    q = request.app.state.review_queue
    if q.is_empty():
        raise HTTPException(400, "Review queue is empty")
    
    # We should verify that the staff has access to the workspace of the dequeued item
    item = q.dequeue()
    
    # Update status in DB
    req = db.query(ReviewRequest).filter(ReviewRequest.id == item["id"]).first()
    if req:
        req.status = "PROCESSED"
        db.commit()
        db.refresh(req)
    
    return {"success": True, "processed_id": item["id"], "request": item}


# ─── Workspace Restrictions & Access (Staff Only) ──────────────────────────────────

@router.get("/workspaces/{workspace_id}/access")
def get_workspace_access(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden")
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    access_list = db.query(WorkspaceAccess).filter(WorkspaceAccess.workspace_id == workspace_id).all()
    allowed_user_ids = [a.user_id for a in access_list if a.user_id is not None]
    allowed_group_ids = [a.group_id for a in access_list if a.group_id is not None]
    
    return {
        "is_restricted": ws.is_restricted,
        "allowed_user_ids": allowed_user_ids,
        "allowed_group_ids": allowed_group_ids
    }


@router.post("/workspaces/{workspace_id}/access")
def update_workspace_access(
    workspace_id: int,
    body: WorkspaceAccessUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden")
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    ws.is_restricted = body.is_restricted
    
    # Clear existing
    db.query(WorkspaceAccess).filter(WorkspaceAccess.workspace_id == workspace_id).delete()
    
    # Insert new
    for uid in body.allowed_user_ids:
        db.add(WorkspaceAccess(workspace_id=workspace_id, user_id=uid))
    for gid in body.allowed_group_ids:
        db.add(WorkspaceAccess(workspace_id=workspace_id, group_id=gid))
        
    db.commit()
    return {"success": True}


@router.get("/students")
def list_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden")
    students = db.query(User).filter(User.role == "STUDENT").all()
    return [{"id": s.id, "name": s.name, "user_id": s.user_id, "email": s.email} for s in students]


# ─── Grading Scheme Endpoints ─────────────────────────────────────────────────────

@router.get("/workspaces/{workspace_id}/grading-scheme")
def get_grading_scheme(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not has_workspace_access(workspace_id, current_user, db):
        raise HTTPException(status_code=403, detail="Forbidden")
    
    scheme = db.query(GradingScheme).filter(GradingScheme.workspace_id == workspace_id).first()
    if not scheme:
        return None
        
    criteria = db.query(GradingCriterion).filter(GradingCriterion.scheme_id == scheme.id).order_by(GradingCriterion.sort_order, GradingCriterion.id).all()
    return {
        "id": scheme.id,
        "workspace_id": scheme.workspace_id,
        "created_at": str(scheme.created_at),
        "criteria": [
            {
                "id": c.id,
                "scheme_id": c.scheme_id,
                "name": c.name,
                "description": c.description,
                "max_marks": c.max_marks,
                "weight": c.weight,
                "sort_order": c.sort_order
            }
            for c in criteria
        ]
    }


@router.post("/workspaces/{workspace_id}/grading-scheme")
def update_grading_scheme(
    workspace_id: int,
    body: GradingSchemeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden")
    if not has_workspace_access(workspace_id, current_user, db):
        raise HTTPException(status_code=403, detail="Forbidden")
        
    total_weight = 0.0
    has_weights = False
    names = set()
    for c in body.criteria:
        if not c.name.strip():
            raise HTTPException(status_code=400, detail="Criterion name cannot be empty")
        if c.name in names:
            raise HTTPException(status_code=400, detail="Duplicate criterion names are not allowed")
        names.add(c.name)
        if c.max_marks <= 0:
            raise HTTPException(status_code=400, detail="Maximum marks must be positive")
        if c.weight is not None:
            has_weights = True
            total_weight += c.weight
            
    if has_weights and abs(total_weight - 100.0) > 0.01:
        raise HTTPException(status_code=400, detail="Sum of all criterion weights must equal 100%")
        
    scheme = db.query(GradingScheme).filter(GradingScheme.workspace_id == workspace_id).first()
    if not scheme:
        scheme = GradingScheme(workspace_id=workspace_id)
        db.add(scheme)
        db.flush()
        
    db.query(GradingCriterion).filter(GradingCriterion.scheme_id == scheme.id).delete()
    
    for idx, c in enumerate(body.criteria):
        db.add(GradingCriterion(
            scheme_id=scheme.id,
            name=c.name,
            description=c.description,
            max_marks=c.max_marks,
            weight=c.weight,
            sort_order=idx
        ))
        
    db.commit()
    return {"success": True}


# ─── Review Comments Endpoints ───────────────────────────────────────────────────

@router.get("/projects/{project_id}/comments")
def get_review_comments(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj = db.query(Project).filter(Project.project_id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if not has_workspace_access(proj.workspace_id, current_user, db):
        raise HTTPException(status_code=403, detail="Forbidden")
        
    if current_user.role == "STUDENT":
        mems = db.query(GroupMembership).filter(
            GroupMembership.user_id == current_user.id,
            GroupMembership.group_id == proj.group_id
        ).first()
        if not mems:
            raise HTTPException(status_code=403, detail="Forbidden")
            
    comments = db.query(ReviewComment).filter(ReviewComment.project_id == proj.id).order_by(ReviewComment.created_at.asc()).all()
    
    result = []
    for c in comments:
        u = db.query(User).filter(User.id == c.user_id).first()
        result.append({
            "id": c.id,
            "project_id": proj.id,
            "user_id": c.user_id,
            "user_name": u.name if u else "Unknown",
            "comment": c.comment,
            "created_at": str(c.created_at)
        })
    return result


@router.post("/projects/{project_id}/comments")
def create_review_comment(
    project_id: str,
    body: ReviewCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden")
        
    proj = db.query(Project).filter(Project.project_id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if not has_workspace_access(proj.workspace_id, current_user, db):
        raise HTTPException(status_code=403, detail="Forbidden")
        
    if not body.comment.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
        
    comment_record = ReviewComment(
        project_id=proj.id,
        user_id=current_user.id,
        comment=body.comment.strip()
    )
    db.add(comment_record)
    db.commit()
    
    return {
        "id": comment_record.id,
        "project_id": proj.id,
        "user_id": current_user.id,
        "user_name": current_user.name,
        "comment": comment_record.comment,
        "created_at": str(comment_record.created_at)
    }

