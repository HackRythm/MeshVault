"""
MeshVault FastAPI Microservice
==============================
REST API exposing DSA engine operations for the Academic Project Manager.
Handles compute-heavy operations: deadline priority queues, chronological
log indexing, Merkle tree verification, sprint optimization, and autocomplete.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import time

from dsa_engine import MinHeapPQ, AVLTree, MerkleTree, KnapsackDP, Trie

# ─── FastAPI App ──────────────────────────────────────────────────────

app = FastAPI(
    title="MeshVault DSA Engine",
    description="Data Structure & Algorithm microservice for the Academic Project Manager",
    version="1.0.0"
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

deadline_queue = MinHeapPQ()
log_tree = AVLTree()
merkle_tree = MerkleTree()
search_trie = Trie()

# Pre-populate trie with sample terms for demo
_sample_terms = [
    "Advanced DSA", "Algorithm Analysis", "AVL Tree",
    "Binary Search", "BFS Traversal", "Balanced Trees",
    "Complexity Analysis", "Course Project", "Capstone",
    "Data Structures", "Dynamic Programming", "Dijkstra",
    "Graph Theory", "Greedy Algorithms",
    "Hash Tables", "Heap Sort",
    "Knapsack Problem", "KMP Algorithm",
    "Linked List", "Log Analysis",
    "Merkle Tree", "Minimum Spanning Tree", "MeshVault",
    "Network Flow", "NP-Complete",
    "Operating Systems", "Optimization",
    "Priority Queue", "Python FastAPI", "Project Management",
    "Quick Sort", "Queue Implementation",
    "Red-Black Tree", "Recursion",
    "SHA-256", "Sprint Planning", "Stack",
    "Trie Structure", "Topological Sort",
    "Union-Find",
]
for term in _sample_terms:
    search_trie.insert(term)


# ─── Pydantic Models ─────────────────────────────────────────────────

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


class MerkleBuildRequest(BaseModel):
    logs: list[str] = Field(..., description="List of log content strings to hash")


class MerkleVerifyRequest(BaseModel):
    logs: list[str] = Field(..., description="List of log content strings to verify against stored root")


class Task(BaseModel):
    name: str
    weight: int = Field(..., ge=1, description="Hours required")
    value: int = Field(..., ge=1, description="Priority × impact score")


class SprintOptimizeRequest(BaseModel):
    tasks: list[Task]
    capacity: int = Field(..., ge=1, description="Sprint capacity in hours")


class TrieInsertRequest(BaseModel):
    terms: list[str]


# ─── Health Check ─────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "MeshVault DSA Engine",
        "version": "1.0.0",
        "engines": {
            "deadline_queue_size": deadline_queue.size(),
            "log_tree_size": log_tree.size(),
            "merkle_leaf_count": merkle_tree.leaf_count,
            "trie_word_count": search_trie.size()
        }
    }


# ═══════════════════════════════════════════════════════════════════════
#  DEADLINE PRIORITY QUEUE ENDPOINTS (MinHeap)
# ═══════════════════════════════════════════════════════════════════════

@app.post("/api/dsa/deadlines")
async def add_deadlines(batch: DeadlineBatch):
    """Add one or more deadline items to the priority queue."""
    for item in batch.items:
        deadline_queue.insert(item.model_dump())
    return {
        "message": f"Added {len(batch.items)} deadline(s)",
        "queue_size": deadline_queue.size()
    }


@app.get("/api/dsa/deadlines")
async def get_all_deadlines():
    """Get all deadlines sorted by earliest first."""
    return {
        "deadlines": deadline_queue.get_all_sorted(),
        "count": deadline_queue.size()
    }


@app.get("/api/dsa/deadlines/next")
async def get_next_deadline():
    """Peek at the next (most urgent) deadline without removing it."""
    item = deadline_queue.peek()
    if not item:
        raise HTTPException(status_code=404, detail="No deadlines in queue")
    return {"next_deadline": item}


@app.post("/api/dsa/deadlines/extract")
async def extract_next_deadline():
    """Remove and return the next (most urgent) deadline."""
    item = deadline_queue.extract_min()
    if not item:
        raise HTTPException(status_code=404, detail="No deadlines in queue")
    return {"extracted": item, "remaining": deadline_queue.size()}


@app.delete("/api/dsa/deadlines")
async def clear_deadlines():
    """Clear all deadlines from the queue."""
    deadline_queue.clear()
    return {"message": "All deadlines cleared"}


# ═══════════════════════════════════════════════════════════════════════
#  CHRONOLOGICAL LOG ENDPOINTS (AVL Tree)
# ═══════════════════════════════════════════════════════════════════════

@app.post("/api/dsa/logs/index")
async def index_logs(batch: LogBatch):
    """Insert log entries into the AVL tree indexed by timestamp."""
    for entry in batch.entries:
        log_tree.insert(entry.timestamp, entry.model_dump())
    return {
        "message": f"Indexed {len(batch.entries)} log(s)",
        "tree_size": log_tree.size()
    }


@app.get("/api/dsa/logs/index")
async def get_all_logs():
    """Get all logs in chronological order."""
    return {
        "logs": log_tree.in_order(),
        "count": log_tree.size()
    }


@app.post("/api/dsa/logs/range")
async def query_logs_range(query: RangeQuery):
    """Query logs within a timestamp range."""
    results = log_tree.range_query(query.start, query.end)
    return {
        "logs": results,
        "count": len(results),
        "range": {"start": query.start, "end": query.end}
    }


@app.get("/api/dsa/logs/search/{timestamp}")
async def search_log(timestamp: float):
    """Search for a log by exact timestamp."""
    result = log_tree.search(timestamp)
    if result is None:
        raise HTTPException(status_code=404, detail="No log found at this timestamp")
    return {"log": result}


@app.delete("/api/dsa/logs")
async def clear_logs():
    """Clear all logs from the AVL tree."""
    log_tree.clear()
    return {"message": "All logs cleared"}


# ═══════════════════════════════════════════════════════════════════════
#  MERKLE TREE ENDPOINTS (SHA-256 Verification)
# ═══════════════════════════════════════════════════════════════════════

@app.post("/api/dsa/merkle/build")
async def build_merkle_tree(request: MerkleBuildRequest):
    """Build a Merkle tree from log content strings."""
    if not request.logs:
        raise HTTPException(status_code=400, detail="At least one log entry is required")

    merkle_tree.build(request.logs)
    return {
        "message": f"Merkle tree built with {len(request.logs)} leaves",
        "root_hash": merkle_tree.get_root(),
        "leaf_count": merkle_tree.leaf_count,
        "tree_levels": len(merkle_tree.get_tree_visualization())
    }


@app.post("/api/dsa/merkle/verify")
async def verify_merkle_tree(request: MerkleVerifyRequest):
    """Verify log integrity against the stored Merkle root."""
    result = merkle_tree.verify(request.logs)
    return result


@app.get("/api/dsa/merkle/root")
async def get_merkle_root():
    """Get the current Merkle root hash."""
    root = merkle_tree.get_root()
    if not root:
        raise HTTPException(status_code=404, detail="No Merkle tree built yet")
    return {"root_hash": root, "leaf_count": merkle_tree.leaf_count}


@app.get("/api/dsa/merkle/proof/{index}")
async def get_merkle_proof(index: int):
    """Get Merkle proof (audit path) for a leaf at the given index."""
    if index < 0 or index >= merkle_tree.leaf_count:
        raise HTTPException(status_code=400, detail=f"Index must be between 0 and {merkle_tree.leaf_count - 1}")
    proof = merkle_tree.get_proof(index)
    return {"index": index, "proof": proof}


@app.get("/api/dsa/merkle/tree")
async def get_merkle_tree_viz():
    """Get the full Merkle tree structure for visualization."""
    tree = merkle_tree.get_tree_visualization()
    if not tree:
        raise HTTPException(status_code=404, detail="No Merkle tree built yet")
    return {"tree": tree, "levels": len(tree), "root": merkle_tree.get_root()}


# ═══════════════════════════════════════════════════════════════════════
#  SPRINT OPTIMIZER ENDPOINTS (0-1 Knapsack DP)
# ═══════════════════════════════════════════════════════════════════════

@app.post("/api/dsa/sprint/optimize")
async def optimize_sprint(request: SprintOptimizeRequest):
    """Run 0-1 Knapsack DP to select optimal tasks for the sprint."""
    tasks = [t.model_dump() for t in request.tasks]
    result = KnapsackDP.solve(tasks, request.capacity)
    return result


# ═══════════════════════════════════════════════════════════════════════
#  TRIE SEARCH ENDPOINTS (Autocomplete)
# ═══════════════════════════════════════════════════════════════════════

@app.get("/api/dsa/search/autocomplete")
async def autocomplete(prefix: str = "", limit: int = 10):
    """Get autocomplete suggestions for a prefix."""
    if not prefix:
        return {"suggestions": [], "prefix": prefix}
    results = search_trie.autocomplete(prefix, limit)
    return {"suggestions": results, "prefix": prefix, "count": len(results)}


@app.post("/api/dsa/search/insert")
async def insert_terms(request: TrieInsertRequest):
    """Insert terms into the trie."""
    for term in request.terms:
        search_trie.insert(term)
    return {
        "message": f"Inserted {len(request.terms)} term(s)",
        "trie_size": search_trie.size()
    }


@app.get("/api/dsa/search/exists")
async def search_exact(word: str = ""):
    """Check if an exact word exists in the trie."""
    return {"word": word, "exists": search_trie.search(word)}


@app.delete("/api/dsa/search")
async def clear_trie():
    """Clear the trie and re-seed with sample terms."""
    search_trie.clear()
    for term in _sample_terms:
        search_trie.insert(term)
    return {"message": "Trie reset to sample terms", "size": search_trie.size()}


# ─── Main ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
