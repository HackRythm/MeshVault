"""
DOM Generator for MeshVault
Generates the exact rendered HTML DOM structure for both Staff and Student dashboards
by combining the HTML templates, CSS layout rules, and actual database values.
"""

import os
import sys
import json
import urllib.request

BASE_URL = "http://localhost:8000"

def login(email, password):
    try:
        url = f"{BASE_URL}/api/auth/login"
        data = json.dumps({"email": email, "password": password}).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode("utf-8"))
            if res.get("success"):
                return res.get("token")
    except Exception as e:
        print(f"Login failed for {email}: {e}")
    return None

def fetch_data(path, token=None):
    try:
        url = f"{BASE_URL}{path}"
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"Error fetching data from {path}: {e}")
        return None

# Sidebar layout template
def render_sidebar(role):
    core_items = [
        ("📊", "Dashboard", "/dashboard", True),
        ("📂", "Workspace", "/workspace", False),
        ("👥", "Groups", "/groups", False),
        ("📁", "Projects", "/projects", False),
        ("🔍", "Smart Search", "/search", False)
    ]
    dsa_items = [
        ("⚡", "Priority Engine", "/priority-engine", False),
        ("📈", "Progress Analytics", "/progress-analytics", False),
        ("⏱️", "Sprint Optimizer", "/sprint-optimizer", False),
        ("📜", "Audit Trail", "/audit-trail", False),
        ("🧪", "Algorithm Lab", "/algorithm-lab", False)
    ]
    
    sb = ['<aside class="sidebar">',
          '  <div class="sidebar__brand">',
          '    <div class="sidebar__logo">MV</div>',
          '    <h1 class="sidebar__title">MeshVault</h1>',
          '  </div>',
          '  <nav style="flex: 1;">',
          '    <div class="sidebar__section-label">Core Modules</div>',
          '    <ul class="sidebar__nav">']
    
    for icon, label, path, active in core_items:
        cls = "sidebar__link sidebar__link--active" if active else "sidebar__link"
        sb.append(f'      <li><a href="{path}" class="{cls}"><span class="sidebar__icon">{icon}</span><span>{label}</span></a></li>')
        
    sb.extend(['    </ul>',
               '    <ul class="sidebar__nav" style="margin-top: 16px;">'])
               
    for icon, label, path, active in dsa_items:
        cls = "sidebar__link sidebar__link--active" if active else "sidebar__link"
        sb.append(f'      <li><a href="{path}" class="{cls}"><span class="sidebar__icon">{icon}</span><span>{label}</span></a></li>')
        
    sb.extend(['    </ul>',
               '  </nav>',
               '  <div class="sidebar__bottom">',
               '    <div class="sidebar__nav">',
               '      <a href="/profile" class="sidebar__link"><span class="sidebar__icon">👤</span><span>Profile</span></a>',
               f'      <button class="sidebar__link" style="width: 100%; background: none; border: none; text-align: left; cursor: pointer;"><span class="sidebar__icon">🚪</span><span>Logout</span></button>',
               '    </div>',
               '  </div>',
               '</aside>'])
    return '\n'.join(sb)

# Navbar layout template
def render_navbar(user_name, role, user_id):
    avatar_initials = ''.join([n[0] for n in user_name.split()]).upper()[:2]
    return f"""<header class="navbar">
  <h2 class="navbar__title">Dashboard</h2>
  <div class="navbar__right">
    <div class="navbar__user">
      <div class="navbar__avatar">{avatar_initials}</div>
      <div>
        <div class="navbar__name">{user_name}</div>
        <div class="navbar__role">{role} • {user_id}</div>
      </div>
    </div>
  </div>
</header>"""

# Render upcoming deadlines table
def render_deadlines(deadlines):
    if not deadlines:
        return """<div class="empty-state">
  <div class="empty-state__icon">📅</div>
  <h4 class="empty-state__title">No upcoming deadlines</h4>
  <p class="empty-state__text">All active projects are on track with no immediate deadlines.</p>
</div>"""
    
    rows = []
    for p in deadlines:
        deadline_str = p['deadline']
        rows.append(f"""          <tr>
            <td><a href="/projects/{p['project_id']}" style="font-weight: 600;">{p['project_id']}</a></td>
            <td>{p['name']}</td>
            <td>{p['group_name']}</td>
            <td>{deadline_str}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="min-width: 32px; text-align: right; font-size: 11.5px;">{int(p['progress'])}%</span>
                <div class="progress-bar" style="width: 60px;">
                  <div class="progress-bar__fill" style="width: {p['progress']}%"></div>
                </div>
              </div>
            </td>
          </tr>""")
    
    return f"""<div class="table-wrapper">
  <table class="data-table">
    <thead>
      <tr>
        <th>Project ID</th>
        <th>Project Name</th>
        <th>Group</th>
        <th>Deadline</th>
        <th>Progress</th>
      </tr>
    </thead>
    <tbody>
{"".join(rows)}
    </tbody>
  </table>
</div>"""

# Render recent activities list
def render_activities(activities):
    if not activities:
        return """<div class="empty-state">
  <div class="empty-state__icon">🔔</div>
  <h4 class="empty-state__title">No activity recorded</h4>
  <p class="empty-state__text">No actions have been registered for this workspace yet.</p>
</div>"""
    
    items = []
    for a in activities:
        message = a['message'].replace("'", "")
        proj_link = f' for <a href="/projects/{a["project_id"]}" style="font-weight: 500;">{a["project_id"]}</a>' if a.get("project_id") else ""
        items.append(f"""      <div class="activity-item">
        <div class="activity-item__dot"></div>
        <div class="activity-item__content">
          <p class="activity-item__message">
            <strong>{a['user_name']}</strong> {message}{proj_link}
          </p>
          <span class="activity-item__meta">{a['created_at']}</span>
        </div>
      </div>""")
      
    return '\n'.join(items)

# Full document assembler
def assemble_dom(user_name, role, user_id, stats):
    sidebar = render_sidebar(role)
    navbar = render_navbar(user_name, role, user_id)
    deadlines = render_deadlines(stats.get('upcoming_deadlines', []))
    activities = render_activities(stats.get('recent_activity', []))
    
    students_label = "Total Students Registered" if role == "STAFF" else "Group Members"
    
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MeshVault — {role.title()} Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* Injected layout styles for previewing */
    :root {{
      --bg-primary: #0a0a0f;
      --bg-secondary: #111118;
      --bg-card: #16162a;
      --bg-card-hover: #1e1e38;
      --bg-sidebar: #0d0d14;
      --bg-input: #1a1a2e;
      --bg-navbar: rgba(12, 12, 20, 0.88);
      --text-primary: #f0f0f5;
      --text-secondary: #a0a0b8;
      --text-muted: #6b6b80;
      --text-accent: #a29bfe;
      --accent: #6c5ce7;
      --accent-light: #a29bfe;
      --accent-gradient: linear-gradient(135deg, #6c5ce7, #a29bfe);
      --accent-glow: rgba(108, 92, 231, 0.15);
      --clr-success: #00cec9;
      --clr-warning: #fdcb6e;
      --clr-error: #ff6b6b;
      --clr-info: #74b9ff;
      --border: rgba(255, 255, 255, 0.06);
      --sidebar-w: 260px;
      --navbar-h: 64px;
      --radius: 12px;
      --radius-sm: 8px;
    }}
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      font-size: 14px;
      height: 100vh;
      overflow: hidden;
    }}
    a {{ color: var(--accent-light); text-decoration: none; }}
    .app-layout {{ display: flex; height: 100vh; }}
    .app-layout__content {{ flex: 1; display: flex; flex-direction: column; overflow: hidden; }}
    .app-layout__main {{ flex: 1; overflow-y: auto; padding: 28px 32px; }}
    
    /* Sidebar */
    .sidebar {{ width: var(--sidebar-w); background: var(--bg-sidebar); border-right: 1px solid var(--border); display: flex; flex-direction: column; }}
    .sidebar__brand {{ padding: 24px 20px 20px; display: flex; align-items: center; gap: 12px; }}
    .sidebar__logo {{ width: 36px; height: 36px; background: var(--accent-gradient); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff; }}
    .sidebar__title {{ font-size: 18px; font-weight: 700; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
    .sidebar__section-label {{ padding: 16px 20px 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: var(--text-muted); }}
    .sidebar__nav {{ list-style: none; padding: 0 8px; }}
    .sidebar__link {{ display: flex; align-items: center; gap: 12px; padding: 10px 12px; margin: 2px 0; border-radius: var(--radius-sm); color: var(--text-secondary); text-decoration: none; font-weight: 500; }}
    .sidebar__link--active {{ background: var(--accent-glow); color: var(--accent-light); }}
    .sidebar__icon {{ font-size: 16px; }}
    .sidebar__bottom {{ margin-top: auto; padding: 12px 8px 16px; border-top: 1px solid var(--border); }}
    
    /* Navbar */
    .navbar {{ height: var(--navbar-h); background: var(--bg-navbar); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 32px; }}
    .navbar__title {{ font-size: 18px; font-weight: 600; }}
    .navbar__right {{ display: flex; align-items: center; gap: 16px; }}
    .navbar__user {{ display: flex; align-items: center; gap: 10px; }}
    .navbar__avatar {{ width: 34px; height: 34px; border-radius: 50%; background: var(--accent-gradient); display: flex; align-items: center; justify-content: center; font-weight: 600; color: #fff; }}
    .navbar__name {{ font-weight: 500; font-size: 13px; }}
    .navbar__role {{ font-size: 11px; color: var(--text-muted); }}
    
    /* Cards */
    .card {{ background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }}
    .grid {{ display: grid; gap: 20px; }}
    .grid--4 {{ grid-template-columns: repeat(4, 1fr); }}
    .stat-card {{ background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; display: flex; flex-direction: column; gap: 8px; }}
    .stat-card__icon {{ width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }}
    .stat-card__value {{ font-size: 28px; font-weight: 700; }}
    .stat-card__label {{ font-size: 12px; color: var(--text-muted); font-weight: 500; }}
    
    /* Progress */
    .progress-bar {{ height: 6px; background: rgba(255,255,255,.06); border-radius: 3px; overflow: hidden; }}
    .progress-bar__fill {{ height: 100%; background: var(--accent-gradient); }}
    
    /* Tables */
    .table-wrapper {{ overflow-x: auto; }}
    .data-table {{ width: 100%; border-collapse: collapse; }}
    .data-table th {{ text-align: left; padding: 10px 16px; font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); }}
    .data-table td {{ padding: 12px 16px; font-size: 13px; border-bottom: 1px solid var(--border); }}
    
    /* Activity Items */
    .activity-item {{ display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }}
    .activity-item__dot {{ width: 8px; height: 8px; border-radius: 50%; background: var(--accent); margin-top: 6px; }}
    .activity-item__meta {{ font-size: 11px; color: var(--text-muted); margin-top: 2px; }}
  </style>
</head>
<body>
  <div class="app-layout">
{sidebar}
    <div class="app-layout__content">
{navbar}
      <main class="app-layout__main">
        <div class="page-header" style="margin-bottom: 24px;">
          <h1 class="page-header__title">Welcome back, {user_name}</h1>
          <p class="page-header__subtitle" style="color: var(--text-secondary); margin-top: 4px;">Here is the current academic tracking status.</p>
        </div>
        
        <div class="grid grid--4" style="margin-bottom: 24px;">
          <div class="stat-card">
            <div class="stat-card__icon" style="background: rgba(116, 185, 255, 0.1); color: var(--clr-info);">👥</div>
            <div class="stat-card__value">{stats.get('total_groups', 0)}</div>
            <div class="stat-card__label">Total Assigned Groups</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__icon" style="background: rgba(0, 206, 201, 0.1); color: var(--clr-success);">🎓</div>
            <div class="stat-card__value">{stats.get('total_students', 0)}</div>
            <div class="stat-card__label">{students_label}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__icon" style="background: rgba(108, 92, 231, 0.15); color: var(--accent-light);">📁</div>
            <div class="stat-card__value">{stats.get('total_projects', 0)}</div>
            <div class="stat-card__label">Total Projects Tracked</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__icon" style="background: rgba(253, 203, 110, 0.1); color: var(--clr-warning);">📈</div>
            <div class="stat-card__value">{stats.get('active_projects', 0)}</div>
            <div class="stat-card__label">Active Projects (In Progress)</div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px;">
          <div class="card">
            <h3 style="font-size: 16px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <span>⏳</span> Upcoming Deadlines
            </h3>
{deadlines}
          </div>
          
          <div class="card">
            <h3 style="font-size: 16px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <span>🔔</span> Recent Activities
            </h3>
            <div style="display: flex; flex-direction: column;">
{activities}
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</body>
</html>"""

def generate():
    staff_token = login("s.mitchell@university.edu", "staff123")
    student_token = login("alex.chen@university.edu", "student123")

    # 1. Fetch Staff statistics (user_id=1, role=STAFF)
    staff_stats = fetch_data("/api/dashboard?user_id=1&role=STAFF", token=staff_token)
    
    # 2. Fetch Student statistics (user_id=2, role=STUDENT)
    student_stats = fetch_data("/api/dashboard?user_id=2&role=STUDENT", token=student_token)
    
    if not staff_stats or not student_stats:
        print("Backend server must be running to fetch actual stats. Aborting DOM creation.")
        return
        
    staff_dom = assemble_dom("Dr. Sarah Mitchell", "STAFF", "STAFF-001", staff_stats)
    student_dom = assemble_dom("Alex Chen", "STUDENT", "STU-001", student_stats)
    
    with open("staff_dom.html", "w", encoding="utf-8") as f:
        f.write(staff_dom)
    print("Generated d:\\Meshvault\\backend\\staff_dom.html successfully.")
        
    with open("student_dom.html", "w", encoding="utf-8") as f:
        f.write(student_dom)
    print("Generated d:\\Meshvault\\backend\\student_dom.html successfully.")

if __name__ == "__main__":
    generate()
