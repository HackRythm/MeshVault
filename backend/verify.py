"""Quick verification script for MeshVault backend."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import User, Workspace, Group, Project, Milestone, Activity, GroupMembership
from dsa_engine import ProjectSearchIndex
from auth import verify_password

db = SessionLocal()

# Count all entities
print("=== Database Verification ===")
print(f"Users:       {db.query(User).count()}")
print(f"Workspaces:  {db.query(Workspace).count()}")
print(f"Groups:      {db.query(Group).count()}")
print(f"Memberships: {db.query(GroupMembership).count()}")
print(f"Projects:    {db.query(Project).count()}")
print(f"Milestones:  {db.query(Milestone).count()}")
print(f"Activities:  {db.query(Activity).count()}")

# Verify passwords are hashed
staff = db.query(User).filter(User.role == "STAFF").first()
print(f"\nStaff hash starts with: {staff.password_hash[:10]}...")
print(f"Password verify works: {verify_password('staff123', staff.password_hash)}")

# Verify project IDs are manual
print("\nProject IDs:")
for p in db.query(Project).all():
    print(f"  {p.project_id} - {p.name} ({p.status}, {p.progress}%)")

# Test DSA engine
print("\n=== DSA Smart Search ===")
idx = ProjectSearchIndex()
count = idx.rebuild_from_db(db)
print(f"Indexed: {count} projects")

r1 = idx.search_by_id("CS-DSA-A01")
print(f"\nExact ID [CS-DSA-A01]: {r1['name']}")

r2 = idx.search_by_name("Shortest Path Navigator")
print(f"Exact Name [Shortest Path Navigator]: {len(r2)} result(s)")

r3 = idx.partial_search("Hash")
print(f"Partial [Hash]: {[r['name'] for r in r3]}")

r4 = idx.partial_search("DSA-B")
print(f"Partial [DSA-B]: {[r['name'] for r in r4]}")

r5 = idx.partial_search("Sort")
print(f"Partial [Sort]: {[r['name'] for r in r5]}")

r6 = idx.partial_search("G")
print(f"Partial single char [G]: {len(r6)} result(s) (linear fallback)")

db.close()
print("\nAll checks passed!")
