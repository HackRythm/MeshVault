"""
MeshVault Phase 3 Integration Tests
Tests workspace-scoped review comments, grading history,
student restrictions, cross-workspace isolation, and access control.

Run: python test_p3.py
"""
import sys
import json
import requests

BASE = "http://localhost:8000/api"

PASS = 0
FAIL = 0

def ok(msg):
    global PASS
    PASS += 1
    print(f"  [PASS] {msg}")

def fail(msg, detail=""):
    global FAIL
    FAIL += 1
    print(f"  [FAIL] {msg}", f"({detail})" if detail else "")

def login(email, password):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password})
    data = r.json()
    if data.get("success"):
        return data["user"]["id"], r.headers.get("Authorization", "").replace("Bearer ", "") or data.get("token", "")
    # Extract token from cookie or response
    return None, None

def get_token(email, password):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password})
    d = r.json()
    if not d.get("success"):
        return None
    return d.get("token") or d["user"].get("token")

def headers(token):
    return {"Authorization": f"Bearer {token}"}


# ─── Bootstrap: get tokens and IDs ───────────────────────────────────────────
print("\n=== Phase 3 Tests: Workspace-Scoped Comments & Grading ===\n")

# Staff token
sr = requests.post(f"{BASE}/auth/login", json={"email": "s.mitchell@university.edu", "password": "staff123"})
sd = sr.json()
if not sd.get("success"):
    print("FATAL: Staff login failed —", sd)
    sys.exit(1)
STAFF_TOKEN = sd.get("token")
STAFF_ID = sd["user"]["id"]
print(f"[setup] Staff: {sd['user']['name']} (id={STAFF_ID})")

# Student token
st_r = requests.post(f"{BASE}/auth/login", json={"email": "alex.chen@university.edu", "password": "student123"})
st_d = st_r.json()
if not st_d.get("success"):
    print("FATAL: Student login failed —", st_d)
    sys.exit(1)
STU_TOKEN = st_d.get("token")
STU_ID = st_d["user"]["id"]
print(f"[setup] Student: {st_d['user']['name']} (id={STU_ID})")

SH = headers(STAFF_TOKEN)
TH = headers(STU_TOKEN)

# Get workspaces
ws_r = requests.get(f"{BASE}/workspaces", headers=SH)
workspaces = ws_r.json()
if not workspaces:
    print("FATAL: No workspaces found. Run seed.py first.")
    sys.exit(1)
WS = workspaces[0]
WS_ID = WS["id"]
print(f"[setup] Workspace: {WS['name']} (id={WS_ID}, code={WS.get('join_code', 'N/A')})")

# Get a project in this workspace
proj_r = requests.get(f"{BASE}/projects", headers=SH)
projects = proj_r.json()
if not projects:
    print("FATAL: No projects found.")
    sys.exit(1)
PROJ = projects[0]
PROJ_ID = PROJ["project_id"]
print(f"[setup] Project: {PROJ['name']} (id={PROJ_ID})\n")


# ─────────────────────────────────────────────────────────────────────────────
# 1. WORKSPACE-SCOPED COMMENTS
# ─────────────────────────────────────────────────────────────────────────────
print("--- 1. Review Comments ---")

# 1a. Student cannot post a top-level comment
r = requests.post(f"{BASE}/workspaces/{WS_ID}/projects/{PROJ_ID}/comments",
                  json={"comment": "student trying to comment"},
                  headers=TH)
if r.status_code == 403:
    ok("Student cannot post top-level review comment (403)")
else:
    fail("Student should get 403 when posting comment", f"got {r.status_code}: {r.text[:100]}")

# 1b. Faculty can post a comment
r = requests.post(f"{BASE}/workspaces/{WS_ID}/projects/{PROJ_ID}/comments",
                  json={"comment": "Please improve the documentation."},
                  headers=SH)
if r.status_code == 201:
    comment = r.json()
    COMMENT_ID = comment["id"]
    ok(f"Faculty can post review comment (id={COMMENT_ID})")
    if comment.get("is_faculty"):
        ok("Comment correctly flagged as is_faculty=true")
    else:
        fail("Comment should have is_faculty=true", str(comment))
else:
    fail("Faculty should get 201 when posting comment", f"{r.status_code}: {r.text[:100]}")
    COMMENT_ID = None

# 1c. Student can read workspace comments
r = requests.get(f"{BASE}/workspaces/{WS_ID}/projects/{PROJ_ID}/comments", headers=TH)
if r.status_code == 200:
    data = r.json()
    ok(f"Student can read workspace comments ({len(data)} comment(s))")
else:
    fail("Student should be able to read workspace comments", f"{r.status_code}: {r.text[:100]}")

# 1d. Student can reply to a faculty comment
if COMMENT_ID:
    r = requests.post(f"{BASE}/workspaces/{WS_ID}/projects/{PROJ_ID}/comments/{COMMENT_ID}/reply",
                      json={"comment": "Sure, we'll update it."},
                      headers=TH)
    if r.status_code == 201:
        reply = r.json()
        ok(f"Student can reply to faculty comment (reply_id={reply['id']})")
        if reply.get("parent_comment_id") == COMMENT_ID:
            ok("Reply correctly linked to parent comment")
        else:
            fail("Reply parent_comment_id mismatch", str(reply))
    else:
        fail("Student should get 201 when replying", f"{r.status_code}: {r.text[:100]}")

# 1e. Faculty can reply too
if COMMENT_ID:
    r = requests.post(f"{BASE}/workspaces/{WS_ID}/projects/{PROJ_ID}/comments/{COMMENT_ID}/reply",
                      json={"comment": "Good. Please also add API examples."},
                      headers=SH)
    if r.status_code == 201:
        ok("Faculty can also reply to a comment")
    else:
        fail("Faculty reply should return 201", f"{r.status_code}: {r.text[:100]}")

# 1f. Verify replies are returned nested
r = requests.get(f"{BASE}/workspaces/{WS_ID}/projects/{PROJ_ID}/comments", headers=SH)
if r.status_code == 200:
    comments_data = r.json()
    if comments_data and len(comments_data[0].get("replies", [])) >= 1:
        ok(f"Replies returned nested in comment ({len(comments_data[0]['replies'])} reply/replies)")
    else:
        fail("Expected replies nested in comment", str(comments_data))
else:
    fail("Cannot read comments", f"{r.status_code}")

# 1g. Unauthorized user gets 403 on comments
r = requests.get(f"{BASE}/workspaces/{WS_ID}/projects/{PROJ_ID}/comments")
if r.status_code in (401, 403):
    ok("Unauthenticated user gets 401/403 on comments")
else:
    fail("Unauthenticated user should be blocked", f"got {r.status_code}")


# ─────────────────────────────────────────────────────────────────────────────
# 2. GRADING / EVALUATION
# ─────────────────────────────────────────────────────────────────────────────
print("\n--- 2. Grading / Evaluation ---")

# 2a. Student cannot access evaluations
r = requests.get(f"{BASE}/workspaces/{WS_ID}/projects/{PROJ_ID}/evaluations", headers=TH)
if r.status_code == 403:
    ok("Student cannot access grading history (403)")
else:
    fail("Student should get 403 on evaluations list", f"got {r.status_code}: {r.text[:100]}")

# 2b. Student cannot submit evaluation
r = requests.post(f"{BASE}/workspaces/{WS_ID}/projects/{PROJ_ID}/evaluations",
                  json={"score": 100, "max_score": 100, "notes": "trying to self-grade"},
                  headers=TH)
if r.status_code == 403:
    ok("Student cannot submit evaluation (403)")
else:
    fail("Student should get 403 when submitting eval", f"got {r.status_code}: {r.text[:100]}")

# 2c. Student cannot access latest evaluation
r = requests.get(f"{BASE}/workspaces/{WS_ID}/projects/{PROJ_ID}/evaluations/latest", headers=TH)
if r.status_code == 403:
    ok("Student cannot access latest evaluation (403)")
else:
    fail("Student should get 403 on latest eval", f"got {r.status_code}: {r.text[:100]}")

# 2d. Faculty can submit an evaluation
r = requests.post(f"{BASE}/workspaces/{WS_ID}/projects/{PROJ_ID}/evaluations",
                  json={"score": 72, "max_score": 100, "notes": "Good initial effort, needs more documentation."},
                  headers=SH)
if r.status_code == 201:
    ev1 = r.json()
    ok(f"Faculty can submit evaluation: {ev1['score']}/{ev1['max_score']}")
else:
    fail("Faculty eval submit should return 201", f"{r.status_code}: {r.text[:100]}")
    ev1 = None

# 2e. Faculty submits a second evaluation (grading history)
r = requests.post(f"{BASE}/workspaces/{WS_ID}/projects/{PROJ_ID}/evaluations",
                  json={"score": 81, "max_score": 100, "notes": "Documentation improved significantly."},
                  headers=SH)
if r.status_code == 201:
    ev2 = r.json()
    ok(f"Faculty can submit second evaluation: {ev2['score']}/{ev2['max_score']}")
else:
    fail("Second faculty eval should return 201", f"{r.status_code}: {r.text[:100]}")
    ev2 = None

# 2f. Grading history is preserved (both records exist)
r = requests.get(f"{BASE}/workspaces/{WS_ID}/projects/{PROJ_ID}/evaluations", headers=SH)
if r.status_code == 200:
    evals = r.json()
    if len(evals) >= 2:
        ok(f"Grading history preserved: {len(evals)} records found (not overwritten)")
    else:
        fail(f"Expected >= 2 evaluation records, got {len(evals)}")
else:
    fail("Cannot fetch evaluation history", f"{r.status_code}")

# 2g. Latest evaluation returns most recent record
r = requests.get(f"{BASE}/workspaces/{WS_ID}/projects/{PROJ_ID}/evaluations/latest", headers=SH)
if r.status_code == 200:
    latest = r.json()
    if latest and ev2 and latest["score"] == ev2["score"]:
        ok(f"Latest evaluation correctly returns most recent score ({latest['score']})")
    else:
        fail("Latest eval should be most recent", f"got {latest}")
else:
    fail("Cannot fetch latest evaluation", f"{r.status_code}")

# 2h. Score validation: cannot exceed max_score
r = requests.post(f"{BASE}/workspaces/{WS_ID}/projects/{PROJ_ID}/evaluations",
                  json={"score": 150, "max_score": 100},
                  headers=SH)
if r.status_code == 400:
    ok("Score > max_score correctly rejected (400)")
else:
    fail("Score > max_score should return 400", f"got {r.status_code}")

# 2i. Negative score rejected
r = requests.post(f"{BASE}/workspaces/{WS_ID}/projects/{PROJ_ID}/evaluations",
                  json={"score": -5, "max_score": 100},
                  headers=SH)
if r.status_code == 400:
    ok("Negative score correctly rejected (400)")
else:
    fail("Negative score should return 400", f"got {r.status_code}")


# ─────────────────────────────────────────────────────────────────────────────
# 3. GRADING SCHEME WEIGHT VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
print("\n--- 3. Grading Scheme Weights ---")

# 3a. Invalid weight total rejected
r = requests.post(f"{BASE}/workspaces/{WS_ID}/grading-scheme",
                  json={"criteria": [
                      {"name": "Implementation", "max_marks": 40, "weight": 40},
                      {"name": "Documentation", "max_marks": 20, "weight": 30},
                  ]},
                  headers=SH)
if r.status_code == 400:
    ok("Weight sum != 100% correctly rejected (400)")
else:
    fail("Invalid weight total should return 400", f"got {r.status_code}: {r.text[:100]}")

# 3b. 100% weight sum accepted
r = requests.post(f"{BASE}/workspaces/{WS_ID}/grading-scheme",
                  json={"criteria": [
                      {"name": "Implementation", "max_marks": 40, "weight": 40},
                      {"name": "Documentation", "max_marks": 20, "weight": 20},
                      {"name": "Code Quality", "max_marks": 20, "weight": 20},
                      {"name": "Presentation", "max_marks": 20, "weight": 20},
                  ]},
                  headers=SH)
if r.status_code == 200:
    ok("Grading scheme with 100% weights accepted")
else:
    fail("100% weight sum should be accepted", f"got {r.status_code}: {r.text[:100]}")


# ─────────────────────────────────────────────────────────────────────────────
# 4. WORKSPACE-SCOPED PROJECT DETAIL
# ─────────────────────────────────────────────────────────────────────────────
print("\n--- 4. Workspace-Scoped Project Detail ---")

r = requests.get(f"{BASE}/workspaces/{WS_ID}/projects/{PROJ_ID}", headers=SH)
if r.status_code == 200:
    detail = r.json()
    ok(f"Faculty can get workspace-scoped project detail (name={detail['name']})")
    if detail.get("members") is not None:
        ok(f"Project detail includes group members ({len(detail['members'])} member(s))")
    else:
        fail("Project detail should include members list")
    if detail.get("workspace_id") == WS_ID:
        ok("Workspace ID correctly scoped in response")
    else:
        fail("workspace_id mismatch in response", str(detail.get("workspace_id")))
    if "score" not in detail and "evaluations" not in detail:
        ok("Grading data NOT included in workspace project detail endpoint")
    else:
        fail("Grading data should NOT be in workspace project detail")
else:
    fail("Faculty should get 200 on workspace project detail", f"{r.status_code}: {r.text[:100]}")


# ─────────────────────────────────────────────────────────────────────────────
# 5. DASHBOARD (was broken before Phase 3 fixes)
# ─────────────────────────────────────────────────────────────────────────────
print("\n--- 5. Dashboard Regression ---")

r = requests.get(f"{BASE}/dashboard", headers=SH)
if r.status_code == 200:
    dash = r.json()
    ok(f"Staff dashboard returns 200 (total_projects={dash.get('total_projects')})")
else:
    fail("Staff dashboard should return 200", f"{r.status_code}: {r.text[:100]}")

r = requests.get(f"{BASE}/dashboard", headers=TH)
if r.status_code == 200:
    dash = r.json()
    ok(f"Student dashboard returns 200 (total_groups={dash.get('total_groups')})")
else:
    fail("Student dashboard should return 200", f"{r.status_code}: {r.text[:100]}")


# ─────────────────────────────────────────────────────────────────────────────
# 6. ACTIVITY REGRESSION
# ─────────────────────────────────────────────────────────────────────────────
print("\n--- 6. Activity Endpoints Regression ---")

r = requests.get(f"{BASE}/activities", headers=SH)
if r.status_code == 200:
    ok(f"Staff /activities returns 200 ({len(r.json())} items)")
else:
    fail("Staff activities should return 200", f"{r.status_code}: {r.text[:100]}")

r = requests.get(f"{BASE}/activities", headers=TH)
if r.status_code == 200:
    ok(f"Student /activities returns 200 ({len(r.json())} items)")
else:
    fail("Student activities should return 200", f"{r.status_code}: {r.text[:100]}")


# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{'='*50}")
print(f"  Results: {PASS} passed | {FAIL} failed")
print(f"{'='*50}\n")

if FAIL > 0:
    sys.exit(1)
