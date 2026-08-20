# MeshVault 📂🔒

MeshVault is a premium **Academic Project Management System** designed for computer science students and academic staff. Built to manage student groups and projects for courses like Data Structures & Algorithms, MeshVault uses **custom DSA engines implemented from scratch** to optimize search, analytics, and review management.

---

## 🚀 Key Features

### 1. Custom DSA Engines (Python)
Instead of relying solely on database queries, MeshVault implements core operations using custom, memory-resident data structures in Python (`backend/dsa_engine.py`):
*   **Smart Search Index (`ProjectSearchIndex`)**: A hash-table based search index providing $O(1)$ exact name/ID searches and partial substring matches using a pre-computed fragment index.
*   **Progress Explorer (`ProgressBST`)**: A Binary Search Tree (BST) organizing project data by completion progress. Enables $O(\log n)$ average-case inserts, lookups, and range searches for analytics.
*   **Staff Review Queue (`ReviewQueue`)**: A first-in, first-out (FIFO) queue managing pending student project updates for staff evaluation with $O(1)$ enqueue and dequeue operations.

### 2. Comprehensive Academic Workspace
*   **Workspaces**: Create course-specific workspaces (e.g., *CS201: Data Structures & Algorithms*).
*   **Student Groups**: Organize students into collaborative teams (e.g., *Team Alpha*, *Team Beta*).
*   **Project Tracking**: Manage manual project IDs, priorities (Low, Medium, High), status updates, and due dates.
*   **Milestones**: Log incremental goals (Pending, In Progress, Completed).
*   **Activity Audit Logs**: Trace a chronological history of changes made by users.

---

## 🛠️ Technology Stack

### Backend
*   **Framework**: FastAPI (Python 3)
*   **Database**: SQLite with SQLAlchemy ORM
*   **Authentication & Security**: Bcrypt password hashing
*   **Validation**: Pydantic v2
*   **Server**: Uvicorn

### Frontend
*   **Framework**: React (v18)
*   **Build Tool**: Vite
*   **Routing**: React Router DOM (v6)
*   **Styling**: Custom modern Vanilla CSS (featuring premium dark mode components, responsive glassmorphic cards, and micro-interactions)

---

## 📁 Repository Structure

```text
Meshvault/
├── backend/
│   ├── main.py             # FastAPI backend server & DSA initialization
│   ├── routes.py           # API endpoints for groups, workspaces, projects, and queues
│   ├── models.py           # SQLAlchemy database schemas (7 core entities)
│   ├── schemas.py          # Pydantic validation schemas
│   ├── dsa_engine.py       # Custom Hash Table, BST, and Queue implementations
│   ├── database.py         # SQLAlchemy engine & session configuration
│   ├── seed.py             # Database seed script for development environments
│   ├── verify.py           # Verification script to test database & DSA logic
│   └── requirements.txt    # Python package dependencies
│
├── frontend/
│   ├── index.html          # Application entry HTML
│   ├── vite.config.js      # Vite build configuration
│   ├── package.json        # Node.js dependencies & scripts
│   └── src/
│       ├── main.jsx        # React entry file
│       ├── App.jsx         # Component routing configurations
│       ├── index.css       # Core design system and CSS styling tokens
│       ├── pages/          # Layout views (Dashboard, Projects, ReviewQueue, etc.)
│       ├── components/     # Reusable layout and interactive elements
│       ├── context/        # React context providers (AuthContext, etc.)
│       └── services/       # Axios API client services
```

---

## ⚙️ Installation & Running the Project

### Prerequisites
*   Python 3.8 or higher installed.
*   Node.js (v16+) and npm installed.

### 1. Setup the Backend
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Seed the database with default workspace, user, and project records:
    ```bash
    python seed.py
    ```
4.  Run the verification script to confirm everything is set up correctly:
    ```bash
    python verify.py
    ```
5.  Start the local server:
    ```bash
    uvicorn main:app --reload
    ```
    *The backend server runs at `http://localhost:8000`.*

### 2. Setup the Frontend
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install npm modules:
    ```bash
    npm install
    ```
3.  Launch the development server:
    ```bash
    npm run dev
    ```
    *The Vite React frontend will run at `http://localhost:5173` (or similar port).*

---

## 🔑 Seeded Credentials

Use the following credentials to log in to MeshVault:

| Role | Email | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Academic Staff** | `s.mitchell@university.edu` | `staff123` | Accesses the staff dashboard, reviews queues, and manages workspaces/milestones. |
| **Student** | `alex.chen@university.edu` | `student123` | Accesses student workspace, views project analytics, and requests reviews. |
| **Student** | `maya.johnson@university.edu` | `student123` | Alternative student account. |
| **Student** | `ryan.patel@university.edu` | `student123` | Alternative student account. |

*(Students STU-001 through STU-006 are all initialized with the password `student123`.)*
