"""
MeshVault API Integration Verification Script
Performs programmatic validation of all API endpoints, database operations, and search indexes.
"""

import urllib.request
import urllib.parse
import json

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

def run_tests():
    print("==================================================")
    print("  MeshVault API Integration Tests")
    print("==================================================")
    
    # 1. Health Check
    status, body = make_request("/")
    print(f"\n[GET /] Health status: {status}")
    print(body)
    assert status == 200
    assert body["status"] == "ok"
    
    # 2. Authenticate Staff
    login_data = {
        "email": "s.mitchell@university.edu",
        "password": "staff123"
    }
    status, body = make_request("/api/auth/login", method="POST", data=login_data)
    print(f"\n[POST /api/auth/login] Staff: {status}")
    print(body)
    assert status == 200
    assert body["success"] is True
    assert body["user"]["role"] == "STAFF"
    staff_id = body["user"]["id"]
    staff_token = body["token"]
    
    # 3. Authenticate Student
    login_data = {
        "email": "alex.chen@university.edu",
        "password": "student123"
    }
    status, body = make_request("/api/auth/login", method="POST", data=login_data)
    print(f"\n[POST /api/auth/login] Student: {status}")
    print(body)
    assert status == 200
    assert body["success"] is True
    assert body["user"]["role"] == "STUDENT"
    student_id = body["user"]["id"]
    student_token = body["token"]
    
    # 4. Workspace API — Staff View
    status, body = make_request(f"/api/workspaces", token=staff_token)
    print(f"\n[GET /api/workspaces] Staff View: {status}")
    print(f"  Found {len(body)} workspaces")
    assert status == 200
    assert len(body) > 0
    workspace_id = body[0]["id"]
    
    # 5. Workspace API — Student View
    status, body = make_request(f"/api/workspaces", token=student_token)
    print(f"\n[GET /api/workspaces] Student View: {status}")
    print(f"  Found {len(body)} workspaces")
    assert status == 200
    assert len(body) == 1  # Student is only in 1 group/workspace
    
    # 6. Groups API
    status, body = make_request(f"/api/groups?workspace_id={workspace_id}", token=staff_token)
    print(f"\n[GET /api/groups] List Groups: {status}")
    print(f"  Found {len(body)} groups")
    assert status == 200
    assert len(body) > 0
    group_id = body[0]["id"]
    
    # Get group details
    status, body = make_request(f"/api/groups/{group_id}", token=staff_token)
    print(f"[GET /api/groups/{group_id}] Detail: {status}")
    print(f"  Name: {body['name']}")
    print(f"  Members: {[m['name'] for m in body['members']]}")
    print(f"  Projects: {[p['name'] for p in body['projects']]}")
    assert status == 200
    
    # 7. Project Creation (Staff only, student would fail but here we test backend success)
    proj_id = "AID-DSA-G11-01"
    new_proj = {
        "project_id": proj_id,
        "name": "meshvault-ui-backend",
        "description": "Integration testing of Stitch frontend and FastAPI backend.",
        "workspace_id": workspace_id,
        "group_id": group_id,
        "course": "CS201",
        "status": "IN_PROGRESS",
        "priority": "HIGH",
        "progress": 20.0,
        "deadline": "2026-09-30"
    }
    status, body = make_request("/api/projects", method="POST", data=new_proj, token=staff_token)
    print(f"\n[POST /api/projects] Create: {status}")
    print(body)
    # Check if already exists or successfully created
    assert status in (201, 409)
    
    # Verify duplicate Project ID error
    status_dup, body_dup = make_request("/api/projects", method="POST", data=new_proj, token=staff_token)
    print(f"[POST /api/projects] Duplicate Check: {status_dup}")
    print(body_dup)
    assert status_dup == 409
    
    # 8. Project Detail
    status, body = make_request(f"/api/projects/{proj_id}", token=staff_token)
    print(f"\n[GET /api/projects/{proj_id}] Detail: {status}")
    print(f"  Name: {body['name']}")
    print(f"  Status: {body['status']}")
    print(f"  Progress: {body['progress']}%")
    print(f"  Members: {[m['name'] for m in body['members']]}")
    assert status == 200
    
    # 9. Smart Search via dsa_engine.ProjectSearchIndex
    # Search by exact ID
    status, body = make_request(f"/api/search/projects?q={proj_id}", token=staff_token)
    print(f"\n[GET /api/search/projects] Query: '{proj_id}': {status}")
    print(body)
    assert status == 200
    assert body["count"] == 1
    assert body["results"][0]["project_id"] == proj_id
    
    # Search by partial ID / substring
    query = "G11"
    status, body = make_request(f"/api/search/projects?q={query}", token=staff_token)
    print(f"\n[GET /api/search/projects] Query: '{query}': {status}")
    print(f"  Found {body['count']} result(s)")
    assert status == 200
    assert body["count"] >= 1
    
    # Search by partial Name
    query = "Mesh"
    status, body = make_request(f"/api/search/projects?q={query}", token=staff_token)
    print(f"\n[GET /api/search/projects] Query: '{query}': {status}")
    print(f"  Found {body['count']} result(s)")
    print(f"  Matched Names: {[r['name'] for r in body['results']]}")
    assert status == 200
    assert body["count"] >= 1
    
    # 10. Dashboard API
    status, body = make_request(f"/api/dashboard", token=staff_token)
    print(f"\n[GET /api/dashboard] Staff view: {status}")
    print(f"  Total Projects: {body['total_projects']}")
    print(f"  Active Projects: {body['active_projects']}")
    print(f"  Upcoming Deadlines Count: {len(body['upcoming_deadlines'])}")
    print(f"  Recent Activity Log Count: {len(body['recent_activity'])}")
    assert status == 200
    
    # 11. Security Test - Student attempting Staff Action
    status, body = make_request(f"/api/students", token=student_token)
    print(f"\n[GET /api/students] Student Attempt: {status}")
    assert status == 403

    print("\n==================================================")
    print("  ALL API INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
