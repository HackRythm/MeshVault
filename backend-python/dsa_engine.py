"""
MeshVault DSA Engine
====================
Pure Python implementations of five Data Structure & Algorithm engines
for the Academic Project Manager's compute-heavy operations.

No external dependencies — uses only Python standard library.
"""

import hashlib
import time
from typing import Any, Optional


# ═══════════════════════════════════════════════════════════════════════
#  1. MIN-HEAP PRIORITY QUEUE — Upcoming Review Deadlines
# ═══════════════════════════════════════════════════════════════════════

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
        # Build a temporary copy and extract all
        temp = MinHeapPQ()
        temp._heap = self._heap.copy()
        result = []
        while temp._heap:
            result.append(temp.extract_min())
        return result

    def size(self) -> int:
        return len(self._heap)

    def clear(self):
        self._heap.clear()


# ═══════════════════════════════════════════════════════════════════════
#  2. AVL TREE — Chronological Log Indexing
# ═══════════════════════════════════════════════════════════════════════

class AVLNode:
    """Node for the AVL Tree."""

    def __init__(self, key: float, value: Any):
        self.key = key        # Timestamp (Unix epoch)
        self.value = value    # Log data
        self.left: Optional["AVLNode"] = None
        self.right: Optional["AVLNode"] = None
        self.height: int = 1


class AVLTree:
    """
    Self-balancing AVL Tree for chronological log indexing.
    Keys are timestamps (float), values are log entries.
    Guarantees O(log n) insert, search, and range query.
    """

    def __init__(self):
        self.root: Optional[AVLNode] = None
        self._size: int = 0

    def _height(self, node: Optional[AVLNode]) -> int:
        return node.height if node else 0

    def _balance_factor(self, node: AVLNode) -> int:
        return self._height(node.left) - self._height(node.right)

    def _update_height(self, node: AVLNode):
        node.height = 1 + max(self._height(node.left), self._height(node.right))

    def _rotate_right(self, y: AVLNode) -> AVLNode:
        x = y.left
        t2 = x.right
        x.right = y
        y.left = t2
        self._update_height(y)
        self._update_height(x)
        return x

    def _rotate_left(self, x: AVLNode) -> AVLNode:
        y = x.right
        t2 = y.left
        y.left = x
        x.right = t2
        self._update_height(x)
        self._update_height(y)
        return y

    def _rebalance(self, node: AVLNode, key: float) -> AVLNode:
        balance = self._balance_factor(node)

        # Left-Left
        if balance > 1 and key < node.left.key:
            return self._rotate_right(node)
        # Right-Right
        if balance < -1 and key > node.right.key:
            return self._rotate_left(node)
        # Left-Right
        if balance > 1 and key > node.left.key:
            node.left = self._rotate_left(node.left)
            return self._rotate_right(node)
        # Right-Left
        if balance < -1 and key < node.right.key:
            node.right = self._rotate_right(node.right)
            return self._rotate_left(node)

        return node

    def _insert(self, node: Optional[AVLNode], key: float, value: Any) -> AVLNode:
        if not node:
            self._size += 1
            return AVLNode(key, value)

        if key < node.key:
            node.left = self._insert(node.left, key, value)
        elif key > node.key:
            node.right = self._insert(node.right, key, value)
        else:
            # Duplicate key — update value
            node.value = value
            return node

        self._update_height(node)
        return self._rebalance(node, key)

    def insert(self, key: float, value: Any):
        """Insert a log entry indexed by timestamp."""
        self.root = self._insert(self.root, key, value)

    def _search(self, node: Optional[AVLNode], key: float) -> Optional[Any]:
        if not node:
            return None
        if key == node.key:
            return node.value
        elif key < node.key:
            return self._search(node.left, key)
        else:
            return self._search(node.right, key)

    def search(self, key: float) -> Optional[Any]:
        """Search for a log entry by exact timestamp."""
        return self._search(self.root, key)

    def _in_order(self, node: Optional[AVLNode], result: list):
        if node:
            self._in_order(node.left, result)
            result.append({"key": node.key, "value": node.value})
            self._in_order(node.right, result)

    def in_order(self) -> list[dict]:
        """Return all entries in chronological order."""
        result = []
        self._in_order(self.root, result)
        return result

    def _range_query(self, node: Optional[AVLNode], start: float, end: float, result: list):
        if not node:
            return
        if start < node.key:
            self._range_query(node.left, start, end, result)
        if start <= node.key <= end:
            result.append({"key": node.key, "value": node.value})
        if node.key < end:
            self._range_query(node.right, start, end, result)

    def range_query(self, start: float, end: float) -> list[dict]:
        """Return all entries within [start, end] timestamp range."""
        result = []
        self._range_query(self.root, start, end, result)
        return result

    def size(self) -> int:
        return self._size

    def clear(self):
        self.root = None
        self._size = 0


# ═══════════════════════════════════════════════════════════════════════
#  3. SHA-256 MERKLE TREE — Tamper-Proof Log Verification
# ═══════════════════════════════════════════════════════════════════════

class MerkleTree:
    """
    SHA-256 Merkle Tree for tamper-proof bi-weekly log verification.
    Builds a binary hash tree from a list of log entries.
    Supports root hash computation, integrity verification, and proof generation.
    """

    def __init__(self):
        self._leaves: list[str] = []
        self._tree: list[list[str]] = []
        self._root: Optional[str] = None

    @staticmethod
    def _hash(data: str) -> str:
        """Compute SHA-256 hash of a string."""
        return hashlib.sha256(data.encode("utf-8")).hexdigest()

    @staticmethod
    def _hash_pair(left: str, right: str) -> str:
        """Compute SHA-256 hash of two concatenated hashes."""
        return hashlib.sha256((left + right).encode("utf-8")).hexdigest()

    def build(self, logs: list[str]):
        """
        Build the Merkle tree from a list of log content strings.
        Each log is hashed to form a leaf node.
        """
        if not logs:
            self._leaves = []
            self._tree = []
            self._root = None
            return

        # Hash each log to create leaf nodes
        self._leaves = [self._hash(log) for log in logs]

        # Build tree bottom-up
        self._tree = [self._leaves.copy()]
        current_level = self._leaves.copy()

        while len(current_level) > 1:
            next_level = []
            for i in range(0, len(current_level), 2):
                left = current_level[i]
                # If odd number of nodes, duplicate the last one
                right = current_level[i + 1] if i + 1 < len(current_level) else left
                next_level.append(self._hash_pair(left, right))
            self._tree.append(next_level)
            current_level = next_level

        self._root = current_level[0] if current_level else None

    def get_root(self) -> Optional[str]:
        """Return the Merkle root hash."""
        return self._root

    def verify(self, logs: list[str]) -> dict:
        """
        Verify integrity by rebuilding the tree and comparing roots.
        Returns { "verified": bool, "expected_root": str, "computed_root": str }
        """
        if not self._root:
            return {
                "verified": False,
                "expected_root": None,
                "computed_root": None,
                "message": "No Merkle tree has been built yet."
            }

        # Rebuild from provided logs
        temp = MerkleTree()
        temp.build(logs)
        computed_root = temp.get_root()

        verified = computed_root == self._root
        return {
            "verified": verified,
            "expected_root": self._root,
            "computed_root": computed_root,
            "message": "Integrity verified — logs are untampered." if verified
                       else "INTEGRITY FAILURE — logs have been modified!"
        }

    def get_proof(self, index: int) -> list[dict]:
        """
        Generate a Merkle proof (audit path) for the leaf at the given index.
        Returns a list of { "hash": str, "position": "left"|"right" } entries.
        """
        if not self._tree or index < 0 or index >= len(self._leaves):
            return []

        proof = []
        idx = index

        for level in range(len(self._tree) - 1):
            layer = self._tree[level]
            is_right = idx % 2 == 1
            sibling_idx = idx - 1 if is_right else idx + 1

            if sibling_idx < len(layer):
                proof.append({
                    "hash": layer[sibling_idx],
                    "position": "left" if is_right else "right"
                })

            idx //= 2

        return proof

    def get_tree_visualization(self) -> list[list[str]]:
        """Return all levels of the tree for visualization."""
        return self._tree

    @property
    def leaf_count(self) -> int:
        return len(self._leaves)


# ═══════════════════════════════════════════════════════════════════════
#  4. 0-1 KNAPSACK DP — Sprint Task Allocator
# ═══════════════════════════════════════════════════════════════════════

class KnapsackDP:
    """
    0-1 Knapsack Dynamic Programming for Sprint Task Allocation.
    
    Each task has:
      - "name": str
      - "weight": int  (hours required)
      - "value": int   (priority × impact score)
    
    Goal: Select tasks that maximize total value within sprint capacity (hours).
    """

    @staticmethod
    def solve(tasks: list[dict], capacity: int) -> dict:
        """
        Solve the 0-1 Knapsack problem.
        
        Args:
            tasks: List of { "name": str, "weight": int, "value": int }
            capacity: Maximum sprint capacity in hours
            
        Returns:
            {
                "selected_tasks": [...],
                "excluded_tasks": [...],
                "total_value": int,
                "total_weight": int,
                "capacity": int,
                "utilization": float  (percentage)
            }
        """
        n = len(tasks)
        if n == 0 or capacity <= 0:
            return {
                "selected_tasks": [],
                "excluded_tasks": tasks,
                "total_value": 0,
                "total_weight": 0,
                "capacity": capacity,
                "utilization": 0.0
            }

        # Build DP table
        dp = [[0] * (capacity + 1) for _ in range(n + 1)]

        for i in range(1, n + 1):
            w = tasks[i - 1]["weight"]
            v = tasks[i - 1]["value"]
            for j in range(capacity + 1):
                if w <= j:
                    dp[i][j] = max(dp[i - 1][j], dp[i - 1][j - w] + v)
                else:
                    dp[i][j] = dp[i - 1][j]

        # Backtrack to find selected items
        selected_indices = []
        j = capacity
        for i in range(n, 0, -1):
            if dp[i][j] != dp[i - 1][j]:
                selected_indices.append(i - 1)
                j -= tasks[i - 1]["weight"]

        selected_indices.reverse()
        selected = [tasks[i] for i in selected_indices]
        excluded = [tasks[i] for i in range(n) if i not in selected_indices]

        total_weight = sum(t["weight"] for t in selected)
        total_value = dp[n][capacity]
        utilization = (total_weight / capacity * 100) if capacity > 0 else 0.0

        return {
            "selected_tasks": selected,
            "excluded_tasks": excluded,
            "total_value": total_value,
            "total_weight": total_weight,
            "capacity": capacity,
            "utilization": round(utilization, 1)
        }


# ═══════════════════════════════════════════════════════════════════════
#  5. TRIE TREE — Prefix Search / Autocomplete
# ═══════════════════════════════════════════════════════════════════════

class TrieNode:
    """Node for the Trie."""

    def __init__(self):
        self.children: dict[str, "TrieNode"] = {}
        self.is_end: bool = False
        self.frequency: int = 0  # Track insertion count for ranking


class Trie:
    """
    Trie (Prefix Tree) for fast prefix search and autocomplete.
    Supports case-insensitive search, frequency-ranked suggestions.
    """

    def __init__(self):
        self.root = TrieNode()
        self._size: int = 0

    def insert(self, word: str):
        """Insert a word into the trie."""
        node = self.root
        for char in word.lower():
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        if not node.is_end:
            self._size += 1
        node.is_end = True
        node.frequency += 1

    def search(self, word: str) -> bool:
        """Check if an exact word exists in the trie."""
        node = self._find_node(word.lower())
        return node is not None and node.is_end

    def starts_with(self, prefix: str) -> bool:
        """Check if any word starts with the given prefix."""
        return self._find_node(prefix.lower()) is not None

    def _find_node(self, prefix: str) -> Optional[TrieNode]:
        """Navigate to the node representing the given prefix."""
        node = self.root
        for char in prefix:
            if char not in node.children:
                return None
            node = node.children[char]
        return node

    def autocomplete(self, prefix: str, limit: int = 10) -> list[str]:
        """
        Return up to `limit` words that start with `prefix`,
        sorted by frequency (descending).
        """
        node = self._find_node(prefix.lower())
        if not node:
            return []

        results: list[tuple[str, int]] = []
        self._collect_words(node, prefix.lower(), results)

        # Sort by frequency descending, then alphabetically
        results.sort(key=lambda x: (-x[1], x[0]))
        return [word for word, _ in results[:limit]]

    def _collect_words(self, node: TrieNode, current: str, results: list[tuple[str, int]]):
        """DFS to collect all words from a given node."""
        if node.is_end:
            results.append((current, node.frequency))
        for char, child in node.children.items():
            self._collect_words(child, current + char, results)

    def delete(self, word: str) -> bool:
        """Delete a word from the trie. Returns True if word was found and deleted."""
        return self._delete(self.root, word.lower(), 0)

    def _delete(self, node: TrieNode, word: str, depth: int) -> bool:
        if depth == len(word):
            if not node.is_end:
                return False
            node.is_end = False
            node.frequency = 0
            self._size -= 1
            return len(node.children) == 0

        char = word[depth]
        if char not in node.children:
            return False

        should_delete = self._delete(node.children[char], word, depth + 1)
        if should_delete:
            del node.children[char]
            return not node.is_end and len(node.children) == 0

        return False

    def size(self) -> int:
        return self._size

    def get_all_words(self) -> list[str]:
        """Return all words in the trie."""
        results: list[tuple[str, int]] = []
        self._collect_words(self.root, "", results)
        return [word for word, _ in results]

    def clear(self):
        self.root = TrieNode()
        self._size = 0
