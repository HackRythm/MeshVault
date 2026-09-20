"""
MeshVault GitHub Service
Handles GitHub REST API interaction, repository URL parsing, and data retrieval.
"""

import json
from typing import Tuple, List, Dict, Any, Optional
from urllib.parse import urlparse
import urllib.request
import urllib.error

from fastapi import HTTPException
from config import GITHUB_TOKEN


def parse_github_url(url: str) -> Tuple[str, str]:
    """
    Validate and extract owner and repository name from a GitHub repository URL.
    Example inputs:
      - https://github.com/owner/repository
      - https://github.com/owner/repository.git
      - https://github.com/owner/repository/
    """
    if not url or not isinstance(url, str):
        raise ValueError("GitHub URL is required.")

    cleaned_url = url.strip()
    if not cleaned_url.startswith(("http://", "https://")):
        cleaned_url = "https://" + cleaned_url

    parsed = urlparse(cleaned_url)
    hostname = (parsed.hostname or "").lower()

    if hostname not in ("github.com", "www.github.com"):
        raise ValueError("URL must be a valid github.com repository URL.")

    path_parts = [part for part in parsed.path.strip("/").split("/") if part]

    if len(path_parts) < 2:
        raise ValueError("Invalid GitHub repository URL format. Expected: https://github.com/owner/repository")

    owner = path_parts[0]
    repo = path_parts[1]

    if repo.endswith(".git"):
        repo = repo[:-4]

    if not owner or not repo:
        raise ValueError("Could not parse owner and repository name from URL.")

    return owner, repo


def _make_github_request(endpoint: str) -> Any:
    """
    Execute an HTTP GET request to the GitHub REST API.
    Uses GITHUB_TOKEN if configured. Handles timeouts and API errors.
    """
    url = f"https://api.github.com{endpoint}"
    headers = {
        "User-Agent": "MeshVault-App",
        "Accept": "application/vnd.github.v3+json",
    }

    if GITHUB_TOKEN and GITHUB_TOKEN.strip():
        token = GITHUB_TOKEN.strip()
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, headers=headers, method="GET")

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            status = response.status
            content = response.read().decode("utf-8")
            if content:
                return json.loads(content)
            return None
    except urllib.error.HTTPError as e:
        error_body = ""
        try:
            error_body = e.read().decode("utf-8")
            parsed_body = json.loads(error_body)
            msg = parsed_body.get("message", "")
        except Exception:
            msg = ""

        if e.code == 404:
            raise HTTPException(
                status_code=404,
                detail="Repository not found or is private/inaccessible."
            )
        elif e.code in (401, 403):
            detail_msg = msg if msg else "Access forbidden or GitHub API rate limit exceeded."
            raise HTTPException(status_code=e.code, detail=detail_msg)
        else:
            detail_msg = f"GitHub API error ({e.code}): {msg}" if msg else f"GitHub API error (HTTP {e.code})"
            raise HTTPException(status_code=e.code, detail=detail_msg)
    except urllib.error.URLError as e:
        raise HTTPException(
            status_code=504,
            detail=f"Failed to connect to GitHub API: {str(e.reason)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error communicating with GitHub: {str(e)}"
        )


def fetch_repo_info(owner: str, repo: str) -> Dict[str, Any]:
    """Fetch GitHub repository metadata."""
    data = _make_github_request(f"/repos/{owner}/{repo}")
    if not isinstance(data, dict):
        raise HTTPException(status_code=500, detail="Invalid response structure from GitHub API.")

    return {
        "name": data.get("name", repo),
        "owner": data.get("owner", {}).get("login", owner),
        "description": data.get("description"),
        "url": data.get("html_url", f"https://github.com/{owner}/{repo}"),
        "default_branch": data.get("default_branch", "main"),
        "language": data.get("language"),
        "stars": data.get("stargazers_count", 0),
        "forks": data.get("forks_count", 0),
        "open_issues": data.get("open_issues_count", 0),
    }


def fetch_commits(owner: str, repo: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Fetch recent commits for a repository."""
    data = _make_github_request(f"/repos/{owner}/{repo}/commits?per_page={limit}")
    if not isinstance(data, list):
        return []

    commits = []
    for item in data:
        commit_obj = item.get("commit", {})
        author_obj = commit_obj.get("author", {}) or {}
        user_obj = item.get("author", {}) or {}

        sha = item.get("sha", "")
        short_sha = sha[:7] if sha else ""
        raw_msg = commit_obj.get("message", "")
        first_line_msg = raw_msg.split("\n")[0] if raw_msg else ""
        author_name = user_obj.get("login") or author_obj.get("name") or "Unknown"
        date_str = author_obj.get("date") or ""
        html_url = item.get("html_url") or f"https://github.com/{owner}/{repo}/commit/{sha}"

        commits.append({
            "sha": short_sha,
            "message": first_line_msg,
            "author": author_name,
            "date": date_str,
            "url": html_url,
        })

    return commits


def fetch_contributors(owner: str, repo: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Fetch repository contributors."""
    data = _make_github_request(f"/repos/{owner}/{repo}/contributors?per_page={limit}")
    if not isinstance(data, list):
        return []

    contributors = []
    for item in data:
        contributors.append({
            "username": item.get("login", ""),
            "avatar": item.get("avatar_url", ""),
            "contributions": item.get("contributions", 0),
            "profile_url": item.get("html_url", f"https://github.com/{item.get('login', '')}"),
        })

    return contributors


def fetch_issues(owner: str, repo: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Fetch issues for a repository (excluding pull requests)."""
    data = _make_github_request(f"/repos/{owner}/{repo}/issues?per_page={limit * 2}&state=all")
    if not isinstance(data, list):
        return []

    issues = []
    for item in data:
        # Filter out PRs
        if "pull_request" in item:
            continue

        raw_labels = item.get("labels", [])
        labels = [
            l.get("name") if isinstance(l, dict) else str(l)
            for l in raw_labels
        ]

        issues.append({
            "number": item.get("number"),
            "title": item.get("title", ""),
            "state": item.get("state", "open"),
            "author": item.get("user", {}).get("login", "Unknown"),
            "labels": labels,
            "created_at": item.get("created_at", ""),
            "url": item.get("html_url", ""),
        })

        if len(issues) >= limit:
            break

    return issues


def fetch_pulls(owner: str, repo: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Fetch pull requests for a repository."""
    data = _make_github_request(f"/repos/{owner}/{repo}/pulls?per_page={limit}&state=all")
    if not isinstance(data, list):
        return []

    pulls = []
    for item in data:
        pulls.append({
            "number": item.get("number"),
            "title": item.get("title", ""),
            "state": item.get("state", "open"),
            "author": item.get("user", {}).get("login", "Unknown"),
            "created_at": item.get("created_at", ""),
            "updated_at": item.get("updated_at", ""),
            "url": item.get("html_url", ""),
        })

    return pulls
