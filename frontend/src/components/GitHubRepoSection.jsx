import React, { useState, useEffect } from 'react';
import projectService from '../services/projectService';

export default function GitHubRepoSection({ projectId }) {
  const [repoState, setRepoState] = useState(null); // { linked: bool, data: obj }
  const [loadingRepo, setLoadingRepo] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Active tab inside connected repo view: 'commits' | 'contributors' | 'pulls' | 'issues'
  const [activeTab, setActiveTab] = useState('commits');

  // Tab Data States
  const [commits, setCommits] = useState([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [commitsError, setCommitsError] = useState('');

  const [contributors, setContributors] = useState([]);
  const [loadingContributors, setLoadingContributors] = useState(false);
  const [contributorsError, setContributorsError] = useState('');

  const [pulls, setPulls] = useState([]);
  const [loadingPulls, setLoadingPulls] = useState(false);
  const [pullsError, setPullsError] = useState('');

  const [issues, setIssues] = useState([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [issuesError, setIssuesError] = useState('');

  // 1. Initial Load: Check if GitHub repository is connected
  useEffect(() => {
    if (!projectId) return;
    fetchRepoInfo();
  }, [projectId]);

  const fetchRepoInfo = async () => {
    setLoadingRepo(true);
    setError('');
    try {
      const res = await projectService.getGitHubInfo(projectId);
      setRepoState(res);
      if (res && res.linked) {
        // Load default tab (commits)
        loadTabContent('commits');
      }
    } catch (err) {
      setError(err.message || 'Failed to load GitHub repository details.');
    } finally {
      setLoadingRepo(false);
    }
  };

  // 2. Fetch Tab Content on Demand
  const loadTabContent = (tabName) => {
    setActiveTab(tabName);
    if (tabName === 'commits' && commits.length === 0) {
      fetchCommits();
    } else if (tabName === 'contributors' && contributors.length === 0) {
      fetchContributors();
    } else if (tabName === 'pulls' && pulls.length === 0) {
      fetchPulls();
    } else if (tabName === 'issues' && issues.length === 0) {
      fetchIssues();
    }
  };

  const fetchCommits = async () => {
    setLoadingCommits(true);
    setCommitsError('');
    try {
      const data = await projectService.getGitHubCommits(projectId);
      setCommits(data || []);
    } catch (err) {
      setCommitsError(err.message || 'Failed to fetch commits.');
    } finally {
      setLoadingCommits(false);
    }
  };

  const fetchContributors = async () => {
    setLoadingContributors(true);
    setContributorsError('');
    try {
      const data = await projectService.getGitHubContributors(projectId);
      setContributors(data || []);
    } catch (err) {
      setContributorsError(err.message || 'Failed to fetch contributors.');
    } finally {
      setLoadingContributors(false);
    }
  };

  const fetchPulls = async () => {
    setLoadingPulls(true);
    setPullsError('');
    try {
      const data = await projectService.getGitHubPulls(projectId);
      setPulls(data || []);
    } catch (err) {
      setPullsError(err.message || 'Failed to fetch pull requests.');
    } finally {
      setLoadingPulls(false);
    }
  };

  const fetchIssues = async () => {
    setLoadingIssues(true);
    setIssuesError('');
    try {
      const data = await projectService.getGitHubIssues(projectId);
      setIssues(data || []);
    } catch (err) {
      setIssuesError(err.message || 'Failed to fetch issues.');
    } finally {
      setLoadingIssues(false);
    }
  };

  // 3. Connect GitHub Repository
  const handleConnect = async (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) {
      setError('Please enter a valid GitHub repository URL.');
      return;
    }
    setConnecting(true);
    setError('');
    setSuccess('');
    try {
      const res = await projectService.connectGitHub(projectId, repoUrl.trim());
      setRepoState({ linked: true, data: res.data });
      setSuccess(`Connected repository: ${res.data.owner}/${res.data.name}`);
      setShowConnectForm(false);
      setRepoUrl('');
      // Reset and reload tab content
      setCommits([]);
      setContributors([]);
      setPulls([]);
      setIssues([]);
      loadTabContent('commits');
    } catch (err) {
      setError(err.message || 'Failed to connect repository. Check the URL and accessibility.');
    } finally {
      setConnecting(false);
    }
  };

  // 4. Disconnect GitHub Repository
  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect this GitHub repository?')) return;
    setError('');
    setSuccess('');
    try {
      await projectService.disconnectGitHub(projectId);
      setRepoState({ linked: false, data: null });
      setSuccess('Repository unlinked successfully.');
      setShowConnectForm(false);
      setCommits([]);
      setContributors([]);
      setPulls([]);
      setIssues([]);
    } catch (err) {
      setError(err.message || 'Failed to disconnect repository.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loadingRepo) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
        <p style={{ color: 'var(--text-muted, #64748b)', margin: 0 }}>⏳ Checking GitHub repository association...</p>
      </div>
    );
  }

  const isLinked = repoState && repoState.linked && repoState.data;
  const repo = isLinked ? repoState.data : null;

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      {/* Header / Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🐙</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-main, #0f172a)' }}>
              GitHub Repository
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
              Track codebase activity, commits, contributors, issues, and pull requests directly in MeshVault.
            </p>
          </div>
        </div>

        {isLinked ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--secondary btn--sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
            >
              <span>↗</span> View on GitHub
            </a>
            <button
              onClick={() => setShowConnectForm(!showConnectForm)}
              className="btn btn--outline btn--sm"
            >
              ⚙ Change Repo
            </button>
            <button
              onClick={handleDisconnect}
              className="btn btn--danger btn--sm"
            >
              Disconnect
            </button>
          </div>
        ) : (
          !showConnectForm && (
            <button
              onClick={() => setShowConnectForm(true)}
              className="btn btn--primary btn--sm"
            >
              ➕ Connect GitHub
            </button>
          )
        )}
      </div>

      {/* Global Section Alerts */}
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontSize: '14px', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontSize: '14px', marginBottom: '16px' }}>
          ✓ {success}
        </div>
      )}

      {/* Connect / Change Repository Form */}
      {(showConnectForm || !isLinked) && (
        <form onSubmit={handleConnect} style={{ background: 'var(--bg-subtle, #f8fafc)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', marginBottom: isLinked ? '20px' : '0' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: 'var(--text-main, #0f172a)' }}>
            GitHub Repository URL
          </label>
          <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', margin: '0 0 10px 0' }}>
            Paste the public repository URL (e.g. <code>https://github.com/owner/repository</code>). No GitHub login required.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="url"
              placeholder="https://github.com/owner/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              required
              style={{ flex: '1', minWidth: '260px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '14px' }}
            />
            <button
              type="submit"
              disabled={connecting}
              className="btn btn--primary btn--sm"
            >
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
            {isLinked && (
              <button
                type="button"
                onClick={() => setShowConnectForm(false)}
                className="btn btn--secondary btn--sm"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {/* Connected Repository Overview Card */}
      {isLinked && repo && (
        <div>
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '18px', fontWeight: '700', color: 'var(--clr-primary, #2563eb)', textDecoration: 'none' }}
                >
                  {repo.owner} / {repo.name}
                </a>
                {repo.description && (
                  <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: 'var(--text-muted, #475569)' }}>
                    {repo.description}
                  </p>
                )}
              </div>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '14px', flexWrap: 'wrap', fontSize: '13px' }}>
              {repo.language && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px', background: '#eff6ff', color: '#1d4ed8', fontWeight: '500' }}>
                  💻 {repo.language}
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px', background: '#fef9c3', color: '#854d0e', fontWeight: '500' }}>
                ⭐ {repo.stars} stars
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px', background: '#f3e8ff', color: '#6b21a8', fontWeight: '500' }}>
                🍴 {repo.forks} forks
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px', background: '#fee2e2', color: '#991b1b', fontWeight: '500' }}>
                🐞 {repo.open_issues} open issues
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', fontWeight: '500' }}>
                🌿 Default branch: <code>{repo.default_branch}</code>
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto' }}>
            <button
              onClick={() => loadTabContent('commits')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'commits' ? '2px solid var(--clr-primary, #2563eb)' : '2px solid transparent',
                color: activeTab === 'commits' ? 'var(--clr-primary, #2563eb)' : 'var(--text-muted, #64748b)',
                fontWeight: activeTab === 'commits' ? '600' : '400',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              📝 Recent Commits
            </button>

            <button
              onClick={() => loadTabContent('contributors')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'contributors' ? '2px solid var(--clr-primary, #2563eb)' : '2px solid transparent',
                color: activeTab === 'contributors' ? 'var(--clr-primary, #2563eb)' : 'var(--text-muted, #64748b)',
                fontWeight: activeTab === 'contributors' ? '600' : '400',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              👥 Contributors
            </button>

            <button
              onClick={() => loadTabContent('pulls')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'pulls' ? '2px solid var(--clr-primary, #2563eb)' : '2px solid transparent',
                color: activeTab === 'pulls' ? 'var(--clr-primary, #2563eb)' : 'var(--text-muted, #64748b)',
                fontWeight: activeTab === 'pulls' ? '600' : '400',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              🔀 Pull Requests
            </button>

            <button
              onClick={() => loadTabContent('issues')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'issues' ? '2px solid var(--clr-primary, #2563eb)' : '2px solid transparent',
                color: activeTab === 'issues' ? 'var(--clr-primary, #2563eb)' : 'var(--text-muted, #64748b)',
                fontWeight: activeTab === 'issues' ? '600' : '400',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              🐞 Issues
            </button>
          </div>

          {/* TAB 1: COMMITS */}
          {activeTab === 'commits' && (
            <div>
              {loadingCommits ? (
                <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>⏳ Loading commits...</p>
              ) : commitsError ? (
                <p style={{ color: '#dc2626', fontSize: '14px' }}>⚠️ {commitsError}</p>
              ) : commits.length === 0 ? (
                <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>No recent commits found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {commits.map((c, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-card, #ffffff)' }}>
                      <div>
                        <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: '500', color: 'var(--text-main, #0f172a)', textDecoration: 'none', fontSize: '14px' }}>
                          {c.message}
                        </a>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
                          <span>by <strong>{c.author}</strong></span> • <span>{formatDate(c.date)}</span>
                        </div>
                      </div>
                      <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'monospace', fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#0f172a', textDecoration: 'none' }}>
                        {c.sha}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONTRIBUTORS */}
          {activeTab === 'contributors' && (
            <div>
              {loadingContributors ? (
                <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>⏳ Loading contributors...</p>
              ) : contributorsError ? (
                <p style={{ color: '#dc2626', fontSize: '14px' }}>⚠️ {contributorsError}</p>
              ) : contributors.length === 0 ? (
                <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>No contributors found.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {contributors.map((c, idx) => (
                    <a key={idx} href={c.profile_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', textDecoration: 'none', background: 'var(--bg-card, #ffffff)' }}>
                      <img src={c.avatar} alt={c.username} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-main, #0f172a)', fontSize: '14px' }}>{c.username}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>{c.contributions} contributions</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PULL REQUESTS */}
          {activeTab === 'pulls' && (
            <div>
              {loadingPulls ? (
                <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>⏳ Loading pull requests...</p>
              ) : pullsError ? (
                <p style={{ color: '#dc2626', fontSize: '14px' }}>⚠️ {pullsError}</p>
              ) : pulls.length === 0 ? (
                <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>No pull requests found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pulls.map((pr, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-card, #ffffff)' }}>
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginRight: '6px' }}>#{pr.number}</span>
                        <a href={pr.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: '500', color: 'var(--text-main, #0f172a)', textDecoration: 'none', fontSize: '14px' }}>
                          {pr.title}
                        </a>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
                          <span>by <strong>{pr.author}</strong></span> • <span>Created {formatDate(pr.created_at)}</span>
                        </div>
                      </div>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        backgroundColor: pr.state === 'open' ? '#dcfce7' : '#f1f5f9',
                        color: pr.state === 'open' ? '#15803d' : '#475569',
                      }}>
                        {pr.state}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ISSUES */}
          {activeTab === 'issues' && (
            <div>
              {loadingIssues ? (
                <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>⏳ Loading issues...</p>
              ) : issuesError ? (
                <p style={{ color: '#dc2626', fontSize: '14px' }}>⚠️ {issuesError}</p>
              ) : issues.length === 0 ? (
                <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>No issues found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {issues.map((iss, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-card, #ffffff)' }}>
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginRight: '6px' }}>#{iss.number}</span>
                        <a href={iss.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: '500', color: 'var(--text-main, #0f172a)', textDecoration: 'none', fontSize: '14px' }}>
                          {iss.title}
                        </a>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '4px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span>by <strong>{iss.author}</strong></span> • <span>Created {formatDate(iss.created_at)}</span>
                          {iss.labels && iss.labels.map((lbl, lIdx) => (
                            <span key={lIdx} style={{ background: '#e2e8f0', color: '#334155', padding: '1px 6px', borderRadius: '4px', fontSize: '10px' }}>
                              {lbl}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        backgroundColor: iss.state === 'open' ? '#fee2e2' : '#f1f5f9',
                        color: iss.state === 'open' ? '#991b1b' : '#475569',
                      }}>
                        {iss.state}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
