"""
MeshVault API Routes
All API endpoints for the MeshVault local backend.
"""

import secrets
from datetime import date, datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from models import (
    User, Workspace, Group, GroupMembership, Project, Milestone, Activity, ReviewRequest,
    UserSession, WorkspaceAccess, GradingScheme, GradingCriterion, ReviewComment,
    WorkspaceGroup, WorkspaceProject, ProjectEvaluation
)
from pydantic import BaseModel
from schemas import (
    LoginRequest, ProjectCreate, ProjectUpdate, MilestoneCreate, ReviewRequestCreate, WorkspaceCreate,
    WorkspaceAccessUpdate, GradingSchemeCreate, ReviewCommentCreate, GroupCreate, GroupJoinRequest,
    WorkspaceJoinRequest, WorkspaceRequestProcess, DirectRemovalRequest, EvaluationCreate
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

    # Check if any of the student's groups are APPROVED in this workspace
    ws_groups = db.query(Group).join(WorkspaceGroup).filter(
        WorkspaceGroup.workspace_id == workspace_id,
        WorkspaceGroup.status == "APPROVED",
        Group.id.in_(gids)
    ).all()
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


def has_project_access(project, current_user: User, db: Session) -> bool:
    if current_user.role == "STUDENT":
        mems = db.query(GroupMembership).filter(
            GroupMembership.user_id == current_user.id,
            GroupMembership.group_id == project.group_id
        ).first()
        if mems:
            return True

    wps = db.query(WorkspaceProject).filter(
        WorkspaceProject.project_id == project.id,
        WorkspaceProject.status == "APPROVED"
    ).all()
    if not wps:
        return False

    for wp in wps:
        if has_workspace_access(wp.workspace_id, current_user, db):
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

def _generate_workspace_join_code(db: Session) -> str:
    import random
    import string
    while True:
        rand_str = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        code = f"WS-{rand_str}"
        exists = db.query(Workspace).filter(Workspace.join_code == code).first()
        if not exists:
            return code


@router.get("/workspaces")
def list_workspaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List workspaces visible to the current user."""
    if current_user.role == "STUDENT":
        mems = db.query(GroupMembership).filter(GroupMembership.user_id == current_user.id).all()
        gids = [m.group_id for m in mems]
        if not gids:
            return []
        ws_groups = db.query(WorkspaceGroup).filter(WorkspaceGroup.group_id.in_(gids), WorkspaceGroup.status == "APPROVED").all()
        wids = list({wg.workspace_id for wg in ws_groups})
        allowed_wids = [wid for wid in wids if has_workspace_access(wid, current_user, db)]
        workspaces = db.query(Workspace).filter(Workspace.id.in_(allowed_wids)).all()
    elif current_user.role == "STAFF":
        workspaces = db.query(Workspace).filter(Workspace.created_by == current_user.id).all()
    else:
        workspaces = db.query(Workspace).all()

    result = []
    for w in workspaces:
        ws_groups = db.query(Group).join(WorkspaceGroup).filter(
            WorkspaceGroup.workspace_id == w.id,
            WorkspaceGroup.status == "APPROVED"
        ).all()
        gids = [g.id for g in ws_groups]
        student_count = (
            db.query(GroupMembership).filter(GroupMembership.group_id.in_(gids)).count()
            if gids else 0
        )
        project_count = db.query(WorkspaceProject).filter(
            WorkspaceProject.workspace_id == w.id,
            WorkspaceProject.status == "APPROVED"
        ).count()

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
            "project_count": project_count,
            "student_count": student_count,
            "is_restricted": w.is_restricted,
            "join_code": w.join_code,
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
    
    code = _generate_workspace_join_code(db)

    ws = Workspace(
        name=body.name,
        course_code=body.course_code,
        course_name=body.course_name,
        academic_year=body.academic_year,
        description=body.description,
        created_by=current_user.id,
        join_code=code,
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
        "join_code": ws.join_code,
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

    # Fetch groups with APPROVED link to this workspace
    groups_query = db.query(Group).join(WorkspaceGroup).filter(
        WorkspaceGroup.workspace_id == workspace_id,
        WorkspaceGroup.status == "APPROVED"
    )
    
    # Fetch projects with APPROVED link to this workspace
    projects_query = db.query(Project).join(WorkspaceProject).filter(
        WorkspaceProject.workspace_id == workspace_id,
        WorkspaceProject.status == "APPROVED"
    )

    if current_user.role == "STUDENT":
        mems = db.query(GroupMembership).filter(GroupMembership.user_id == current_user.id).all()
        gids = [m.group_id for m in mems]
        groups_query = groups_query.filter(Group.id.in_(gids))
        projects_query = projects_query.filter(Project.group_id.in_(gids))

    groups = groups_query.all()
    group_list = []
    for g in groups:
        # Projects approved in THIS workspace that belong to group g
        proj_count = db.query(WorkspaceProject).filter(
            WorkspaceProject.workspace_id == workspace_id,
            WorkspaceProject.status == "APPROVED",
            WorkspaceProject.project.has(group_id=g.id)
        ).count()
        group_list.append({
            "id": g.id,
            "name": g.name,
            "description": g.description,
            "member_count": db.query(GroupMembership).filter(GroupMembership.group_id == g.id).count(),
            "project_count": proj_count,
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
        "join_code": ws.join_code,
        "groups": group_list,
        "projects": project_list,
    }


# ─── Workspace Connections & Approvals (Phase 2) ─────────────────────────────

@router.post("/workspaces/join", status_code=200)
def join_workspace(
    body: WorkspaceJoinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allow Group Leaders to submit workspace connection request for group and projects."""
    if current_user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Forbidden: Only students can request to join workspaces.")

    m_check = db.query(GroupMembership).filter(
        GroupMembership.group_id == body.group_id,
        GroupMembership.user_id == current_user.id
    ).first()
    if not m_check or not m_check.is_leader:
        raise HTTPException(status_code=403, detail="Forbidden: Only group leaders can request to join workspaces.")

    ws = db.query(Workspace).filter(Workspace.join_code == body.workspace_code).first()
    if not ws:
        raise HTTPException(404, detail="Workspace with this code not found.")

    wg = db.query(WorkspaceGroup).filter(
        WorkspaceGroup.workspace_id == ws.id,
        WorkspaceGroup.group_id == body.group_id
    ).first()
    
    if wg:
        wg.status = "PENDING"
        wg.requested_by = current_user.id
        wg.requested_at = datetime.utcnow()
        wg.approved_at = None
        wg.rejected_at = None
        wg.rejection_reason = None
    else:
        wg = WorkspaceGroup(
            workspace_id=ws.id,
            group_id=body.group_id,
            requested_by=current_user.id,
            status="PENDING",
            requested_at=datetime.utcnow()
        )
        db.add(wg)

    for pid in body.project_ids:
        p = db.query(Project).filter(
            Project.project_id == pid,
            Project.group_id == body.group_id
        ).first()
        if not p:
            raise HTTPException(404, detail=f"Project with ID '{pid}' not found in your group.")

        wp = db.query(WorkspaceProject).filter(
            WorkspaceProject.workspace_id == ws.id,
            WorkspaceProject.project_id == p.id
        ).first()
        
        if wp:
            wp.status = "PENDING"
            wp.requested_by = current_user.id
            wp.requested_at = datetime.utcnow()
            wp.approved_at = None
            wp.rejected_at = None
            wp.rejection_reason = None
        else:
            wp = WorkspaceProject(
                workspace_id=ws.id,
                project_id=p.id,
                requested_by=current_user.id,
                status="PENDING",
                requested_at=datetime.utcnow()
            )
            db.add(wp)

    db.commit()
    return {"success": True, "message": "Workspace request submitted successfully."}


@router.get("/workspaces/{workspace_id}/requests")
def list_workspace_requests(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Faculty lists all group/project requests for their workspace."""
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden")

    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(404, detail="Workspace not found")
    if ws.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: You are not the host of this workspace.")

    wgs = db.query(WorkspaceGroup).filter(
        WorkspaceGroup.workspace_id == workspace_id,
        WorkspaceGroup.status != "REMOVED"
    ).all()
    
    result = []
    for wg in wgs:
        grp = db.query(Group).filter(Group.id == wg.group_id).first()
        if not grp:
            continue
            
        m_count = db.query(GroupMembership).filter(GroupMembership.group_id == grp.id).count()
        
        wps = db.query(WorkspaceProject).join(Project).filter(
            WorkspaceProject.workspace_id == workspace_id,
            Project.group_id == grp.id,
            WorkspaceProject.status != "REMOVED"
        ).all()
        
        requested_projects = []
        for wp in wps:
            requested_projects.append({
                "project_id": wp.project.project_id,
                "name": wp.project.name,
                "status": wp.status,
                "rejection_reason": wp.rejection_reason
            })
            
        result.append({
            "group_id": grp.id,
            "group_name": grp.name,
            "group_code": grp.code,
            "member_count": m_count,
            "status": wg.status,
            "rejection_reason": wg.rejection_reason,
            "requested_at": str(wg.requested_at),
            "projects": requested_projects
        })
        
    return result


@router.get("/groups/{group_id}/requests")
def list_group_workspace_requests(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Students view workspace requests submitted for their group."""
    m_check = db.query(GroupMembership).filter(
        GroupMembership.group_id == group_id,
        GroupMembership.user_id == current_user.id
    ).first()
    if current_user.role == "STUDENT" and not m_check:
        raise HTTPException(status_code=403, detail="Forbidden: You are not a member of this group.")

    wgs = db.query(WorkspaceGroup).filter(WorkspaceGroup.group_id == group_id).all()
    result = []
    for wg in wgs:
        ws = db.query(Workspace).filter(Workspace.id == wg.workspace_id).first()
        if not ws:
            continue
            
        host = db.query(User).filter(User.id == ws.created_by).first()
        
        wps = db.query(WorkspaceProject).join(Project).filter(
            WorkspaceProject.workspace_id == ws.id,
            Project.group_id == group_id
        ).all()
        
        project_statuses = []
        for wp in wps:
            project_statuses.append({
                "project_id": wp.project.project_id,
                "name": wp.project.name,
                "status": wp.status,
                "rejection_reason": wp.rejection_reason
            })
            
        result.append({
            "workspace_id": ws.id,
            "workspace_name": ws.name,
            "course_code": ws.course_code,
            "course_name": ws.course_name,
            "host_name": host.name if host else "Unknown",
            "status": wg.status,
            "rejection_reason": wg.rejection_reason,
            "requested_at": str(wg.requested_at),
            "projects": project_statuses
        })
        
    return result


@router.post("/workspaces/{workspace_id}/requests/group/{group_id}/process", status_code=200)
def process_workspace_request(
    workspace_id: int,
    group_id: int,
    body: WorkspaceRequestProcess,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Faculty host approves or rejects workspace request for group and projects."""
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden")

    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(404, detail="Workspace not found")
    if ws.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: You are not the host of this workspace.")

    wg = db.query(WorkspaceGroup).filter(
        WorkspaceGroup.workspace_id == workspace_id,
        WorkspaceGroup.group_id == group_id
    ).first()
    if not wg:
        raise HTTPException(404, detail="Group join request not found.")

    now = datetime.utcnow()

    if body.action == "APPROVE_ALL":
        wg.status = "APPROVED"
        wg.approved_at = now
        wg.rejected_at = None
        wg.rejection_reason = None
        
        wps = db.query(WorkspaceProject).join(Project).filter(
            WorkspaceProject.workspace_id == workspace_id,
            Project.group_id == group_id,
            WorkspaceProject.status == "PENDING"
        ).all()
        for wp in wps:
            wp.status = "APPROVED"
            wp.approved_at = now
            wp.rejected_at = None
            wp.rejection_reason = None

    elif body.action == "REJECT_ALL":
        wg.status = "REJECTED"
        wg.rejected_at = now
        wg.approved_at = None
        wg.rejection_reason = body.rejection_reason
        
        wps = db.query(WorkspaceProject).join(Project).filter(
            WorkspaceProject.workspace_id == workspace_id,
            Project.group_id == group_id,
            WorkspaceProject.status == "PENDING"
        ).all()
        for wp in wps:
            wp.status = "REJECTED"
            wp.rejected_at = now
            wp.approved_at = None
            wp.rejection_reason = body.rejection_reason

    elif body.action == "PROCESS_INDIVIDUALLY":
        approved_pids = body.approved_project_ids or []
        rejected_pids = body.rejected_project_ids or []
        
        approved_count = 0
        
        for pid in approved_pids:
            wp = db.query(WorkspaceProject).join(Project).filter(
                WorkspaceProject.workspace_id == workspace_id,
                Project.project_id == pid
            ).first()
            if wp:
                wp.status = "APPROVED"
                wp.approved_at = now
                wp.rejected_at = None
                wp.rejection_reason = None
                approved_count += 1
                
        for pid in rejected_pids:
            wp = db.query(WorkspaceProject).join(Project).filter(
                WorkspaceProject.workspace_id == workspace_id,
                Project.project_id == pid
            ).first()
            if wp:
                wp.status = "REJECTED"
                wp.rejected_at = now
                wp.approved_at = None
                wp.rejection_reason = body.rejection_reason
                
        if approved_count > 0:
            wg.status = "APPROVED"
            wg.approved_at = now
            wg.rejected_at = None
            wg.rejection_reason = None
        else:
            wg.status = "REJECTED"
            wg.rejected_at = now
            wg.approved_at = None
            wg.rejection_reason = body.rejection_reason

    db.commit()
    return {"success": True, "message": "Request processed successfully."}


@router.post("/workspaces/{workspace_id}/remove/group/{group_id}", status_code=200)
def request_remove_group(
    workspace_id: int,
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Group Leader requests removal of group from workspace."""
    if current_user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Forbidden")

    m_check = db.query(GroupMembership).filter(
        GroupMembership.group_id == group_id,
        GroupMembership.user_id == current_user.id
    ).first()
    if not m_check or not m_check.is_leader:
        raise HTTPException(status_code=403, detail="Forbidden: Only leaders can request removal.")

    wg = db.query(WorkspaceGroup).filter(
        WorkspaceGroup.workspace_id == workspace_id,
        WorkspaceGroup.group_id == group_id
    ).first()
    if not wg:
        raise HTTPException(404, detail="Workspace connection not found.")

    wg.status = "REMOVAL_PENDING"
    
    wps = db.query(WorkspaceProject).join(Project).filter(
        WorkspaceProject.workspace_id == workspace_id,
        Project.group_id == group_id
    ).all()
    for wp in wps:
        wp.status = "REMOVAL_PENDING"

    db.commit()
    return {"success": True, "message": "Removal request submitted."}


@router.post("/workspaces/{workspace_id}/remove/project/{project_id}", status_code=200)
def request_remove_project(
    workspace_id: int,
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Group Leader requests removal of project from workspace."""
    if current_user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Forbidden")

    wp = db.query(WorkspaceProject).join(Project).filter(
        WorkspaceProject.workspace_id == workspace_id,
        Project.project_id == project_id
    ).first()
    if not wp:
        raise HTTPException(404, detail="Project connection not found.")

    m_check = db.query(GroupMembership).filter(
        GroupMembership.group_id == wp.project.group_id,
        GroupMembership.user_id == current_user.id
    ).first()
    if not m_check or not m_check.is_leader:
        raise HTTPException(status_code=403, detail="Forbidden: Only leaders can request removal.")

    wp.status = "REMOVAL_PENDING"
    db.commit()
    return {"success": True, "message": "Removal request submitted."}


@router.post("/workspaces/{workspace_id}/remove/group/{group_id}/approve", status_code=200)
def approve_remove_group(
    workspace_id: int,
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Faculty host approves group removal request."""
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden")

    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws or ws.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    wg = db.query(WorkspaceGroup).filter(
        WorkspaceGroup.workspace_id == workspace_id,
        WorkspaceGroup.group_id == group_id
    ).first()
    if not wg:
        raise HTTPException(404, detail="Request not found.")

    wg.status = "REMOVED"
    
    wps = db.query(WorkspaceProject).join(Project).filter(
        WorkspaceProject.workspace_id == workspace_id,
        Project.group_id == group_id
    ).all()
    for wp in wps:
        wp.status = "REMOVED"

    db.commit()
    return {"success": True, "message": "Group removed from workspace."}


@router.post("/workspaces/{workspace_id}/remove/project/{project_id}/approve", status_code=200)
def approve_remove_project(
    workspace_id: int,
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Faculty host approves project removal request."""
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden")

    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws or ws.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    wp = db.query(WorkspaceProject).join(Project).filter(
        WorkspaceProject.workspace_id == workspace_id,
        Project.project_id == project_id
    ).first()
    if not wp:
        raise HTTPException(404, detail="Request not found.")

    wp.status = "REMOVED"
    db.commit()
    return {"success": True, "message": "Project removed from workspace."}


@router.post("/workspaces/{workspace_id}/direct-remove/group/{group_id}", status_code=200)
def direct_remove_group(
    workspace_id: int,
    group_id: int,
    body: DirectRemovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Faculty host directly removes group and all its projects with a mandatory reason."""
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden")
    if not body.reason or not body.reason.strip():
        raise HTTPException(status_code=400, detail="Removal reason is mandatory.")

    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws or ws.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    wg = db.query(WorkspaceGroup).filter(
        WorkspaceGroup.workspace_id == workspace_id,
        WorkspaceGroup.group_id == group_id
    ).first()
    if not wg:
        raise HTTPException(404, detail="Connection not found.")

    wg.status = "REMOVED"
    wg.rejection_reason = body.reason.strip()
    wg.rejected_at = datetime.utcnow()

    wps = db.query(WorkspaceProject).join(Project).filter(
        WorkspaceProject.workspace_id == workspace_id,
        Project.group_id == group_id
    ).all()
    for wp in wps:
        wp.status = "REMOVED"
        wp.rejection_reason = body.reason.strip()
        wp.rejected_at = datetime.utcnow()

    db.commit()
    return {"success": True, "message": "Group directly removed with reason."}


@router.post("/workspaces/{workspace_id}/direct-remove/project/{project_id}", status_code=200)
def direct_remove_project(
    workspace_id: int,
    project_id: str,
    body: DirectRemovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Faculty host directly removes project from workspace with a mandatory reason."""
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden")
    if not body.reason or not body.reason.strip():
        raise HTTPException(status_code=400, detail="Removal reason is mandatory.")

    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws or ws.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    wp = db.query(WorkspaceProject).join(Project).filter(
        WorkspaceProject.workspace_id == workspace_id,
        Project.project_id == project_id
    ).first()
    if not wp:
        raise HTTPException(404, detail="Connection not found.")

    wp.status = "REMOVED"
    wp.rejection_reason = body.reason.strip()
    wp.rejected_at = datetime.utcnow()

    db.commit()
    return {"success": True, "message": "Project directly removed with reason."}


# ─── Groups ─────────────────────────────────────────────────────────────────

class PromoteRequest(BaseModel):
    user_id: int


@router.get("/groups")
def list_groups(
    workspace_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List groups — role-aware scoping and optional workspace filtering."""
    if workspace_id and not has_workspace_access(workspace_id, current_user, db):
        raise HTTPException(status_code=403, detail="Forbidden")

    query = db.query(Group)
    if workspace_id:
        query = query.join(WorkspaceGroup).filter(
            WorkspaceGroup.workspace_id == workspace_id,
            WorkspaceGroup.status == "APPROVED"
        )
    if current_user.role == "STUDENT":
        mems = db.query(GroupMembership).filter(GroupMembership.user_id == current_user.id).all()
        gids = [m.group_id for m in mems]
        query = query.filter(Group.id.in_(gids))

    groups = query.all()
    result = []
    for g in groups:
        wgs = db.query(WorkspaceGroup).filter(WorkspaceGroup.group_id == g.id, WorkspaceGroup.status == "APPROVED").all()
        workspace_ids = [wg.workspace_id for wg in wgs]

        if current_user.role == "STAFF":
            owned_wids = {w.id for w in db.query(Workspace).filter(Workspace.created_by == current_user.id).all()}
            if not any(wid in owned_wids for wid in workspace_ids) and workspace_ids:
                continue

        membership = db.query(GroupMembership).filter(
            GroupMembership.group_id == g.id,
            GroupMembership.user_id == current_user.id
        ).first()

        result.append({
            "id": g.id,
            "workspace_id": workspace_ids[0] if workspace_ids else None,
            "workspace_ids": workspace_ids,
            "name": g.name,
            "description": g.description,
            "code": g.code,
            "created_by": g.created_by,
            "created_at": str(g.created_at),
            "is_leader": membership.is_leader if membership else False,
            "member_count": db.query(GroupMembership).filter(GroupMembership.group_id == g.id).count(),
            "project_count": db.query(Project).filter(Project.group_id == g.id).count(),
        })
    return result


@router.post("/groups", status_code=201)
def create_group(
    body: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new group (creator becomes leader)."""
    # Check if code already exists
    existing = db.query(Group).filter(Group.code == body.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Group join code already exists. Please choose a different one.")

    grp = Group(
        name=body.name,
        code=body.code,
        description=body.description,
        created_by=current_user.id
    )
    db.add(grp)
    db.commit()
    db.refresh(grp)

    # Automatically add creator as a leader
    membership = GroupMembership(
        group_id=grp.id,
        user_id=current_user.id,
        is_leader=True
    )
    db.add(membership)
    db.commit()

    return {
        "id": grp.id,
        "name": grp.name,
        "code": grp.code,
        "description": grp.description,
        "created_by": grp.created_by,
        "created_at": str(grp.created_at)
    }


@router.post("/groups/join")
def join_group(
    body: GroupJoinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Join an existing group using its code."""
    grp = db.query(Group).filter(Group.code == body.code).first()
    if not grp:
        raise HTTPException(status_code=404, detail="Group not found with the provided code.")

    # Check if already a member
    existing = db.query(GroupMembership).filter(
        GroupMembership.group_id == grp.id,
        GroupMembership.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You are already a member of this group.")

    membership = GroupMembership(
        group_id=grp.id,
        user_id=current_user.id,
        is_leader=False
    )
    db.add(membership)
    db.commit()

    return {
        "success": True,
        "message": f"Successfully joined group: {grp.name}",
        "group_id": grp.id
    }


@router.post("/groups/{group_id}/promote")
def promote_member(
    group_id: int,
    body: PromoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Promote a member to group leader (Leaders only)."""
    # Verify current user is a leader
    caller_membership = db.query(GroupMembership).filter(
        GroupMembership.group_id == group_id,
        GroupMembership.user_id == current_user.id
    ).first()
    if not caller_membership or not caller_membership.is_leader:
        raise HTTPException(status_code=403, detail="Forbidden: Only group leaders can promote members.")

    # Verify target is a member
    target_membership = db.query(GroupMembership).filter(
        GroupMembership.group_id == group_id,
        GroupMembership.user_id == body.user_id
    ).first()
    if not target_membership:
        raise HTTPException(status_code=404, detail="Target user is not a member of this group.")

    target_membership.is_leader = True
    db.commit()

    return {"success": True, "message": "User promoted to leader successfully."}


@router.delete("/groups/{group_id}/members/{user_id}")
def remove_member(
    group_id: int,
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a member from the group (Leaders only, or user leaving themselves)."""
    # Fetch caller membership
    caller_membership = db.query(GroupMembership).filter(
        GroupMembership.group_id == group_id,
        GroupMembership.user_id == current_user.id
    ).first()

    if not caller_membership:
        raise HTTPException(status_code=403, detail="Forbidden: You are not a member of this group.")

    # Permission check:
    # 1. User is leaving themselves
    # 2. User is a leader removing someone else
    is_self = (user_id == current_user.id)
    is_leader = caller_membership.is_leader

    if not is_self and not is_leader:
        raise HTTPException(status_code=403, detail="Forbidden: Only leaders can remove other members.")

    # Fetch target membership
    target_membership = db.query(GroupMembership).filter(
        GroupMembership.group_id == group_id,
        GroupMembership.user_id == user_id
    ).first()
    if not target_membership:
        raise HTTPException(status_code=404, detail="Member not found in this group.")

    # If a leader is leaving, check if they are the last leader and there are other members
    if is_self and is_leader:
        other_leaders = db.query(GroupMembership).filter(
            GroupMembership.group_id == group_id,
            GroupMembership.user_id != user_id,
            GroupMembership.is_leader == True
        ).count()
        other_members = db.query(GroupMembership).filter(
            GroupMembership.group_id == group_id,
            GroupMembership.user_id != user_id
        ).count()
        if other_members > 0 and other_leaders == 0:
            raise HTTPException(status_code=400, detail="Cannot leave: You are the last leader. Promote another member first.")

    db.delete(target_membership)
    db.commit()

    # If the group has no members left, delete the group entirely
    remaining = db.query(GroupMembership).filter(GroupMembership.group_id == group_id).count()
    if remaining == 0:
        grp = db.query(Group).filter(Group.id == group_id).first()
        if grp:
            # Delete all projects belonging to the group
            projects = db.query(Project).filter(Project.group_id == group_id).all()
            for p in projects:
                p_data = _project_dict(p)
                db.delete(p)
                request.app.state.search_index.remove_project(p.project_id)
                request.app.state.progress_bst.delete(p_data)
            db.delete(grp)
            db.commit()

    return {"success": True, "message": "Member removed/left successfully."}


@router.delete("/groups/{group_id}")
def delete_group(
    group_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a group entirely (Leaders only)."""
    membership = db.query(GroupMembership).filter(
        GroupMembership.group_id == group_id,
        GroupMembership.user_id == current_user.id
    ).first()
    if not membership or not membership.is_leader:
        raise HTTPException(status_code=403, detail="Forbidden: Only leaders can delete the group.")

    grp = db.query(Group).filter(Group.id == group_id).first()
    if not grp:
        raise HTTPException(status_code=404, detail="Group not found")

    # Delete all projects belonging to the group
    projects = db.query(Project).filter(Project.group_id == group_id).all()
    for p in projects:
        p_data = _project_dict(p)
        db.delete(p)
        request.app.state.search_index.remove_project(p.project_id)
        request.app.state.progress_bst.delete(p_data)

    # Delete all memberships
    db.query(GroupMembership).filter(GroupMembership.group_id == group_id).delete()

    db.delete(grp)
    db.commit()
    return {"success": True, "message": "Group deleted successfully."}


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

    # Check permission: student must be in this group
    membership = db.query(GroupMembership).filter(
        GroupMembership.group_id == group_id,
        GroupMembership.user_id == current_user.id
    ).first()
    if current_user.role == "STUDENT" and not membership:
        raise HTTPException(status_code=403, detail="Forbidden: You are not a member of this group.")

    mems = db.query(GroupMembership).filter(GroupMembership.group_id == group_id).all()
    members = []
    for m in mems:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            members.append({
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "user_id": u.user_id,
                "is_leader": m.is_leader
            })

    projects = db.query(Project).filter(Project.group_id == group_id).all()
    project_list = [_project_dict(p) for p in projects]

    wgs = db.query(WorkspaceGroup).filter(WorkspaceGroup.group_id == grp.id, WorkspaceGroup.status == "APPROVED").all()
    workspace_ids = [wg.workspace_id for wg in wgs]
    ws = db.query(Workspace).filter(Workspace.id == workspace_ids[0]).first() if workspace_ids else None

    return {
        "id": grp.id,
        "workspace_id": workspace_ids[0] if workspace_ids else None,
        "workspace_ids": workspace_ids,
        "workspace_name": ws.name if ws else "",
        "name": grp.name,
        "code": grp.code,
        "description": grp.description,
        "created_at": str(grp.created_at),
        "is_leader": membership.is_leader if (membership and current_user.role == "STUDENT") else False,
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
        query = query.join(WorkspaceProject).filter(
            WorkspaceProject.workspace_id == workspace_id,
            WorkspaceProject.status == "APPROVED"
        )
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
        wps = db.query(WorkspaceProject).filter(WorkspaceProject.project_id == p.id, WorkspaceProject.status == "APPROVED").all()
        workspace_ids = [wp.workspace_id for wp in wps]

        if current_user.role == "STAFF":
            owned_wids = {w.id for w in db.query(Workspace).filter(Workspace.created_by == current_user.id).all()}
            if not any(wid in owned_wids for wid in workspace_ids) and workspace_ids:
                continue

        grp = db.query(Group).filter(Group.id == p.group_id).first()
        ws = db.query(Workspace).filter(Workspace.id == workspace_ids[0]).first() if workspace_ids else None
        d = _project_dict(p, grp)
        d["workspace_id"] = workspace_ids[0] if workspace_ids else None
        d["workspace_ids"] = workspace_ids
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
    if current_user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Forbidden: Only students can create projects.")

    # Student must belong to the group
    membership = db.query(GroupMembership).filter(
        GroupMembership.group_id == body.group_id,
        GroupMembership.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Forbidden: You are not a member of this group.")

    if db.query(Project).filter(Project.project_id == body.project_id).first():
        raise HTTPException(409, "Project ID already exists")

    grp = db.query(Group).filter(Group.id == body.group_id).first()
    if not grp:
        raise HTTPException(404, "Group not found")

    project = Project(
        project_id=body.project_id,
        name=body.name,
        description=body.description,
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

    # Log activity
    act = Activity(
        project_id=project.id,
        user_id=current_user.id,
        activity_type="PROJECT_CREATED",
        message=f"Project '{project.name}' was created."
    )
    db.add(act)
    db.commit()

    # Update search index
    request.app.state.search_index.add_project(project)

    d = _project_dict(project, grp)
    d["workspace_name"] = ""

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

    wps = db.query(WorkspaceProject).filter(
        WorkspaceProject.project_id == proj.id,
        WorkspaceProject.status == "APPROVED"
    ).all()
    workspace_ids = [wp.workspace_id for wp in wps]

    has_access = False
    if current_user.role == "STUDENT":
        mems = db.query(GroupMembership).filter(
            GroupMembership.user_id == current_user.id,
            GroupMembership.group_id == proj.group_id
        ).first()
        if mems or any(has_workspace_access(wid, current_user, db) for wid in workspace_ids):
            has_access = True
    elif current_user.role == "STAFF":
        if any(has_workspace_access(wid, current_user, db) for wid in workspace_ids):
            has_access = True

    if not has_access:
        raise HTTPException(status_code=403, detail="Forbidden")

    grp = db.query(Group).filter(Group.id == proj.group_id).first()
    ws = db.query(Workspace).filter(Workspace.id == workspace_ids[0]).first() if workspace_ids else None

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

    if current_user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Forbidden: Only students can edit projects.")

    mems = db.query(GroupMembership).filter(
        GroupMembership.user_id == current_user.id,
        GroupMembership.group_id == proj.group_id
    ).first()
    if not mems:
        raise HTTPException(status_code=403, detail="Forbidden: You are not a member of this group.")

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
    wps = db.query(WorkspaceProject).filter(
        WorkspaceProject.project_id == proj.id,
        WorkspaceProject.status == "APPROVED"
    ).all()
    workspace_ids = [wp.workspace_id for wp in wps]
    ws = db.query(Workspace).filter(Workspace.id == workspace_ids[0]).first() if workspace_ids else None
    d = _project_dict(proj, grp, workspace_id=workspace_ids[0] if workspace_ids else None)
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
    """Delete a project and remove it from search index and Progress BST (Leaders only)."""
    proj = db.query(Project).filter(Project.project_id == project_id).first()
    if not proj:
        raise HTTPException(404, "Project not found")

    if current_user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Forbidden: Only students can delete projects.")

    membership = db.query(GroupMembership).filter(
        GroupMembership.group_id == proj.group_id,
        GroupMembership.user_id == current_user.id
    ).first()
    if not membership or not membership.is_leader:
        raise HTTPException(status_code=403, detail="Forbidden: Only group leaders can delete projects.")

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

    wps = db.query(WorkspaceProject).filter(
        WorkspaceProject.project_id == proj.id,
        WorkspaceProject.status == "APPROVED"
    ).all()
    workspace_ids = [wp.workspace_id for wp in wps]

    has_access = False
    if current_user.role == "STUDENT":
        mems = db.query(GroupMembership).filter(
            GroupMembership.user_id == current_user.id,
            GroupMembership.group_id == proj.group_id
        ).first()
        if mems:
            has_access = True
    elif current_user.role == "STAFF":
        if any(has_workspace_access(wid, current_user, db) for wid in workspace_ids):
            has_access = True

    if not has_access:
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
        # Students see only their own group's projects
        projects = all_projects
    else:
        # STAFF: dashboard shows ALL projects as a global overview.
        # Workspace isolation is enforced at the evaluation/comment level, not here.
        my_workspaces = db.query(Workspace).filter(Workspace.created_by == current_user.id).all()
        my_ws_ids = [ws.id for ws in my_workspaces]
        if my_ws_ids:
            # Projects in this staff member's workspaces (any status)
            wp_project_ids = [
                wp.project_id for wp in db.query(WorkspaceProject)
                .filter(WorkspaceProject.workspace_id.in_(my_ws_ids)).all()
            ]
            if wp_project_ids:
                projects = db.query(Project).filter(Project.id.in_(wp_project_ids)).all()
            else:
                projects = []
        else:
            # Staff with no workspaces yet: show all projects as global view
            projects = db.query(Project).all()

        # Groups and students from staff's workspaces
        if my_ws_ids:
            wg_group_ids = list(set(
                wg.group_id for wg in db.query(WorkspaceGroup)
                .filter(WorkspaceGroup.workspace_id.in_(my_ws_ids)).all()
            ))
            total_groups = len(wg_group_ids)
            total_students = 0
            for gid in wg_group_ids:
                total_students += db.query(GroupMembership).filter(GroupMembership.group_id == gid).count()
        else:
            total_groups = db.query(Group).count()
            total_students = db.query(User).filter(User.role == "STUDENT").count()

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
        # STAFF: show activity for their workspace projects
        pids = [p.id for p in projects]
        if pids:
            recent = (
                db.query(Activity)
                .filter(Activity.project_id.in_(pids))
                .order_by(Activity.created_at.desc())
                .limit(10)
                .all()
            )
        else:
            recent = []

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
        pids = [p.id for p in db.query(Project).filter(Project.group_id.in_(gids)).all()] if gids else []
        recent = (
            db.query(Activity)
            .filter(Activity.project_id.in_(pids))
            .order_by(Activity.created_at.desc())
            .all()
        ) if pids else []
    else:
        # STAFF: activities scoped to their workspace projects
        my_ws_ids = [
            ws.id for ws in db.query(Workspace).filter(Workspace.created_by == current_user.id).all()
        ]
        if my_ws_ids:
            ws_pids = [
                wp.project_id for wp in db.query(WorkspaceProject)
                .filter(WorkspaceProject.workspace_id.in_(my_ws_ids)).all()
            ]
            recent = (
                db.query(Activity)
                .filter(Activity.project_id.in_(ws_pids))
                .order_by(Activity.created_at.desc())
                .all()
            ) if ws_pids else []
        else:
            recent = db.query(Activity).order_by(Activity.created_at.desc()).all()

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

def _project_dict(p, group=None, workspace_id=None):
    """Convert a Project model to a dict with optional group_name."""
    return {
        "id": p.id,
        "project_id": p.project_id,
        "name": p.name,
        "description": p.description,
        "workspace_id": workspace_id,
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
    wp = db.query(WorkspaceProject).filter(
        WorkspaceProject.project_id == result.get("id"),
        WorkspaceProject.status == "APPROVED"
    ).first()
    ws = db.query(Workspace).filter(Workspace.id == wp.workspace_id).first() if wp else None
    result["group_name"] = grp.name if grp else ""
    result["workspace_name"] = ws.name if ws else ""
    result["workspace_id"] = ws.id if ws else None


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
        # Resolve this project's approved workspace(s)
        wps = db.query(WorkspaceProject).filter(
            WorkspaceProject.project_id == proj.id,
            WorkspaceProject.status == "APPROVED"
        ).all()
        # Faculty sees items only from their own workspaces
        visible = False
        for wp in wps:
            if workspace_id and wp.workspace_id != workspace_id:
                continue
            if has_workspace_access(wp.workspace_id, current_user, db):
                visible = True
                break
        if not visible:
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
        wps = db.query(WorkspaceProject).filter(
            WorkspaceProject.project_id == proj.id,
            WorkspaceProject.status == "APPROVED"
        ).all()
        visible = False
        for wp in wps:
            if workspace_id and wp.workspace_id != workspace_id:
                continue
            if has_workspace_access(wp.workspace_id, current_user, db):
                visible = True
                break
        if not visible:
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

    if not has_project_access(proj, current_user, db):
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


# ─── Review Comments Endpoints (workspace-scoped) ────────────────────────────────────────

def _verify_ws_project_access(workspace_id: int, project_id: str, current_user, db):
    """
    Shared guard for workspace-scoped comment and evaluation endpoints.
    Returns (ws, proj) if allowed, raises HTTPException otherwise.

    Auth chain:
      1. Workspace exists. STAFF must be host. STUDENT must have APPROVED group.
      2. Project must be APPROVED in this workspace.
      3. STUDENT must be a member of that project's group.
    """
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if current_user.role == "STAFF":
        if ws.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden: not the workspace host")
    else:
        mems = db.query(GroupMembership).filter(GroupMembership.user_id == current_user.id).all()
        gids = [m.group_id for m in mems]
        if not gids:
            raise HTTPException(status_code=403, detail="Forbidden")
        approved = db.query(WorkspaceGroup).filter(
            WorkspaceGroup.workspace_id == workspace_id,
            WorkspaceGroup.group_id.in_(gids),
            WorkspaceGroup.status == "APPROVED"
        ).first()
        if not approved:
            raise HTTPException(status_code=403, detail="Forbidden: group not approved in workspace")

    proj = db.query(Project).filter(Project.project_id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    wp = db.query(WorkspaceProject).filter(
        WorkspaceProject.workspace_id == workspace_id,
        WorkspaceProject.project_id == proj.id,
        WorkspaceProject.status == "APPROVED"
    ).first()
    if not wp:
        raise HTTPException(status_code=404, detail="Project not found in this workspace")

    if current_user.role == "STUDENT":
        mem = db.query(GroupMembership).filter(
            GroupMembership.user_id == current_user.id,
            GroupMembership.group_id == proj.group_id
        ).first()
        if not mem:
            raise HTTPException(status_code=403, detail="Forbidden: not a member of this project's group")

    return ws, proj


def _comment_out(c, db) -> dict:
    u = db.query(User).filter(User.id == c.user_id).first()
    return {
        "id": c.id,
        "workspace_id": c.workspace_id,
        "project_id": c.project_id,
        "user_id": c.user_id,
        "user_name": u.name if u else "Unknown",
        "is_faculty": (u.role == "STAFF") if u else False,
        "parent_comment_id": c.parent_comment_id,
        "comment": c.comment,
        "created_at": str(c.created_at),
        "replies": [],
    }


@router.get("/workspaces/{workspace_id}/projects/{project_id}/comments")
def get_workspace_project_comments(
    workspace_id: int,
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get workspace-scoped review comments. Only the workspace host and the project's
    group members can see these. Other groups in the same workspace cannot."""
    ws, proj = _verify_ws_project_access(workspace_id, project_id, current_user, db)

    top_comments = (
        db.query(ReviewComment)
        .filter(
            ReviewComment.workspace_id == workspace_id,
            ReviewComment.project_id == proj.id,
            ReviewComment.parent_comment_id == None,
        )
        .order_by(ReviewComment.created_at.asc())
        .all()
    )

    result = []
    for c in top_comments:
        c_out = _comment_out(c, db)
        replies = (
            db.query(ReviewComment)
            .filter(ReviewComment.parent_comment_id == c.id)
            .order_by(ReviewComment.created_at.asc())
            .all()
        )
        c_out["replies"] = [_comment_out(r, db) for r in replies]
        result.append(c_out)
    return result


@router.post("/workspaces/{workspace_id}/projects/{project_id}/comments", status_code=201)
def create_workspace_project_comment(
    workspace_id: int,
    project_id: str,
    body: ReviewCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Post a review comment. Faculty only."""
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden: only faculty can post review comments")

    ws, proj = _verify_ws_project_access(workspace_id, project_id, current_user, db)

    if not body.comment.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    record = ReviewComment(
        workspace_id=workspace_id,
        project_id=proj.id,
        user_id=current_user.id,
        parent_comment_id=None,
        comment=body.comment.strip(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _comment_out(record, db)


@router.post("/workspaces/{workspace_id}/projects/{project_id}/comments/{comment_id}/reply", status_code=201)
def reply_to_workspace_comment(
    workspace_id: int,
    project_id: str,
    comment_id: int,
    body: ReviewCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reply to a comment. Both faculty and group-member students can reply."""
    ws, proj = _verify_ws_project_access(workspace_id, project_id, current_user, db)

    parent = db.query(ReviewComment).filter(
        ReviewComment.id == comment_id,
        ReviewComment.workspace_id == workspace_id,
        ReviewComment.project_id == proj.id,
    ).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent comment not found")

    if not body.comment.strip():
        raise HTTPException(status_code=400, detail="Reply cannot be empty")

    record = ReviewComment(
        workspace_id=workspace_id,
        project_id=proj.id,
        user_id=current_user.id,
        parent_comment_id=comment_id,
        comment=body.comment.strip(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _comment_out(record, db)


# ─── Legacy comment endpoint (backward compat, no workspace scope) ──────────────

@router.get("/projects/{project_id}/comments")
def get_review_comments_legacy(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Legacy global comment read endpoint. New code should use workspace-scoped endpoints."""
    proj = db.query(Project).filter(Project.project_id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    if current_user.role == "STUDENT":
        mem = db.query(GroupMembership).filter(
            GroupMembership.user_id == current_user.id,
            GroupMembership.group_id == proj.group_id
        ).first()
        if not mem:
            raise HTTPException(status_code=403, detail="Forbidden")

    comments = (
        db.query(ReviewComment)
        .filter(ReviewComment.project_id == proj.id)
        .order_by(ReviewComment.created_at.asc())
        .all()
    )
    return [_comment_out(c, db) for c in comments]


# ─── Project Evaluation (Faculty Grading History) ─────────────────────────────────────────

import json as _json


@router.post("/workspaces/{workspace_id}/projects/{project_id}/evaluations", status_code=201)
def create_project_evaluation(
    workspace_id: int,
    project_id: str,
    body: EvaluationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a new evaluation (grading event). Faculty host only. Append-only.
    Students CANNOT call this endpoint (403).
    """
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden: students cannot grade projects")

    ws, proj = _verify_ws_project_access(workspace_id, project_id, current_user, db)

    if body.score < 0:
        raise HTTPException(status_code=400, detail="Score cannot be negative")
    if body.max_score <= 0:
        raise HTTPException(status_code=400, detail="Max score must be positive")
    if body.score > body.max_score:
        raise HTTPException(status_code=400, detail="Score cannot exceed max score")

    if body.grading_scheme_id:
        scheme = db.query(GradingScheme).filter(
            GradingScheme.id == body.grading_scheme_id,
            GradingScheme.workspace_id == workspace_id
        ).first()
        if not scheme:
            raise HTTPException(status_code=400, detail="Grading scheme not found in this workspace")

    criterion_json = None
    if body.criterion_scores:
        criterion_json = _json.dumps([cs.dict() for cs in body.criterion_scores])

    evaluation = ProjectEvaluation(
        workspace_id=workspace_id,
        project_id=proj.id,
        evaluator_id=current_user.id,
        grading_scheme_id=body.grading_scheme_id,
        score=body.score,
        max_score=body.max_score,
        notes=body.notes,
        criterion_scores=criterion_json,
    )
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)

    return {
        "id": evaluation.id,
        "workspace_id": evaluation.workspace_id,
        "project_id": evaluation.project_id,
        "evaluator_id": evaluation.evaluator_id,
        "evaluator_name": current_user.name,
        "grading_scheme_id": evaluation.grading_scheme_id,
        "score": evaluation.score,
        "max_score": evaluation.max_score,
        "notes": evaluation.notes,
        "criterion_scores": evaluation.criterion_scores,
        "created_at": str(evaluation.created_at),
    }


@router.get("/workspaces/{workspace_id}/projects/{project_id}/evaluations")
def list_project_evaluations(
    workspace_id: int,
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all grading history. Faculty host only. Cross-workspace isolated.
    Students CANNOT call this endpoint (403).
    """
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden: students cannot view grading history")

    ws, proj = _verify_ws_project_access(workspace_id, project_id, current_user, db)

    evaluations = (
        db.query(ProjectEvaluation)
        .filter(
            ProjectEvaluation.workspace_id == workspace_id,
            ProjectEvaluation.project_id == proj.id,
        )
        .order_by(ProjectEvaluation.created_at.asc())
        .all()
    )

    result = []
    for ev in evaluations:
        evaluator = db.query(User).filter(User.id == ev.evaluator_id).first()
        result.append({
            "id": ev.id,
            "workspace_id": ev.workspace_id,
            "project_id": ev.project_id,
            "evaluator_id": ev.evaluator_id,
            "evaluator_name": evaluator.name if evaluator else "Unknown",
            "grading_scheme_id": ev.grading_scheme_id,
            "score": ev.score,
            "max_score": ev.max_score,
            "notes": ev.notes,
            "criterion_scores": ev.criterion_scores,
            "created_at": str(ev.created_at),
        })
    return result


@router.get("/workspaces/{workspace_id}/projects/{project_id}/evaluations/latest")
def get_latest_evaluation(
    workspace_id: int,
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the most recent evaluation. Faculty host only."""
    if current_user.role != "STAFF":
        raise HTTPException(status_code=403, detail="Forbidden: students cannot view grades")

    ws, proj = _verify_ws_project_access(workspace_id, project_id, current_user, db)

    ev = (
        db.query(ProjectEvaluation)
        .filter(
            ProjectEvaluation.workspace_id == workspace_id,
            ProjectEvaluation.project_id == proj.id,
        )
        .order_by(ProjectEvaluation.created_at.desc())
        .first()
    )

    if not ev:
        return None

    evaluator = db.query(User).filter(User.id == ev.evaluator_id).first()
    return {
        "id": ev.id,
        "workspace_id": ev.workspace_id,
        "project_id": ev.project_id,
        "evaluator_id": ev.evaluator_id,
        "evaluator_name": evaluator.name if evaluator else "Unknown",
        "grading_scheme_id": ev.grading_scheme_id,
        "score": ev.score,
        "max_score": ev.max_score,
        "notes": ev.notes,
        "criterion_scores": ev.criterion_scores,
        "created_at": str(ev.created_at),
    }


@router.get("/workspaces/{workspace_id}/projects/{project_id}")
def get_workspace_project_detail(
    workspace_id: int,
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get project detail scoped to a workspace — project + group + members.
    Grading data is NEVER included here. Use /evaluations for that."""
    ws, proj = _verify_ws_project_access(workspace_id, project_id, current_user, db)

    grp = db.query(Group).filter(Group.id == proj.group_id).first()
    members_raw = db.query(GroupMembership).filter(GroupMembership.group_id == proj.group_id).all()
    members = []
    for m in members_raw:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            members.append({
                "id": u.id,
                "name": u.name,
                "user_id": u.user_id,
                "email": u.email,
                "is_leader": m.is_leader,
            })

    milestones = db.query(Milestone).filter(Milestone.project_id == proj.id).order_by(Milestone.id).all()

    return {
        "id": proj.id,
        "project_id": proj.project_id,
        "name": proj.name,
        "description": proj.description,
        "course": proj.course,
        "status": proj.status,
        "priority": proj.priority,
        "progress": proj.progress,
        "deadline": str(proj.deadline) if proj.deadline else None,
        "created_at": str(proj.created_at),
        "updated_at": str(proj.updated_at),
        "group_id": proj.group_id,
        "group_name": grp.name if grp else "",
        "workspace_id": workspace_id,
        "workspace_name": ws.name,
        "members": members,
        "milestones": [
            {
                "id": ms.id,
                "title": ms.title,
                "description": ms.description,
                "status": ms.status,
                "due_date": str(ms.due_date) if ms.due_date else None,
            }
            for ms in milestones
        ],
    }
