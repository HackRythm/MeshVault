import urllib.request
import urllib.error
import json
import time

BASE_URL = "http://localhost:8000"

def make_request(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    req_data = None
    if data:
        req_data = json.dumps(data).encode("utf-8")
        
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            err_body = json.loads(e.read().decode("utf-8"))
            return e.code, err_body
        except Exception:
            return e.code, str(e)
    except Exception as e:
        return 500, str(e)

def run_feature_integration_tests():
    print("==================================================")
    print("  MeshVault Feature-Level Integration Tests")
    print("==================================================")

    # 1. Log in Staff
    staff_login = {
        "email": "s.mitchell@university.edu",
        "password": "staff123"
    }
    status, body = make_request("/api/auth/login", method="POST", data=staff_login)
    assert status == 200
    staff_token = body["token"]
    staff_id = body["user"]["id"]
    print("[OK] Staff authenticated successfully.")

    # 2. Log in Student (Alex Chen)
    student_login = {
        "email": "alex.chen@university.edu",
        "password": "student123"
    }
    status, body = make_request("/api/auth/login", method="POST", data=student_login)
    assert status == 200
    student_token = body["token"]
    student_id = body["user"]["id"]
    print("[OK] Student authenticated successfully.")

    # Fetch initial workspace ID
    status, body = make_request("/api/workspaces", token=staff_token)
    assert status == 200
    workspace_id = body[0]["id"]
    print(f"[OK] Found Workspace ID: {workspace_id}")

    # Fetch groups in workspace
    status, body = make_request(f"/api/groups?workspace_id={workspace_id}", token=staff_token)
    assert status == 200
    group_id = body[0]["id"] # Team Alpha
    print(f"[OK] Found Group ID: {group_id}")

    # Fetch projects in workspace
    status, body = make_request("/api/projects", token=staff_token)
    assert status == 200
    # Find a project that the test student belongs to (group_id)
    proj_id = next(p["project_id"] for p in body if p["group_id"] == group_id)
    print(f"[OK] Found Project ID: {proj_id}")

    # --- REQUIREMENT: Existing unrestricted workspace behavior still works ---
    # Setup: Workspace is NOT restricted
    status, body = make_request(f"/api/workspaces/{workspace_id}/access", method="POST", token=staff_token, data={
        "is_restricted": False,
        "allowed_user_ids": [],
        "allowed_group_ids": []
    })
    assert status == 200
    # Student should be able to view workspace because they are in the group
    status, body = make_request(f"/api/workspaces/{workspace_id}", token=student_token)
    assert status == 200
    print("[OK] Existing unrestricted workspace behavior still works (Student has access).")

    # --- REQUIREMENT: Staff restricts workspace ---
    status, body = make_request(f"/api/workspaces/{workspace_id}/access", method="POST", token=staff_token, data={
        "is_restricted": True,
        "allowed_user_ids": [],
        "allowed_group_ids": []
    })
    assert status == 200
    print("[OK] Staff restricts workspace successfully.")

    # --- REQUIREMENT: Student without permission gets 403 ---
    status, body = make_request(f"/api/workspaces/{workspace_id}", token=student_token)
    assert status == 403
    print("[OK] Student without permission gets 403 Forbidden.")

    # --- REQUIREMENT: Allowed student gets access ---
    status, body = make_request(f"/api/workspaces/{workspace_id}/access", method="POST", token=staff_token, data={
        "is_restricted": True,
        "allowed_user_ids": [student_id],
        "allowed_group_ids": []
    })
    assert status == 200
    status, body = make_request(f"/api/workspaces/{workspace_id}", token=student_token)
    assert status == 200
    print("[OK] Allowed student gets access successfully.")

    # --- REQUIREMENT: Allowed group gets access ---
    # Revoke individual access, grant group access
    status, body = make_request(f"/api/workspaces/{workspace_id}/access", method="POST", token=staff_token, data={
        "is_restricted": True,
        "allowed_user_ids": [],
        "allowed_group_ids": [group_id]
    })
    assert status == 200
    status, body = make_request(f"/api/workspaces/{workspace_id}", token=student_token)
    assert status == 200
    print("[OK] Allowed group gets access successfully.")

    # --- REQUIREMENT: Grading scheme saves at exactly 100% ---
    status, body = make_request(f"/api/workspaces/{workspace_id}/grading-scheme", method="POST", token=staff_token, data={
        "criteria": [
            {"name": "Design Docs", "description": "UML models", "max_marks": 20, "weight": 40.0},
            {"name": "Coding Standards", "description": "Linting and clean code", "max_marks": 50, "weight": 60.0}
        ]
    })
    assert status == 200
    print("[OK] Grading scheme saves successfully at exactly 100% weight.")

    # --- REQUIREMENT: Grading scheme rejects 90%/110% ---
    status, body = make_request(f"/api/workspaces/{workspace_id}/grading-scheme", method="POST", token=staff_token, data={
        "criteria": [
            {"name": "Design Docs", "description": "UML models", "max_marks": 20, "weight": 40.0},
            {"name": "Coding Standards", "description": "Linting and clean code", "max_marks": 50, "weight": 50.0}
        ]
    })
    assert status == 400
    print("[OK] Grading scheme rejects 90% weight (returns 400).")

    status, body = make_request(f"/api/workspaces/{workspace_id}/grading-scheme", method="POST", token=staff_token, data={
        "criteria": [
            {"name": "Design Docs", "description": "UML models", "max_marks": 20, "weight": 50.0},
            {"name": "Coding Standards", "description": "Linting and clean code", "max_marks": 50, "weight": 60.0}
        ]
    })
    assert status == 400
    print("[OK] Grading scheme rejects 110% weight (returns 400).")

    # --- REQUIREMENT: Student cannot modify grading scheme ---
    status, body = make_request(f"/api/workspaces/{workspace_id}/grading-scheme", method="POST", token=student_token, data={
        "criteria": [
            {"name": "Design Docs", "description": "UML models", "max_marks": 20, "weight": 40.0},
            {"name": "Coding Standards", "description": "Linting and clean code", "max_marks": 50, "weight": 60.0}
        ]
    })
    assert status == 403
    print("[OK] Student cannot modify grading scheme (returns 403).")

    # --- REQUIREMENT: Staff can add review comment ---
    comment_data = {
        "comment": "Outstanding system design layout and thorough tests."
    }
    status, body = make_request(f"/api/projects/{proj_id}/comments", method="POST", token=staff_token, data=comment_data)
    assert status == 200
    comment_id = body["id"]
    print("[OK] Staff can add review comment successfully.")

    # --- REQUIREMENT: Student can read comment ---
    status, body = make_request(f"/api/projects/{proj_id}/comments", token=student_token)
    assert status == 200
    assert any(c["id"] == comment_id for c in body)
    print("[OK] Student can read review comments successfully.")

    # --- REQUIREMENT: Student cannot POST comment ---
    status, body = make_request(f"/api/projects/{proj_id}/comments", method="POST", token=student_token, data=comment_data)
    assert status == 403
    print("[OK] Student cannot POST review comment (returns 403).")

    # --- REQUIREMENT: Student cannot bypass authorization by manipulating query parameters ---
    status, body = make_request(f"/api/students?user_id={staff_id}&role=STAFF", token=student_token)
    assert status == 403
    status, body = make_request(f"/api/students?user_id={staff_id}&role=STAFF")
    assert status == 401
    print("[OK] Student cannot bypass authorization by manipulating query parameters.")

    # Cleanup: restore workspace to unrestricted
    status, body = make_request(f"/api/workspaces/{workspace_id}/access", method="POST", token=staff_token, data={
        "is_restricted": False,
        "allowed_user_ids": [],
        "allowed_group_ids": []
    })
    assert status == 200

    # ─── Phase 1 Group & Project Architecture Tests ─────────────────────────────
    print("\n[Phase 1] Executing Student Groups & Projects architecture tests...")

    # Log in Student 2 (Maya Johnson)
    status, body = make_request("/api/auth/login", method="POST", data={
        "email": "maya.johnson@university.edu",
        "password": "student123"
    })
    assert status == 200
    student2_token = body["token"]
    student2_id = body["user"]["id"]
    print("[OK] Student 2 (Maya) authenticated successfully.")

    # 1. Student creates Group
    group_code = f"GP-X1-{int(time.time())}"
    new_group = {
        "name": "Group X1",
        "code": group_code,
        "description": "Independent study on advanced database engines."
    }
    status, body = make_request("/api/groups", method="POST", data=new_group, token=student_token)
    assert status == 201
    group_id = body["id"]
    print("[OK] Student 1 (Alex) created Group successfully.")

    # 2. Creator becomes Leader
    status, body = make_request(f"/api/groups/{group_id}", token=student_token)
    assert status == 200
    assert body["is_leader"] is True
    leaders = [m for m in body["members"] if m["is_leader"]]
    assert any(m["id"] == student_id for m in leaders)
    print("[OK] Group creator automatically becomes leader.")

    # 3. Another Student joins using Group Code
    status, body = make_request("/api/groups/join", method="POST", data={"code": group_code}, token=student2_token)
    assert status == 200
    print("[OK] Another student (Maya) joined group successfully using code.")

    # Verify Maya is ordinary member (not leader)
    status, body = make_request(f"/api/groups/{group_id}", token=student2_token)
    assert status == 200
    assert body["is_leader"] is False
    assert any(m["id"] == student2_id for m in body["members"])
    print("[OK] Joined student is initially an ordinary member.")

    # 6. Ordinary member cannot promote members
    status, body = make_request(f"/api/groups/{group_id}/promote", method="POST", data={"user_id": student2_id}, token=student2_token)
    assert status == 403
    print("[OK] Ordinary member cannot promote members (returns 403).")

    # 5. Leader can promote another member
    status, body = make_request(f"/api/groups/{group_id}/promote", method="POST", data={"user_id": student2_id}, token=student_token)
    assert status == 200
    print("[OK] Leader successfully promoted member to leader.")

    # 4. Multiple Leaders can exist
    status, body = make_request(f"/api/groups/{group_id}", token=student2_token)
    assert status == 200
    assert body["is_leader"] is True
    print("[OK] Group can successfully have multiple leaders.")

    # 9. Group can contain projects (ordinary member creates it)
    # Using a dynamic project ID to prevent conflict
    project_id_val = f"test-project-x1-{int(time.time())}"
    new_project = {
        "project_id": project_id_val,
        "name": "test-project-x1-name",
        "description": "Phase 1 independent test project.",
        "group_id": group_id,
        "priority": "HIGH"
    }
    status, body = make_request("/api/projects", method="POST", data=new_project, token=student2_token)
    assert status == 201
    print("[OK] Group member can create a project successfully.")

    # 10. Group remains independent of Workspace (workspace_id is None)
    assert body["workspace_id"] is None
    print("[OK] Created project has no workspace association (independent).")

    # 8. Group can contain multiple projects
    project_id_val2 = f"test-project-x2-{int(time.time())}"
    new_project2 = {
        "project_id": project_id_val2,
        "name": "test-project-x2-name",
        "description": "Second test project in group.",
        "group_id": group_id,
        "priority": "LOW"
    }
    status, body = make_request("/api/projects", method="POST", data=new_project2, token=student_token)
    assert status == 201
    print("[OK] Group can contain multiple projects successfully.")

    # Log in Student 3 (Ryan Patel)
    status, body = make_request("/api/auth/login", method="POST", data={
        "email": "ryan.patel@university.edu",
        "password": "student123"
    })
    assert status == 200
    student3_token = body["token"]
    student3_id = body["user"]["id"]

    # Ryan joins group
    status, body = make_request("/api/groups/join", method="POST", data={"code": group_code}, token=student3_token)
    assert status == 200

    # 7. Ordinary member cannot delete projects
    status, body = make_request(f"/api/projects/{project_id_val}", method="DELETE", token=student3_token)
    assert status == 403
    print("[OK] Ordinary member cannot delete projects (returns 403).")

    # 8. Leader can delete projects
    status, body = make_request(f"/api/projects/{project_id_val}", method="DELETE", token=student_token)
    assert status == 200
    print("[OK] Leader can delete projects successfully.")

    # Cleanup: Delete test group
    status, body = make_request(f"/api/groups/{group_id}", method="DELETE", token=student_token)
    assert status == 200
    print("[OK] Group cleaned up successfully.")

    print("\n==================================================")
    print("  ALL FEATURE INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_feature_integration_tests()
