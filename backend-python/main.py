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

from dsa_engine import Stack, Queue, DoublyLinkedList, SimpleBST, MinHeapPQ

# ─── FastAPI App ──────────────────────────────────────────────────────

app = FastAPI(
    title="MeshVault Mid-Sem DSA Engine",
    description="Minimal Data Structure & Algorithm microservice for Mid-Sem evaluation",
    version="1.0.0-midsem"
)

# CORS — allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── In-Memory DSA Instances ─────────────────────────────────────────

audit_stack = Stack()
task_queue = Queue()
activity_dll = DoublyLinkedList()
simple_log_bst = SimpleBST()
deadline_queue = MinHeapPQ()

# Seed sample data for Mid-Sem demo
_sample_logs = [
    {"timestamp": 1700000000.0, "content": "Project MeshVault created", "project": "MeshVault", "user": "admin"},
    {"timestamp": 1700000100.0, "content": "Updated database schema", "project": "MeshVault", "user": "dev1"},
    {"timestamp": 1700000200.0, "content": "Added Mid-Sem DSA engines", "project": "MeshVault", "user": "dev2"},
]

for log in _sample_logs:
    simple_log_bst.insert(log["timestamp"], log)
    audit_stack.push(log)
    activity_dll.append(log)


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


# ─── Health Check & Phase Metadata ─────────────────────────────────────

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "MeshVault Mid-Sem DSA Engine",
        "version": "1.0.0-midsem",
        "active_dsas": {
            "stack_size": audit_stack.size(),
            "queue_size": task_queue.size(),
            "linked_list_size": activity_dll.size(),
            "simple_bst_size": simple_log_bst.size(),
            "deadline_queue_size": deadline_queue.size()
        }
    }


@app.get("/api/dsa/phase-info")
async def get_phase_info():
    """Return phase architectural breakdown for academic evaluation."""
    return {
        "evaluation_phase": "Mid-Sem Evaluation",
        "active_light_dsas": [
            {"name": "Stack", "purpose": "LIFO Undo/Redo & Audit Log History Stack"},
            {"name": "Queue", "purpose": "FIFO Task Execution & Greedy Sprint Queue"},
            {"name": "Doubly LinkedList", "purpose": "Bi-directional Activity Navigation Trail"},
            {"name": "Simple BST", "purpose": "Timestamp-based Log Indexing without AVL rotations"},
            {"name": "Min-Heap PQ", "purpose": "Urgent Review Deadlines Priority Queue"}
        ],
        "future_implementation": [
            "AVL Tree (End-Sem)",
            "Merkle Tree (End-Sem)",
            "0-1 Knapsack Dynamic Programming (End-Sem)",
            "Trie Tree Autocomplete (End-Sem)"
        ]
    }


# =======================================================================
#  MID-SEM LIGHT DSA ENDPOINTS
# =======================================================================

# ─── 1. STACK ENDPOINTS ────────────────────────────────────────────────

@app.post("/api/dsa/midsem/stack/push")
async def stack_push(request: StackPushRequest):
    """Push an entry onto the Audit Stack."""
    entry = {"action": request.action, "details": request.details, "timestamp": time.time()}
    audit_stack.push(entry)
    return {"message": "Pushed to stack", "size": audit_stack.size(), "top": entry}


@app.post("/api/dsa/midsem/stack/pop")
async def stack_pop():
    """Pop the top item from the Audit Stack (Undo operation)."""
    item = audit_stack.pop()
    if not item:
        raise HTTPException(status_code=404, detail="Audit stack is empty")
    return {"popped": item, "remaining_size": audit_stack.size()}


@app.get("/api/dsa/midsem/stack")
async def get_stack():
    """Get all items in the Audit Stack (Top to Bottom)."""
    return {"stack": audit_stack.to_list(), "count": audit_stack.size()}


# ─── 2. QUEUE & GREEDY SPRINT ENDPOINTS ────────────────────────────────

@app.post("/api/dsa/midsem/queue/enqueue")
async def queue_enqueue(batch: QueueBatchRequest):
    """Enqueue tasks into the FIFO task queue."""
    for item in batch.items:
        task_queue.enqueue(item.model_dump())
    return {"message": f"Enqueued {len(batch.items)} task(s)", "queue_size": task_queue.size()}


@app.get("/api/dsa/midsem/queue")
async def get_queue():
    """Get all tasks in the FIFO Queue."""
    return {"queue": task_queue.to_list(), "count": task_queue.size()}


@app.post("/api/dsa/midsem/sprint/greedy")
async def sprint_greedy(request: SprintOptimizeRequest):
    """Mid-Sem Greedy / FIFO Queue Task Scheduler."""
    temp_q = Queue()
    for task in request.tasks:
        temp_q.enqueue(task.model_dump())
    result = temp_q.process_greedy_sprint(request.capacity)
    return result


# ─── 3. DOUBLY LINKED LIST ENDPOINTS ───────────────────────────────────

@app.post("/api/dsa/midsem/linkedlist/append")
async def dll_append(log: LogEntry):
    """Append activity log to Doubly Linked List."""
    entry = log.model_dump()
    activity_dll.append(entry)
    return {"message": "Appended to Linked List", "size": activity_dll.size()}


@app.get("/api/dsa/midsem/linkedlist")
async def get_dll(reverse: bool = False):
    """Get all activity feed logs from Doubly Linked List."""
    return {"logs": activity_dll.to_list(reverse=reverse), "count": activity_dll.size()}


# ─── 4. SIMPLE BST ENDPOINTS ───────────────────────────────────────────

@app.post("/api/dsa/midsem/bst/index")
async def bst_index_logs(batch: LogBatch):
    """Insert logs into Simple BST indexed by timestamp."""
    for entry in batch.entries:
        simple_log_bst.insert(entry.timestamp, entry.model_dump())
    return {"message": f"Indexed {len(batch.entries)} log(s) in Simple BST", "bst_size": simple_log_bst.size()}


@app.get("/api/dsa/midsem/bst")
async def get_bst_logs():
    """Get all logs in-order from Simple BST."""
    return {"logs": simple_log_bst.in_order(), "count": simple_log_bst.size()}


@app.post("/api/dsa/midsem/bst/range")
async def query_bst_range(query: RangeQuery):
    """Query logs within timestamp range using Simple BST."""
    results = simple_log_bst.range_query(query.start, query.end)
    return {"logs": results, "count": len(results), "range": {"start": query.start, "end": query.end}}


# ─── 5. MIN-HEAP PRIORITY QUEUE ENDPOINTS ──────────────────────────────

@app.post("/api/dsa/deadlines")
async def add_deadlines(batch: DeadlineBatch):
    """Add one or more deadline items to the priority queue."""
    for item in batch.items:
        deadline_queue.insert(item.model_dump())
    return {"message": f"Added {len(batch.items)} deadline(s)", "queue_size": deadline_queue.size()}


@app.get("/api/dsa/deadlines")
async def get_all_deadlines():
    """Get all deadlines sorted by earliest first."""
    return {"deadlines": deadline_queue.get_all_sorted(), "count": deadline_queue.size()}


@app.get("/api/dsa/deadlines/next")
async def get_next_deadline():
    """Peek at the next (most urgent) deadline."""
    item = deadline_queue.peek()
    if not item:
        raise HTTPException(status_code=404, detail="No deadlines in queue")
    return {"next_deadline": item}


@app.post("/api/dsa/deadlines/extract")
async def extract_next_deadline():
    """Remove and return the next deadline."""
    item = deadline_queue.extract_min()
    if not item:
        raise HTTPException(status_code=404, detail="No deadlines in queue")
    return {"extracted": item, "remaining": deadline_queue.size()}


@app.delete("/api/dsa/deadlines")
async def clear_deadlines():
    deadline_queue.clear()
    return {"message": "All deadlines cleared"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
