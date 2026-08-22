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
    proj_id = body[0]["project_id"]
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

    print("\n==================================================")
    print("  ALL FEATURE INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_feature_integration_tests()
