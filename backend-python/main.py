"""
MeshVault Mid-Sem FastAPI Microservice
====================================
REST API exposing lightweight Data Structure & Algorithm operations
for the Mid-Sem Evaluation:

Data Structures Implemented:
  1. Stack (LIFO - Action Undo & Audit Log Stack)
  2. Queue (FIFO - Sequential Task Queue & Greedy Sprint Allocator)
  3. Doubly LinkedList (Activity Feed Navigation Trail)
  4. Simple BST (Unbalanced Timestamp-based Log Indexing)
  5. Min-Heap Priority Queue (Urgent Deliverable Deadlines)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Any
import time

from dsa_engine import (
    Stack, Queue, DoublyLinkedList, SimpleBST, MinHeapPQ,
    AVLTree, MerkleTree, KnapsackDP, Trie
)

# ─── FastAPI App ──────────────────────────────────────────────────────

app = FastAPI(
    title="MeshVault Hybrid DSA Engine",
    description="Microservice providing Phase 1 & Phase 2 Data Structure & Algorithm operations",
    version="1.0.0"
)

# CORS — allow React frontend and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── In-Memory DSA Instances ─────────────────────────────────────────

# Phase 1 Light DSAs
audit_stack = Stack()
task_queue = Queue()
activity_dll = DoublyLinkedList()
simple_log_bst = SimpleBST()
deadline_queue = MinHeapPQ()

# Phase 2 Advanced DSAs
avl_log_tree = AVLTree()
merkle_engine = MerkleTree()
search_trie = Trie()

# Seed sample data for Mid-Sem & End-Sem demo
_sample_logs = [
    {"timestamp": 1700000000.0, "content": "Project MeshVault created", "project": "MeshVault", "user": "admin"},
    {"timestamp": 1700000100.0, "content": "Updated database schema", "project": "MeshVault", "user": "dev1"},
    {"timestamp": 1700000200.0, "content": "Added Mid-Sem DSA engines", "project": "MeshVault", "user": "dev2"},
]

for log in _sample_logs:
    simple_log_bst.insert(log["timestamp"], log)
    avl_log_tree.insert(log["timestamp"], log)
    audit_stack.push(log)
    activity_dll.append(log)

# Seed Trie search suggestions
_seed_terms = [
    "AVL Tree Implementation",
    "AVL Rotations (Single & Double)",
    "Binary Search Tree",
    "BST Traversal Algorithms",
    "Merkle Tree Verification",
    "SHA-256 Hash Integrity",
    "0-1 Knapsack DP",
    "Knapsack Sprint Optimization",
    "Priority Queue Deadlines",
    "Min-Heap Scheduling",
    "Stack Undo Engine",
    "Doubly LinkedList Activity Feed",
    "Queue Sequential Allocation",
    "Trie Autocomplete Search",
    "MeshVault Academic Manager",
    "Semester 3 Projects"
]
for term in _seed_terms:
    search_trie.insert(term)

# Initial Merkle Tree build
merkle_engine.build([log["content"] for log in _sample_logs])


# ─── Pydantic Models ─────────────────────────────────────────────────

class StackPushRequest(BaseModel):
    action: str
    details: Optional[dict] = None


class QueueItem(BaseModel):
    name: str
    weight: int = Field(..., ge=1, description="Hours required")
    value: int = Field(..., ge=1, description="Priority impact score")


class QueueBatchRequest(BaseModel):
    items: list[QueueItem]


class DeadlineItem(BaseModel):
    id: str
    title: str
    deadline: float = Field(..., description="Unix timestamp of the deadline")
    project: Optional[str] = None
    priority: Optional[str] = "medium"


class DeadlineBatch(BaseModel):
    items: list[DeadlineItem]


class LogEntry(BaseModel):
    timestamp: float = Field(..., description="Unix timestamp")
    content: str
    project: Optional[str] = None
    user: Optional[str] = None


class LogBatch(BaseModel):
    entries: list[LogEntry]


class RangeQuery(BaseModel):
    start: float
    end: float


class SprintOptimizeRequest(BaseModel):
    tasks: list[QueueItem]
    capacity: int = Field(..., ge=1, description="Sprint capacity in hours")


class MerkleBuildRequest(BaseModel):
    logs: list[str]


class MerkleVerifyRequest(BaseModel):
    logs: list[str]


class SearchInsertRequest(BaseModel):
    terms: list[str]


# ─── Health Check & Phase Metadata ─────────────────────────────────────

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "MeshVault Hybrid DSA Engine",
        "version": "1.0.0",
        "active_dsas": {
            "stack_size": audit_stack.size(),
            "queue_size": task_queue.size(),
            "linked_list_size": activity_dll.size(),
            "simple_bst_size": simple_log_bst.size(),
            "deadline_queue_size": deadline_queue.size(),
            "avl_tree_size": avl_log_tree.size(),
            "trie_size": search_trie.size(),
            "merkle_root": merkle_engine.root_hash
        }
    }


@app.get("/api/dsa/phase-info")
async def get_phase_info():
    """Return phase architectural breakdown for academic evaluation."""
    return {
        "evaluation_phase": "Phase 1 (Mid-Sem) & Phase 2 (End-Sem)",
        "active_light_dsas": [
            {"name": "Stack", "purpose": "LIFO Undo/Redo & Audit Log History Stack"},
            {"name": "Queue", "purpose": "FIFO Task Execution & Greedy Sprint Queue"},
            {"name": "Doubly LinkedList", "purpose": "Bi-directional Activity Navigation Trail"},
            {"name": "Simple BST", "purpose": "Timestamp-based Log Indexing without AVL rotations"},
            {"name": "Min-Heap PQ", "purpose": "Urgent Review Deadlines Priority Queue"}
        ],
        "active_advanced_dsas": [
            {"name": "AVL Tree", "purpose": "Self-Balancing Height Log Indexing O(log N)"},
            {"name": "Merkle Tree", "purpose": "SHA-256 Cryptographic Log Verification"},
            {"name": "0-1 Knapsack DP", "purpose": "Optimal Sprint Task Scheduler"},
            {"name": "Trie Tree", "purpose": "Sub-linear Prefix Search Autocomplete"}
        ]
    }


# =======================================================================
#  MID-SEM LIGHT DSA ENDPOINTS (PHASE 1)
# =======================================================================

@app.post("/api/dsa/midsem/stack/push")
async def stack_push(request: StackPushRequest):
    entry = {"action": request.action, "details": request.details, "timestamp": time.time()}
    audit_stack.push(entry)
    return {"message": "Pushed to stack", "size": audit_stack.size(), "top": entry}


@app.post("/api/dsa/midsem/stack/pop")
async def stack_pop():
    item = audit_stack.pop()
    if not item:
        raise HTTPException(status_code=404, detail="Audit stack is empty")
    return {"popped": item, "remaining_size": audit_stack.size()}


@app.get("/api/dsa/midsem/stack")
async def get_stack():
    return {"stack": audit_stack.to_list(), "count": audit_stack.size()}


@app.post("/api/dsa/midsem/queue/enqueue")
async def queue_enqueue(batch: QueueBatchRequest):
    for item in batch.items:
        task_queue.enqueue(item.model_dump())
    return {"message": f"Enqueued {len(batch.items)} task(s)", "queue_size": task_queue.size()}


@app.get("/api/dsa/midsem/queue")
async def get_queue():
    return {"queue": task_queue.to_list(), "count": task_queue.size()}


@app.post("/api/dsa/midsem/sprint/greedy")
async def sprint_greedy(request: SprintOptimizeRequest):
    temp_q = Queue()
    for task in request.tasks:
        temp_q.enqueue(task.model_dump())
    result = temp_q.process_greedy_sprint(request.capacity)
    return result


@app.post("/api/dsa/midsem/linkedlist/append")
async def dll_append(log: LogEntry):
    entry = log.model_dump()
    activity_dll.append(entry)
    return {"message": "Appended to Linked List", "size": activity_dll.size()}


@app.get("/api/dsa/midsem/linkedlist")
async def get_dll(reverse: bool = False):
    return {"logs": activity_dll.to_list(reverse=reverse), "count": activity_dll.size()}


@app.post("/api/dsa/midsem/bst/index")
async def bst_index_logs(batch: LogBatch):
    for entry in batch.entries:
        simple_log_bst.insert(entry.timestamp, entry.model_dump())
    return {"message": f"Indexed {len(batch.entries)} log(s) in Simple BST", "bst_size": simple_log_bst.size()}


@app.get("/api/dsa/midsem/bst")
async def get_bst_logs():
    return {"logs": simple_log_bst.in_order(), "count": simple_log_bst.size()}


@app.post("/api/dsa/midsem/bst/range")
async def query_bst_range(query: RangeQuery):
    results = simple_log_bst.range_query(query.start, query.end)
    return {"logs": results, "count": len(results), "range": {"start": query.start, "end": query.end}}


@app.post("/api/dsa/deadlines")
async def add_deadlines(batch: DeadlineBatch):
    for item in batch.items:
        deadline_queue.insert(item.model_dump())
    return {"message": f"Added {len(batch.items)} deadline(s)", "queue_size": deadline_queue.size()}


@app.get("/api/dsa/deadlines")
async def get_all_deadlines():
    return {"deadlines": deadline_queue.get_all_sorted(), "count": deadline_queue.size()}


@app.get("/api/dsa/deadlines/next")
async def get_next_deadline():
    item = deadline_queue.peek()
    if not item:
        raise HTTPException(status_code=404, detail="No deadlines in queue")
    return {"next_deadline": item}


@app.post("/api/dsa/deadlines/extract")
async def extract_next_deadline():
    item = deadline_queue.extract_min()
    if not item:
        raise HTTPException(status_code=404, detail="No deadlines in queue")
    return {"extracted": item, "remaining": deadline_queue.size()}


@app.delete("/api/dsa/deadlines")
async def clear_deadlines():
    deadline_queue.clear()
    return {"message": "All deadlines cleared"}


# =======================================================================
#  END-SEM ADVANCED DSA ENDPOINTS (PHASE 2)
# =======================================================================

# ─── 1. 0-1 KNAPSACK DYNAMIC PROGRAMMING ──────────────────────────────

@app.post("/api/dsa/sprint/optimize")
async def optimize_sprint_dp(request: SprintOptimizeRequest):
    """End-Sem 0-1 Knapsack DP Task Allocator."""
    tasks = [t.model_dump() for t in request.tasks]
    return KnapsackDP.solve(tasks, request.capacity)


# ─── 2. MERKLE TREE ENDPOINTS ──────────────────────────────────────────

@app.post("/api/dsa/merkle/build")
async def build_merkle_tree(req: MerkleBuildRequest):
    """Build SHA-256 Merkle Tree from log entries."""
    res = merkle_engine.build(req.logs)
    return res


@app.post("/api/dsa/merkle/verify")
async def verify_merkle_tree(req: MerkleVerifyRequest):
    """Verify log integrity using Merkle Proof."""
    return merkle_engine.verify(req.logs)


@app.get("/api/dsa/merkle/tree")
async def get_merkle_tree_structure():
    """Get visual structure of the Merkle Tree."""
    return merkle_engine.get_structure()


# ─── 3. TRIE AUTOCOMPLETE SEARCH ─────────────────────────────────────

@app.get("/api/dsa/search/autocomplete")
async def search_autocomplete(prefix: str = "", limit: int = 10):
    """Trie Sub-linear Prefix Autocomplete Search."""
    suggestions = search_trie.autocomplete(prefix, limit)
    return {"prefix": prefix, "suggestions": suggestions, "count": len(suggestions)}


@app.post("/api/dsa/search/insert")
async def insert_search_terms(req: SearchInsertRequest):
    """Insert terms/tags/project titles into Trie."""
    for term in req.terms:
        search_trie.insert(term)
    return {"message": f"Inserted {len(req.terms)} term(s) into Trie", "trie_size": search_trie.size()}


# ─── 4. AVL BALANCED BST LOG INDEX ───────────────────────────────────

@app.post("/api/dsa/logs/index")
async def avl_index_logs(batch: LogBatch):
    """Insert logs into height-balanced AVL Tree."""
    for entry in batch.entries:
        avl_log_tree.insert(entry.timestamp, entry.model_dump())
    return {"message": f"Indexed {len(batch.entries)} log(s) in AVL Tree", "avl_size": avl_log_tree.size()}


@app.get("/api/dsa/logs/index")
async def get_avl_logs():
    """Get all logs in-order from AVL Tree."""
    return {"logs": avl_log_tree.in_order(), "count": avl_log_tree.size()}


@app.post("/api/dsa/logs/range")
async def query_avl_range(query: RangeQuery):
    """Query logs within timestamp range using AVL Tree."""
    results = avl_log_tree.range_query(query.start, query.end)
    return {"logs": results, "count": len(results), "range": {"start": query.start, "end": query.end}}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

