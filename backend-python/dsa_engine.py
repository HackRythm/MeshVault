"""
MeshVault Mid-Sem DSA Engine
============================
Pure Python implementations of fundamental, lightweight Data Structures & Algorithms
specifically built for the Mid-Sem Evaluation:

1. Stack (LIFO - Undo/Redo & Recent Audit Log Stack)
2. Queue (FIFO - Sequential Task Execution & Sprint Queue)
3. DoublyLinkedList (Chronological Activity Feed & Navigation Trail)
4. SimpleBST (Timestamp-based Log Indexing - Unbalanced BST)
5. MinHeapPQ (Urgent Review Deadlines Priority Queue)

Note: Advanced structures (AVL Tree, Merkle Tree, 0-1 Knapsack DP, Trie)
are excluded from Mid-Sem and reserved for Future Implementation (End-Sem).

No external dependencies — uses only Python standard library.
"""

from typing import Any, Optional


# -----------------------------------------------------------------------
#  1. STACK — Undo/Redo & Recent Audit Log Stack (LIFO)
# -----------------------------------------------------------------------

class Stack:
    """
    Last-In, First-Out (LIFO) Stack implementation.
    Used for audit log undo/redo operations and tracking recent user actions.
    """

    def __init__(self, max_capacity: int = 100):
        self._items: list[Any] = []
        self._max_capacity = max_capacity

    def push(self, item: Any):
        """Push an item onto the stack."""
        if len(self._items) >= self._max_capacity:
            self._items.pop(0)  # Evict oldest if capacity reached
        self._items.append(item)

    def pop(self) -> Optional[Any]:
        """Pop and return the top item from the stack."""
        if not self._items:
            return None
        return self._items.pop()

    def peek(self) -> Optional[Any]:
        """Return the top item without removing it."""
        return self._items[-1] if self._items else None

    def is_empty(self) -> bool:
        """Check if stack is empty."""
        return len(self._items) == 0

    def size(self) -> int:
        """Return current size of stack."""
        return len(self._items)

    def clear(self):
        """Clear all items from stack."""
        self._items.clear()

    def to_list(self) -> list[Any]:
        """Return items from top to bottom (most recent first)."""
        return list(reversed(self._items))


# -----------------------------------------------------------------------
#  2. QUEUE — Task Execution & Sequential Sprint Queue (FIFO)
# -----------------------------------------------------------------------

class Queue:
    """
    First-In, First-Out (FIFO) Queue implementation.
    Used for sequential task processing and lightweight greedy sprint scheduling.
    """

    def __init__(self):
        self._items: list[Any] = []

    def enqueue(self, item: Any):
        """Add an item to the end of the queue."""
        self._items.append(item)

    def dequeue(self) -> Optional[Any]:
        """Remove and return the item at the front of the queue."""
        if not self._items:
            return None
        return self._items.pop(0)

    def peek(self) -> Optional[Any]:
        """Return the item at the front without removing it."""
        return self._items[0] if self._items else None

    def is_empty(self) -> bool:
        """Check if queue is empty."""
        return len(self._items) == 0

    def size(self) -> int:
        """Return current size of queue."""
        return len(self._items)

    def clear(self):
        """Clear all items from queue."""
        self._items.clear()

    def to_list(self) -> list[Any]:
        """Return items from front to back."""
        return self._items.copy()

    def process_greedy_sprint(self, capacity: int) -> dict:
        """
        Lightweight Mid-Sem Sprint Planner:
        Processes tasks sequentially by priority ratio using the FIFO queue until capacity is reached.
        """
        selected = []
        excluded = []
        used_weight = 0
        total_value = 0

        # Sort copy of queue items by value-to-weight ratio for greedy allocation
        sorted_tasks = sorted(self._items, key=lambda x: (x.get("value", 1) / max(x.get("weight", 1), 1)), reverse=True)

        for task in sorted_tasks:
            w = task.get("weight", 1)
            v = task.get("value", 1)
            if used_weight + w <= capacity:
                selected.append(task)
                used_weight += w
                total_value += v
            else:
                excluded.append(task)

        utilization = (used_weight / capacity * 100) if capacity > 0 else 0.0
        return {
            "algorithm": "Mid-Sem FIFO/Greedy Queue Scheduler",
            "selected_tasks": selected,
            "excluded_tasks": excluded,
            "total_value": total_value,
            "total_weight": used_weight,
            "capacity": capacity,
            "utilization": round(utilization, 1)
        }


# -----------------------------------------------------------------------
#  3. DOUBLY LINKED LIST — Chronological Activity Feed & Navigation
# -----------------------------------------------------------------------

class DLLNode:
    """Node for Doubly Linked List."""

    def __init__(self, data: Any):
        self.data: Any = data
        self.prev: Optional["DLLNode"] = None
        self.next: Optional["DLLNode"] = None


class DoublyLinkedList:
    """
    Doubly Linked List for bi-directional traversal of project logs and navigation history.
    """

    def __init__(self):
        self.head: Optional[DLLNode] = None
        self.tail: Optional[DLLNode] = None
        self._size: int = 0

    def append(self, data: Any):
        """Append node to the end of the list."""
        new_node = DLLNode(data)
        if not self.head:
            self.head = new_node
            self.tail = new_node
        else:
            new_node.prev = self.tail
            self.tail.next = new_node
            self.tail = new_node
        self._size += 1

    def prepend(self, data: Any):
        """Prepend node to the beginning of the list."""
        new_node = DLLNode(data)
        if not self.head:
            self.head = new_node
            self.tail = new_node
        else:
            new_node.next = self.head
            self.head.prev = new_node
            self.head = new_node
        self._size += 1

    def pop_head(self) -> Optional[Any]:
        """Remove and return the head item."""
        if not self.head:
            return None
        data = self.head.data
        self.head = self.head.next
        if self.head:
            self.head.prev = None
        else:
            self.tail = None
        self._size -= 1
        return data

    def to_list(self, reverse: bool = False) -> list[Any]:
        """Convert doubly linked list to Python list."""
        result = []
        if reverse:
            curr = self.tail
            while curr:
                result.append(curr.data)
                curr = curr.prev
        else:
            curr = self.head
            while curr:
                result.append(curr.data)
                curr = curr.next
        return result

    def size(self) -> int:
        return self._size

    def clear(self):
        self.head = None
        self.tail = None
        self._size = 0


# -----------------------------------------------------------------------
#  4. SIMPLE BST — Unbalanced Binary Search Tree for Log Indexing
# -----------------------------------------------------------------------

class BSTNode:
    """Node for Simple Binary Search Tree."""

    def __init__(self, key: float, value: Any):
        self.key = key        # Timestamp (Unix epoch)
        self.value = value    # Log data
        self.left: Optional["BSTNode"] = None
        self.right: Optional["BSTNode"] = None


class SimpleBST:
    """
    Standard Binary Search Tree (Unbalanced BST) for timestamp log indexing.
    Used in Mid-Sem evaluation prior to AVL balance rotations.
    """

    def __init__(self):
        self.root: Optional[BSTNode] = None
        self._size: int = 0

    def _insert(self, node: Optional[BSTNode], key: float, value: Any) -> BSTNode:
        if not node:
            self._size += 1
            return BSTNode(key, value)
        if key < node.key:
            node.left = self._insert(node.left, key, value)
        elif key > node.key:
            node.right = self._insert(node.right, key, value)
        else:
            node.value = value  # Update value on duplicate key
        return node

    def insert(self, key: float, value: Any):
        """Insert entry into BST."""
        self.root = self._insert(self.root, key, value)

    def _search(self, node: Optional[BSTNode], key: float) -> Optional[Any]:
        if not node:
            return None
        if key == node.key:
            return node.value
        elif key < node.key:
            return self._search(node.left, key)
        else:
            return self._search(node.right, key)

    def search(self, key: float) -> Optional[Any]:
        """Search for entry by key."""
        return self._search(self.root, key)

    def _in_order(self, node: Optional[BSTNode], result: list):
        if node:
            self._in_order(node.left, result)
            result.append({"key": node.key, "value": node.value})
            self._in_order(node.right, result)

    def in_order(self) -> list[dict]:
        """Return all entries sorted chronologically."""
        result = []
        self._in_order(self.root, result)
        return result

    def _range_query(self, node: Optional[BSTNode], start: float, end: float, result: list):
        if not node:
            return
        if start < node.key:
            self._range_query(node.left, start, end, result)
        if start <= node.key <= end:
            result.append({"key": node.key, "value": node.value})
        if node.key < end:
            self._range_query(node.right, start, end, result)

    def range_query(self, start: float, end: float) -> list[dict]:
        """Return entries within [start, end] range."""
        result = []
        self._range_query(self.root, start, end, result)
        return result

    def size(self) -> int:
        return self._size

    def clear(self):
        self.root = None
        self._size = 0


# -----------------------------------------------------------------------
#  5. MIN-HEAP PRIORITY QUEUE — Upcoming Review Deadlines
# -----------------------------------------------------------------------

class MinHeapPQ:
    """
    Min-Heap Priority Queue for managing upcoming review deadlines.
    Items with the smallest deadline (earliest date) have highest priority.
    
    Each entry is a dict: { "id": str, "title": str, "deadline": float (unix timestamp), ... }
    """

    def __init__(self):
        self._heap: list[dict] = []

    def _parent(self, i: int) -> int:
        return (i - 1) // 2

    def _left(self, i: int) -> int:
        return 2 * i + 1

    def _right(self, i: int) -> int:
        return 2 * i + 2

    def _swap(self, i: int, j: int):
        self._heap[i], self._heap[j] = self._heap[j], self._heap[i]

    def _sift_up(self, i: int):
        while i > 0 and self._heap[i]["deadline"] < self._heap[self._parent(i)]["deadline"]:
            self._swap(i, self._parent(i))
            i = self._parent(i)

    def _sift_down(self, i: int):
        n = len(self._heap)
        smallest = i
        left = self._left(i)
        right = self._right(i)

        if left < n and self._heap[left]["deadline"] < self._heap[smallest]["deadline"]:
            smallest = left
        if right < n and self._heap[right]["deadline"] < self._heap[smallest]["deadline"]:
            smallest = right

        if smallest != i:
            self._swap(i, smallest)
            self._sift_down(smallest)

    def insert(self, item: dict):
        """Insert a deadline item into the priority queue."""
        self._heap.append(item)
        self._sift_up(len(self._heap) - 1)

    def extract_min(self) -> Optional[dict]:
        """Remove and return the item with the earliest deadline."""
        if not self._heap:
            return None
        if len(self._heap) == 1:
            return self._heap.pop()

        root = self._heap[0]
        self._heap[0] = self._heap.pop()
        self._sift_down(0)
        return root

    def peek(self) -> Optional[dict]:
        """Return the item with the earliest deadline without removing it."""
        return self._heap[0] if self._heap else None

    def get_all_sorted(self) -> list[dict]:
        """Return all items sorted by deadline (non-destructive)."""
        temp = MinHeapPQ()
        temp._heap = self._heap.copy()
        result = []
        while temp._heap:
            result.append(temp.extract_min())
        return result

    def size(self) -> int:
        return self._size

    def clear(self):
        self._heap.clear()
