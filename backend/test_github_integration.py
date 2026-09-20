"""
MeshVault GitHub API Integration Automated Test Suite
Verifies:
1. URL Parsing & Normalization
2. GitHub Service Mock API Calls (Repo Info, Commits, Contributors, Issues, Pulls)
3. Database Model & Migration Persistence
4. FastAPI Endpoints & Authorization Logic
"""

import sys
import os
import unittest
from unittest.mock import patch, MagicMock

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from github_service import (
    parse_github_url,
    fetch_repo_info,
    fetch_commits,
    fetch_contributors,
    fetch_issues,
    fetch_pulls,
)
from database import SessionLocal, Base, engine
from models import User, Group, GroupMembership, Project, ProjectGitHub, UserSession
from fastapi import HTTPException
from routes import _get_project_with_access_check


class TestGitHubURLParsing(unittest.TestCase):
    def test_valid_urls(self):
        valid_cases = [
            ("https://github.com/octocat/Hello-World", ("octocat", "Hello-World")),
            ("https://github.com/octocat/Hello-World.git", ("octocat", "Hello-World")),
            ("https://github.com/octocat/Hello-World/", ("octocat", "Hello-World")),
            ("http://github.com/facebook/react", ("facebook", "react")),
            ("github.com/vercel/next.js", ("vercel", "next.js")),
        ]
        for url_input, expected in valid_cases:
            with self.subTest(url=url_input):
                result = parse_github_url(url_input)
                self.assertEqual(result, expected)

    def test_invalid_urls(self):
        invalid_cases = [
            "",
            "https://notgithub.com/octocat/Hello-World",
            "https://github.com/octocat",
            "https://github.com/",
            "invalid-url-string",
        ]
        for url_input in invalid_cases:
            with self.subTest(url=url_input):
                with self.assertRaises(ValueError):
                    parse_github_url(url_input)


class TestGitHubServiceFetching(unittest.TestCase):
    @patch("github_service._make_github_request")
    def test_fetch_repo_info(self, mock_request):
        mock_request.return_value = {
            "name": "meshvault",
            "owner": {"login": "team-alpha"},
            "description": "Academic project manager",
            "html_url": "https://github.com/team-alpha/meshvault",
            "default_branch": "main",
            "language": "Python",
            "stargazers_count": 42,
            "forks_count": 10,
            "open_issues_count": 3,
        }
        res = fetch_repo_info("team-alpha", "meshvault")
        self.assertEqual(res["name"], "meshvault")
        self.assertEqual(res["owner"], "team-alpha")
        self.assertEqual(res["stars"], 42)
        self.assertEqual(res["language"], "Python")

    @patch("github_service._make_github_request")
    def test_fetch_commits(self, mock_request):
        mock_request.return_value = [
            {
                "sha": "a1b2c3d4e5f6789",
                "commit": {
                    "message": "feat: add GitHub service\n\nDetailed explanation",
                    "author": {"name": "Alice", "date": "2026-09-20T12:00:00Z"},
                },
                "author": {"login": "alice_gh"},
                "html_url": "https://github.com/owner/repo/commit/a1b2c3d",
            }
        ]
        commits = fetch_commits("owner", "repo", limit=5)
        self.assertEqual(len(commits), 1)
        self.assertEqual(commits[0]["sha"], "a1b2c3d")
        self.assertEqual(commits[0]["message"], "feat: add GitHub service")
        self.assertEqual(commits[0]["author"], "alice_gh")

    @patch("github_service._make_github_request")
    def test_fetch_contributors(self, mock_request):
        mock_request.return_value = [
            {
                "login": "octocat",
                "avatar_url": "https://avatars.githubusercontent.com/u/583231",
                "contributions": 150,
                "html_url": "https://github.com/octocat",
            }
        ]
        contribs = fetch_contributors("owner", "repo", limit=5)
        self.assertEqual(len(contribs), 1)
        self.assertEqual(contribs[0]["username"], "octocat")
        self.assertEqual(contribs[0]["contributions"], 150)

    @patch("github_service._make_github_request")
    def test_fetch_issues(self, mock_request):
        mock_request.return_value = [
            {
                "number": 101,
                "title": "Bug in rubric calculation",
                "state": "open",
                "user": {"login": "student1"},
                "labels": [{"name": "bug"}, {"name": "high-priority"}],
                "created_at": "2026-09-19T10:00:00Z",
                "html_url": "https://github.com/owner/repo/issues/101",
            },
            {
                "number": 102,
                "title": "Pull Request title",
                "state": "open",
                "pull_request": {},
            },
        ]
        issues = fetch_issues("owner", "repo", limit=5)
        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]["number"], 101)
        self.assertEqual(issues[0]["title"], "Bug in rubric calculation")
        self.assertIn("bug", issues[0]["labels"])

    @patch("github_service._make_github_request")
    def test_fetch_pulls(self, mock_request):
        mock_request.return_value = [
            {
                "number": 12,
                "title": "feat: GitHub Integration",
                "state": "open",
                "user": {"login": "dev_user"},
                "created_at": "2026-09-20T08:00:00Z",
                "updated_at": "2026-09-20T09:00:00Z",
                "html_url": "https://github.com/owner/repo/pull/12",
            }
        ]
        pulls = fetch_pulls("owner", "repo", limit=5)
        self.assertEqual(len(pulls), 1)
        self.assertEqual(pulls[0]["number"], 12)
        self.assertEqual(pulls[0]["author"], "dev_user")


class TestGitHubDatabaseAndAuth(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_database_association(self):
        # Fetch or mock a project in DB
        proj = self.db.query(Project).first()
        if not proj:
            self.skipTest("No projects in database to test association.")

        # Remove existing association if any
        existing = self.db.query(ProjectGitHub).filter(ProjectGitHub.project_id == proj.id).first()
        if existing:
            self.db.delete(existing)
            self.db.commit()

        # Add new association
        gh_assoc = ProjectGitHub(
            project_id=proj.id,
            github_owner="test-owner",
            github_repo="test-repo",
            github_url="https://github.com/test-owner/test-repo",
        )
        self.db.add(gh_assoc)
        self.db.commit()

        # Query back
        reloaded = self.db.query(ProjectGitHub).filter(ProjectGitHub.project_id == proj.id).first()
        self.assertIsNotNone(reloaded)
        self.assertEqual(reloaded.github_owner, "test-owner")
        self.assertEqual(reloaded.github_repo, "test-repo")

        # Clean up test row
        self.db.delete(reloaded)
        self.db.commit()

    def test_authorization_check(self):
        proj = self.db.query(Project).first()
        if not proj:
            self.skipTest("No project in DB to test authorization.")

        # Find member of the project group
        membership = self.db.query(GroupMembership).filter(GroupMembership.group_id == proj.group_id).first()
        if membership:
            authorized_user = self.db.query(User).filter(User.id == membership.user_id).first()
            p = _get_project_with_access_check(proj.project_id, authorized_user, self.db)
            self.assertEqual(p.id, proj.id)

        # Non-member student
        other_user = self.db.query(User).filter(User.role == "STUDENT").all()
        for u in other_user:
            is_mem = self.db.query(GroupMembership).filter(
                GroupMembership.group_id == proj.group_id,
                GroupMembership.user_id == u.id
            ).first()
            if not is_mem:
                with self.assertRaises(HTTPException) as ctx:
                    _get_project_with_access_check(proj.project_id, u, self.db)
                self.assertEqual(ctx.exception.status_code, 403)
                break


if __name__ == "__main__":
    print("==================================================")
    print("  Running MeshVault GitHub Integration Test Suite ")
    print("==================================================")
    unittest.main()
