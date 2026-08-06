# 🛡️ MeshVault — Academic Project Manager

A scalable MERN + Python FastAPI hybrid web application for academic project management, featuring a **2-Phase Data Structure & Algorithm Engine** tailored for academic evaluation milestones.

---

## 🏗 System Architecture

```
MeshVault/
├── frontend/          React + Vite + Tailwind CSS v3  (port 5173)
├── backend-node/      Express.js + MongoDB Gateway    (port 5000)
└── backend-python/    FastAPI DSA Microservice        (port 8000)
```

```
React Frontend ──→ Node.js Gateway (Auth, CRUD, MongoDB)
                ──→ Python FastAPI  (DSA Computations)
```

---

## ⚡ 2-Phase DSA Evaluation System

MeshVault organizes its computing engines into two distinct phases to support progressive academic evaluation:

### 🔹 Phase 1: Mid-Sem Evaluation (Fundamental Light DSAs)
| Engine | Data Structure | Purpose & Application |
|--------|---------------|-----------------------|
| **Audit Stack** | Stack (LIFO) | Action history, recent activity tracking & single-step undo operations |
| **Task Queue** | Queue (FIFO) | Sequential task scheduling & lightweight greedy sprint task allocation |
| **Activity Feed** | Doubly LinkedList | Bi-directional chronological activity feed & navigation history trail |
| **Log BST** | Simple BST | Unbalanced Binary Search Tree for timestamp-based log indexing |
| **Deadlines PQ** | Min-Heap Priority Queue | Urgent project review deadline ranking (earliest unix timestamp first) |

### 🔸 Phase 2: End-Sem Evaluation (Advanced DSAs & Optimization Roadmap)
| Engine | Data Structure | Purpose & Application |
|--------|---------------|-----------------------|
| **AVL Tree** | Self-Balancing BST | Height-balanced tree log indexing with guaranteed $O(\log N)$ rotations |
| **Merkle Tree** | SHA-256 Hash Tree | Cryptographic log integrity & bi-weekly submission tamper verification |
| **Sprint DP** | 0-1 Knapsack DP | Dynamic programming multi-task allocation maximizing total priority score |
| **Trie Autocomplete** | Prefix Tree | Character-by-character sub-linear search term & tag suggestions |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20.x+
- **Python** 3.10+
- **MongoDB** (Local or Atlas)

### 1. Start Python DSA Microservice
```bash
cd backend-python
pip install -r requirements.txt
python main.py
# → Health Check: http://localhost:8000/health
# → Phase Info: http://localhost:8000/api/dsa/phase-info
```

### 2. Start Node.js Express Gateway
```bash
cd backend-node
npm install
npm run dev
# → Health Check: http://localhost:5000/health
```

### 3. Start React Frontend Web Application
```bash
cd frontend
npm install
npm run dev
# → Web App: http://localhost:5173
```

---

## 🎨 Design System
- **Theme**: Slate-Blue Dark Mode
- **Canvas**: `#0F172A` (Deep Charcoal)
- **Surfaces**: `#1E293B` (Dark Slate Navy)
- **Borders**: `#334155` (Subtle Slate)
- **Accent**: `#3B82F6` (Electric Blue)
- **Success**: `#10B981` (Mint Green)
- **Alert**: `#EF4444` (Coral Red)

---

Built with 🧠 by MeshVault Team • Advanced DSA Course Project
