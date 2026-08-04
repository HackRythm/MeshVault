# MeshVault — Academic Project Manager

A scalable MERN + Python FastAPI hybrid web application for academic project management, featuring 5 DSA engines for compute-heavy operations.

## 🏗 Architecture

```
MeshVault/
├── frontend/          React + Vite + Tailwind CSS v3  (port 5173)
├── backend-node/      Express.js + MongoDB Gateway    (port 5000)
└── backend-python/    FastAPI DSA Microservice        (port 8000)
```

### Data Flow
```
React Frontend ──→ Node.js Gateway (Auth, CRUD, MongoDB)
                ──→ Python FastAPI  (DSA Computations)
```

## ⚡ 5 DSA Engines (Python)

| Engine | Data Structure | Use Case |
|--------|---------------|----------|
| **MinHeap PQ** | Min-Heap Priority Queue | Upcoming review deadlines sorted by urgency |
| **AVL Tree** | Balanced BST | Chronological log indexing with O(log n) ops |
| **Merkle Tree** | SHA-256 Hash Tree | Tamper-proof bi-weekly log verification |
| **Knapsack DP** | 0-1 Knapsack | Sprint task allocator (maximize value in capacity) |
| **Trie** | Prefix Tree | Autocomplete / prefix search for projects |

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20.x+
- **Python** 3.10+
- **MongoDB** (local or Atlas)

### 1. Start Python DSA Engine
```bash
cd backend-python
pip install -r requirements.txt
python main.py
# → http://localhost:8000/health
```

### 2. Start Node.js Gateway
```bash
cd backend-node
npm install
cp .env.example .env  # Edit MongoDB URI if needed
npm run dev
# → http://localhost:5000/health
```

### 3. Start React Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## 🎨 Design System

- **Theme**: Slate-Blue Dark Mode
- **Canvas**: `#0F172A` (Deep Charcoal)
- **Surfaces**: `#1E293B` (Dark Slate Navy)
- **Borders**: `#334155` (Subtle Slate)
- **Accent**: `#3B82F6` (Electric Blue)
- **Success**: `#10B981` (Mint Green)
- **Alert**: `#EF4444` (Coral Red)
- **Fonts**: Inter (body), Space Grotesk (labels/mono)

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS v3, Axios, React Icons |
| Node Gateway | Express 4, Mongoose 8, JWT, bcryptjs, CORS |
| Python Engine | FastAPI, Pydantic v2, Uvicorn |
| Database | MongoDB |

---

Built with 🧠 by MeshVault Team • Advanced DSA Course Project
