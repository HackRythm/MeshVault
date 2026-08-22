"""
Patch routes.py to replace old comment endpoints with workspace-scoped
comments + evaluation endpoints.
"""
import sys

NEW_SECTION = r'''

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
'''

with open('routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')

# Find line 2113 (index 2112) which is the old comment section header
# Keep everything up to line 2112 (index 2111), replace from there
keep_up_to = 2111  # lines 1..2111 (indices 0..2110)

new_content = '\n'.join(lines[:keep_up_to]) + NEW_SECTION

with open('routes.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Patched routes.py successfully")
print(f"Old lines: {len(lines)}")
new_lines = new_content.split('\n')
print(f"New lines: {len(new_lines)}")
