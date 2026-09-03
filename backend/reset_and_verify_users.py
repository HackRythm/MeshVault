import sys
import os

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import (
    User, Workspace, Group, GroupMembership, Project, Milestone, Activity,
    ReviewRequest, UserSession, WorkspaceAccess, GradingScheme, GradingCriterion,
    ReviewComment, ProjectEvaluation, StudentGrade, WorkspaceGroup, WorkspaceProject
)

def reset_and_verify():
    db = SessionLocal()
    try:
        target_emails = [
            "hashwin@university.edu",
            "sharvesh@university.edu",
            "bhavesh@university.edu",
            "ardra.adsa@university.edu"
        ]

        print("=" * 60)
        print("MeshVault — Reset Selected Accounts to Fresh User State")
        print("=" * 60)

        # 1. Identify Target Users
        target_users = db.query(User).filter(User.email.in_(target_emails)).all()
        target_ids = [u.id for u in target_users]
        target_map = {u.id: u for u in target_users}

        print(f"\n[1] Target Users Identified: {len(target_users)}")
        for u in target_users:
            print(f"    - ID {u.id}: {u.name} ({u.email}) | Role: {u.role} | UserID: {u.user_id}")

        if len(target_users) != 4:
            raise Exception(f"Expected 4 target users, found {len(target_users)}")

        # 2. Inspect & Delete Related State in Safe Dependency Order
        # Foreign Key Dependency Order:
        # a. StudentGrades (student_id or evaluator_id)
        # b. ProjectEvaluations (evaluator_id)
        # c. ReviewComments (user_id)
        # d. ReviewRequests (submitted_by)
        # e. Activities (user_id)
        # f. WorkspaceAccess (user_id)
        # g. WorkspaceProjects (requested_by)
        # h. WorkspaceGroups (requested_by)
        # i. GroupMembership (user_id)
        # j. UserSession (user_id) - clear active tokens to ensure clean slate
        # k. Projects created by groups owned by targets (if any)
        # l. Groups created by targets (if any)
        # m. Workspaces created by targets (if any)

        del_counts = {}

        # a. StudentGrades
        sg_rows = db.query(StudentGrade).filter(
            (StudentGrade.student_id.in_(target_ids)) | (StudentGrade.evaluator_id.in_(target_ids))
        ).all()
        del_counts["student_grades"] = len(sg_rows)
        for r in sg_rows:
            db.delete(r)

        # b. ProjectEvaluations
        pe_rows = db.query(ProjectEvaluation).filter(ProjectEvaluation.evaluator_id.in_(target_ids)).all()
        del_counts["project_evaluations"] = len(pe_rows)
        for r in pe_rows:
            db.delete(r)

        # c. ReviewComments
        rc_rows = db.query(ReviewComment).filter(ReviewComment.user_id.in_(target_ids)).all()
        del_counts["review_comments"] = len(rc_rows)
        for r in rc_rows:
            db.delete(r)

        # d. ReviewRequests
        rr_rows = db.query(ReviewRequest).filter(ReviewRequest.submitted_by.in_(target_ids)).all()
        del_counts["review_requests"] = len(rr_rows)
        for r in rr_rows:
            db.delete(r)

        # e. Activities
        act_rows = db.query(Activity).filter(Activity.user_id.in_(target_ids)).all()
        del_counts["activities"] = len(act_rows)
        for r in act_rows:
            db.delete(r)

        # f. WorkspaceAccess
        wa_rows = db.query(WorkspaceAccess).filter(WorkspaceAccess.user_id.in_(target_ids)).all()
        del_counts["workspace_access"] = len(wa_rows)
        for r in wa_rows:
            db.delete(r)

        # g. WorkspaceProjects
        wp_rows = db.query(WorkspaceProject).filter(WorkspaceProject.requested_by.in_(target_ids)).all()
        del_counts["workspace_projects"] = len(wp_rows)
        for r in wp_rows:
            db.delete(r)

        # h. WorkspaceGroups
        wg_rows = db.query(WorkspaceGroup).filter(WorkspaceGroup.requested_by.in_(target_ids)).all()
        del_counts["workspace_groups"] = len(wg_rows)
        for r in wg_rows:
            db.delete(r)

        # i. GroupMembership
        gm_rows = db.query(GroupMembership).filter(GroupMembership.user_id.in_(target_ids)).all()
        del_counts["group_memberships"] = len(gm_rows)
        for r in gm_rows:
            db.delete(r)

        # j. UserSession
        us_rows = db.query(UserSession).filter(UserSession.user_id.in_(target_ids)).all()
        del_counts["user_sessions"] = len(us_rows)
        for r in us_rows:
            db.delete(r)

        # k & l. Groups created by targets
        target_groups = db.query(Group).filter(Group.created_by.in_(target_ids)).all()
        target_group_ids = [g.id for g in target_groups]
        if target_group_ids:
            # Delete projects under these groups first
            t_projects = db.query(Project).filter(Project.group_id.in_(target_group_ids)).all()
            t_proj_ids = [p.id for p in t_projects]
            if t_proj_ids:
                db.query(Milestone).filter(Milestone.project_id.in_(t_proj_ids)).delete(synchronize_session=False)
                db.query(Activity).filter(Activity.project_id.in_(t_proj_ids)).delete(synchronize_session=False)
                db.query(WorkspaceProject).filter(WorkspaceProject.project_id.in_(t_proj_ids)).delete(synchronize_session=False)
                db.query(ReviewRequest).filter(ReviewRequest.project_id.in_(t_proj_ids)).delete(synchronize_session=False)
                db.query(ReviewComment).filter(ReviewComment.project_id.in_(t_proj_ids)).delete(synchronize_session=False)
                db.query(ProjectEvaluation).filter(ProjectEvaluation.project_id.in_(t_proj_ids)).delete(synchronize_session=False)
                db.query(StudentGrade).filter(StudentGrade.project_id.in_(t_proj_ids)).delete(synchronize_session=False)
                db.query(Project).filter(Project.id.in_(t_proj_ids)).delete(synchronize_session=False)
            db.query(WorkspaceGroup).filter(WorkspaceGroup.group_id.in_(target_group_ids)).delete(synchronize_session=False)
            db.query(GroupMembership).filter(GroupMembership.group_id.in_(target_group_ids)).delete(synchronize_session=False)
            db.query(Group).filter(Group.id.in_(target_group_ids)).delete(synchronize_session=False)
        del_counts["groups_created"] = len(target_groups)

        # m. Workspaces created by targets
        target_ws = db.query(Workspace).filter(Workspace.created_by.in_(target_ids)).all()
        target_ws_ids = [w.id for w in target_ws]
        if target_ws_ids:
            db.query(WorkspaceAccess).filter(WorkspaceAccess.workspace_id.in_(target_ws_ids)).delete(synchronize_session=False)
            db.query(WorkspaceGroup).filter(WorkspaceGroup.workspace_id.in_(target_ws_ids)).delete(synchronize_session=False)
            db.query(WorkspaceProject).filter(WorkspaceProject.workspace_id.in_(target_ws_ids)).delete(synchronize_session=False)
            db.query(GradingCriterion).filter(GradingCriterion.scheme_id.in_(
                db.query(GradingScheme.id).filter(GradingScheme.workspace_id.in_(target_ws_ids))
            )).delete(synchronize_session=False)
            db.query(GradingScheme).filter(GradingScheme.workspace_id.in_(target_ws_ids)).delete(synchronize_session=False)
            db.query(ProjectEvaluation).filter(ProjectEvaluation.workspace_id.in_(target_ws_ids)).delete(synchronize_session=False)
            db.query(StudentGrade).filter(StudentGrade.workspace_id.in_(target_ws_ids)).delete(synchronize_session=False)
            db.query(ReviewComment).filter(ReviewComment.workspace_id.in_(target_ws_ids)).delete(synchronize_session=False)
            db.query(Workspace).filter(Workspace.id.in_(target_ws_ids)).delete(synchronize_session=False)
        del_counts["workspaces_created"] = len(target_ws)

        db.commit()

        print("\n[2] Deletion Summary for Target Users:")
        for k, v in del_counts.items():
            print(f"    - {k}: {v} removed")

        # 3. Comprehensive Verification
        print("\n[3] Verification of Reset Users:")
        for u in target_users:
            db.refresh(u)
            # Check workspaces
            ws_count = db.query(Workspace).filter(Workspace.created_by == u.id).count()
            # Check groups
            gm_count = db.query(GroupMembership).filter(GroupMembership.user_id == u.id).count()
            gc_count = db.query(Group).filter(Group.created_by == u.id).count()
            # Check workspace join requests
            wg_req_count = db.query(WorkspaceGroup).filter(WorkspaceGroup.requested_by == u.id).count()
            # Check workspace access
            wa_count = db.query(WorkspaceAccess).filter(WorkspaceAccess.user_id == u.id).count()
            # Check project requests
            wp_req_count = db.query(WorkspaceProject).filter(WorkspaceProject.requested_by == u.id).count()
            # Check evaluations & grades
            pe_count = db.query(ProjectEvaluation).filter(ProjectEvaluation.evaluator_id == u.id).count()
            sg_stu_count = db.query(StudentGrade).filter(StudentGrade.student_id == u.id).count()
            sg_eval_count = db.query(StudentGrade).filter(StudentGrade.evaluator_id == u.id).count()
            # Check activities & review requests
            act_count = db.query(Activity).filter(Activity.user_id == u.id).count()
            rr_count = db.query(ReviewRequest).filter(ReviewRequest.submitted_by == u.id).count()

            print(f"\n  User: {u.email} ({u.role})")
            print(f"    - User Record Exists: True (ID: {u.id}, UserID: {u.user_id}, Name: {u.name})")
            print(f"    - Password Hash Intact: {bool(u.password_hash)}")
            print(f"    - Workspaces Created: {ws_count}")
            print(f"    - Group Memberships: {gm_count}")
            print(f"    - Groups Created: {gc_count}")
            print(f"    - Workspace Join Requests: {wg_req_count}")
            print(f"    - Workspace Access Grants: {wa_count}")
            print(f"    - Workspace Project Requests: {wp_req_count}")
            print(f"    - Activities: {act_count}")
            print(f"    - Review Requests: {rr_count}")
            print(f"    - Evaluations as Evaluator: {pe_count}")
            print(f"    - Student Grades (as Student): {sg_stu_count}")
            print(f"    - Student Grades (as Evaluator): {sg_eval_count}")

            assert ws_count == 0
            assert gm_count == 0
            assert gc_count == 0
            assert wg_req_count == 0
            assert wa_count == 0
            assert wp_req_count == 0
            assert act_count == 0
            assert rr_count == 0
            assert pe_count == 0
            assert sg_stu_count == 0
            assert sg_eval_count == 0

        # 4. Verify Other Users (Untouched)
        print("\n[4] Verification of Other Users & Existing Data:")
        other_users = db.query(User).filter(~User.email.in_(target_emails)).all()
        print(f"    Other Users Count: {len(other_users)}")
        for o in other_users:
            ws_c = db.query(Workspace).filter(Workspace.created_by == o.id).count()
            gm_c = db.query(GroupMembership).filter(GroupMembership.user_id == o.id).count()
            print(f"    - {o.name} ({o.email}, {o.role}): {ws_c} workspaces created, {gm_c} group memberships")

        total_ws = db.query(Workspace).count()
        total_groups = db.query(Group).count()
        total_projects = db.query(Project).count()
        total_milestones = db.query(Milestone).count()
        total_activities = db.query(Activity).count()
        print(f"\n    System Totals (Preserved):")
        print(f"    - Workspaces: {total_ws}")
        print(f"    - Groups: {total_groups}")
        print(f"    - Projects: {total_projects}")
        print(f"    - Milestones: {total_milestones}")
        print(f"    - Activities: {total_activities}")

        print("\n" + "=" * 60)
        print("RESET AND VERIFICATION COMPLETED SUCCESSFULLY")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Reset failed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_verify()
