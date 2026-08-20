"""
MeshVault DSA Engine
====================
Centralised module for all DSA implementations used by MeshVault.

CURRENT IMPLEMENTATION (Phase 1):
  - ProjectSearchIndex  →  Hash-table based Smart Search

FUTURE IMPLEMENTATIONS (to be added to this file):
  - Min-Heap            →  Priority Engine
  - AVL Tree            →  Progress Analytics
  - 0/1 Knapsack        →  Sprint Optimizer
  - Merkle Tree         →  Audit Trail
  - Trie                →  Advanced Search
  - Graph               →  Algorithm Lab
"""

from sqlalchemy.orm import Session


# ─────────────────────────────────────────────────────────────────────────────
# Smart Search — Hash-Table Based Project Search Index
# ─────────────────────────────────────────────────────────────────────────────

class ProjectSearchIndex:
    """
    A hash-table / dictionary-based search index for MeshVault projects.

    Maintains three internal indexes:
      _id_index        : project_id  →  project data dict   (exact lookup)
      _name_index      : lowercase name  →  [project data]  (exact lookup)
      _fragment_index  : substring  →  {project_ids}        (partial search)

    The fragment index pre-computes all substrings (length >= 2) of both
    project_id and project name, enabling O(1) partial-match lookups at
    the cost of additional memory.
    """

    # Minimum substring length stored in the fragment index
    _MIN_FRAGMENT_LENGTH = 2

    def __init__(self):
        self._id_index: dict[str, dict] = {}
        self._name_index: dict[str, list[dict]] = {}
        self._fragment_index: dict[str, set[str]] = {}

    # ── Index size ───────────────────────────────────────────────────────

    @property
    def size(self) -> int:
        """Number of projects currently indexed."""
        return len(self._id_index)

    # ── Internal helpers ─────────────────────────────────────────────────

    @staticmethod
    def _project_to_data(project) -> dict:
        """Convert a SQLAlchemy Project instance to a plain dict."""
        return {
            "id": project.id,
            "project_id": project.project_id,
            "name": project.name,
            "description": project.description,
            "workspace_id": project.workspace_id,
            "group_id": project.group_id,
            "course": project.course,
            "status": project.status,
            "priority": project.priority,
            "progress": project.progress,
            "deadline": str(project.deadline) if project.deadline else None,
            "created_at": str(project.created_at) if project.created_at else None,
            "updated_at": str(project.updated_at) if project.updated_at else None,
        }

    @classmethod
    def _generate_fragments(cls, text: str) -> set[str]:
        """
        Generate all substrings of `text` with length >= _MIN_FRAGMENT_LENGTH.

        This is the core of the hash-table approach: each fragment becomes
        a key in _fragment_index, mapping to the set of project_ids whose
        name or project_id contains that fragment.
        """
        text = text.lower()
        fragments: set[str] = set()
        min_len = cls._MIN_FRAGMENT_LENGTH
        for i in range(len(text)):
            for j in range(i + min_len, len(text) + 1):
                fragments.add(text[i:j])
        return fragments

    # ── Public API ───────────────────────────────────────────────────────

    def add_project(self, project) -> None:
        """
        Add a project to the search index.

        Accepts either a SQLAlchemy Project model instance or a dict with
        at least 'project_id' and 'name' keys.
        """
        if isinstance(project, dict):
            data = project
            pid = data["project_id"]
            name = data["name"]
        else:
            data = self._project_to_data(project)
            pid = project.project_id
            name = project.name

        # 1. Exact ID index
        self._id_index[pid] = data

        # 2. Exact name index
        name_key = name.lower()
        if name_key not in self._name_index:
            self._name_index[name_key] = []
        self._name_index[name_key].append(data)

        # 3. Fragment index for partial search
        fragments = self._generate_fragments(pid)
        fragments |= self._generate_fragments(name)
        for frag in fragments:
            if frag not in self._fragment_index:
                self._fragment_index[frag] = set()
            self._fragment_index[frag].add(pid)

    def remove_project(self, project_id: str) -> bool:
        """
        Remove a project from the search index by its project_id.

        Returns True if the project was found and removed, False otherwise.
        """
        data = self._id_index.pop(project_id, None)
        if data is None:
            return False

        # Remove from name index
        name_key = data["name"].lower()
        if name_key in self._name_index:
            self._name_index[name_key] = [
                p for p in self._name_index[name_key]
                if p["project_id"] != project_id
            ]
            if not self._name_index[name_key]:
                del self._name_index[name_key]

        # Remove from fragment index
        fragments = self._generate_fragments(project_id)
        fragments |= self._generate_fragments(data["name"])
        for frag in fragments:
            if frag in self._fragment_index:
                self._fragment_index[frag].discard(project_id)
                if not self._fragment_index[frag]:
                    del self._fragment_index[frag]

        return True

    def search_by_id(self, project_id: str) -> dict | None:
        """
        Exact lookup by project_id.

        Returns the project data dict, or None if not found.
        """
        return self._id_index.get(project_id)

    def search_by_name(self, name: str) -> list[dict]:
        """
        Exact lookup by project name (case-insensitive).

        Returns a list of matching project data dicts.
        """
        return list(self._name_index.get(name.lower(), []))

    def partial_search(self, query: str) -> list[dict]:
        """
        Partial / substring search across project IDs and names.

        Uses the pre-built fragment index for O(1) key lookup, then
        resolves matching project_ids back to their data dicts.

        Returns a list of matching project data dicts (deduplicated).
        """
        if len(query) < self._MIN_FRAGMENT_LENGTH:
            # Query too short for fragment index — fall back to linear scan
            query_lower = query.lower()
            return [
                data for data in self._id_index.values()
                if query_lower in data["project_id"].lower()
                or query_lower in data["name"].lower()
            ]

        query_lower = query.lower()
        matching_ids = self._fragment_index.get(query_lower, set())
        return [
            self._id_index[pid]
            for pid in matching_ids
            if pid in self._id_index
        ]

    def rebuild_from_db(self, db_session: Session) -> int:
        """
        Clear and rebuild the entire search index from the SQLite database.

        Should be called on application startup and whenever a full
        re-index is needed.

        Returns the number of projects indexed.
        """
        from models import Project

        self._id_index.clear()
        self._name_index.clear()
        self._fragment_index.clear()

        projects = db_session.query(Project).all()
        for project in projects:
            self.add_project(project)

        return len(projects)


# ─────────────────────────────────────────────────────────────────────────────
# Progress Explorer — Binary Search Tree (BST)
# ─────────────────────────────────────────────────────────────────────────────

class BSTNode:
    def __init__(self, project: dict):
        self.progress: float = project["progress"]
        self.projects: list[dict] = [project]
        self.left: BSTNode | None = None
        self.right: BSTNode | None = None


class ProgressBST:
    """
    A Binary Search Tree (BST) organizing project data by progress.
    
    Complexity Analysis:
    --------------------
    Average Case:
      - Search:  O(log n)
      - Insert:  O(log n)
      - Delete:  O(log n)
    Worst Case (Unbalanced / Skewed Tree):
      - Search:  O(n)
      - Insert:  O(n)
      - Delete:  O(n)
    Traversals:
      - Inorder: O(n) (visits every node once)
    """

    def __init__(self):
        self.root: BSTNode | None = None

    def insert(self, project: dict) -> None:
        """Insert a project into the BST based on progress."""
        new_progress = project["progress"]
        if not self.root:
            self.root = BSTNode(project)
            return

        current = self.root
        while True:
            if abs(current.progress - new_progress) < 1e-5:
                # Deduplicate check to avoid adding the exact same project multiple times
                if not any(p["project_id"] == project["project_id"] for p in current.projects):
                    current.projects.append(project)
                return
            elif new_progress < current.progress:
                if not current.left:
                    current.left = BSTNode(project)
                    return
                current = current.left
            else:
                if not current.right:
                    current.right = BSTNode(project)
                    return
                current = current.right

    def search(self, progress: float) -> list[dict]:
        """Search for projects with exact progress value."""
        current = self.root
        while current:
            if abs(current.progress - progress) < 1e-5:
                return current.projects
            elif progress < current.progress:
                current = current.left
            else:
                current = current.right
        return []

    def inorder(self) -> list[dict]:
        """Perform an inorder traversal to get projects sorted by progress ascending."""
        results: list[dict] = []
        self._inorder_helper(self.root, results)
        return results

    def _inorder_helper(self, node: BSTNode | None, results: list[dict]) -> None:
        if node:
            self._inorder_helper(node.left, results)
            results.extend(node.projects)
            self._inorder_helper(node.right, results)

    def range_search(self, min_progress: float, max_progress: float) -> list[dict]:
        """Perform range search to return projects with progress in [min, max]."""
        results: list[dict] = []
        self._range_search_helper(self.root, min_progress, max_progress, results)
        return results

    def _range_search_helper(
        self, node: BSTNode | None, min_val: float, max_val: float, results: list[dict]
    ) -> None:
        if not node:
            return

        # Prune search left if node progress is greater than minimum range bound
        if node.progress > min_val:
            self._range_search_helper(node.left, min_val, max_val, results)

        # Collect node values if they fall within bounds
        if min_val <= node.progress <= max_val:
            results.extend(node.projects)

        # Prune search right if node progress is less than maximum range bound
        if node.progress < max_val:
            self._range_search_helper(node.right, min_val, max_val, results)

    def delete(self, project: dict) -> bool:
        """Delete a project from the BST. Re-balances/updates internal node references."""
        pid = project["project_id"]
        progress = project["progress"]

        # Step 1: Find the node and remove the project from its list
        self.root, deleted = self._delete_helper(self.root, progress, pid)
        return deleted

    def _delete_helper(
        self, node: BSTNode | None, progress: float, pid: str
    ) -> tuple[BSTNode | None, bool]:
        if not node:
            return None, False

        deleted = False
        if abs(node.progress - progress) < 1e-5:
            # Found the progress group node
            original_len = len(node.projects)
            node.projects = [p for p in node.projects if p["project_id"] != pid]
            deleted = len(node.projects) < original_len

            # If there are still projects with this progress, keep the node
            if node.projects:
                return node, deleted

            # Otherwise, delete the node from the tree
            if not node.left and not node.right:
                return None, True
            if not node.left:
                return node.right, True
            if not node.right:
                return node.left, True

            # Two children: get inorder successor (smallest in right subtree)
            successor = self._min_node(node.right)
            node.progress = successor.progress
            node.projects = list(successor.projects)  # Copy list reference
            
            # Delete the successor from the right subtree
            # Successor value has to be deleted completely from right subtree
            node.right, _ = self._delete_helper_node_itself(node.right, successor.progress)
            return node, True

        elif progress < node.progress:
            node.left, deleted = self._delete_helper(node.left, progress, pid)
        else:
            node.right, deleted = self._delete_helper(node.right, progress, pid)

        return node, deleted

    def _delete_helper_node_itself(self, node: BSTNode | None, progress: float) -> tuple[BSTNode | None, bool]:
        if not node:
            return None, False

        if abs(node.progress - progress) < 1e-5:
            if not node.left and not node.right:
                return None, True
            if not node.left:
                return node.right, True
            if not node.right:
                return node.left, True

            successor = self._min_node(node.right)
            node.progress = successor.progress
            node.projects = list(successor.projects)
            node.right, _ = self._delete_helper_node_itself(node.right, successor.progress)
            return node, True
        elif progress < node.progress:
            node.left, _ = self._delete_helper_node_itself(node.left, progress)
        else:
            node.right, _ = self._delete_helper_node_itself(node.right, progress)
        return node, True

    @staticmethod
    def _min_node(node: BSTNode) -> BSTNode:
        current = node
        while current.left:
            current = current.left
        return current

    def rebuild_from_db(self, db_session: Session) -> int:
        """Clear and rebuild the entire BST from the SQLite database."""
        from models import Project
        self.root = None
        projects = db_session.query(Project).all()
        for project in projects:
            data = {
                "id": project.id,
                "project_id": project.project_id,
                "name": project.name,
                "description": project.description,
                "workspace_id": project.workspace_id,
                "group_id": project.group_id,
                "course": project.course,
                "status": project.status,
                "priority": project.priority,
                "progress": project.progress,
                "deadline": str(project.deadline) if project.deadline else None,
                "created_at": str(project.created_at) if project.created_at else None,
                "updated_at": str(project.updated_at) if project.updated_at else None,
            }
            self.insert(data)
        return len(projects)


# ─────────────────────────────────────────────────────────────────────────────
# Staff Review Queue — First-In First-Out (FIFO) Queue
# ─────────────────────────────────────────────────────────────────────────────

class ReviewQueue:
    """
    A FIFO Queue representing pending project reviews for Staff.
    
    Complexity Analysis:
    --------------------
    - Enqueue:  O(1)
    - Dequeue:  O(1)
    - Peek:     O(1)
    - Size:     O(1)
    """

    def __init__(self):
        self._items: list[dict] = []

    def enqueue(self, item: dict) -> None:
        """Add an item to the end of the queue."""
        self._items.append(item)

    def dequeue(self) -> dict | None:
        """Remove and return the first item from the queue."""
        if self.is_empty():
            return None
        return self._items.pop(0)

    def peek(self) -> dict | None:
        """Return the first item in the queue without removing it."""
        if self.is_empty():
            return None
        return self._items[0]

    def is_empty(self) -> bool:
        """Return True if the queue contains no elements."""
        return len(self._items) == 0

    def size(self) -> int:
        """Return the number of elements in the queue."""
        return len(self._items)

    def clear(self) -> None:
        """Clear all items in the queue."""
        self._items.clear()

    def rebuild_from_db(self, db_session: Session) -> int:
        """Clear and rebuild the queue with PENDING reviews from the SQLite database."""
        from models import ReviewRequest
        self.clear()
        pending = (
            db_session.query(ReviewRequest)
            .filter(ReviewRequest.status == "PENDING")
            .order_by(ReviewRequest.created_at.asc())
            .all()
        )
        for req in pending:
            data = {
                "id": req.id,
                "project_id": req.project_id,
                "submitted_by": req.submitted_by,
                "request_type": req.request_type,
                "message": req.message,
                "status": req.status,
                "created_at": str(req.created_at),
            }
            self.enqueue(data)
        return len(pending)


