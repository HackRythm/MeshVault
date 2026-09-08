import React, { useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import { useAuth } from '../context/AuthContext';

/* ────────────────────────────────────────────────────────────────────────────
   Simulated GitHub Repository Data
   ──────────────────────────────────────────────────────────────────────────── */
const REPO = {
  name: 'meshvault-dsa-engine',
  owner: 'team-alpha',
  stars: 12,
  forks: 3,
  openIssues: 4,
  language: 'Python',
  defaultBranch: 'main',
  lastPush: '2026-09-08T10:42:00Z',
};

const BRANCHES = [
  { name: 'main', isDefault: true, ahead: 0, behind: 0, lastCommit: '2026-09-08T10:42:00Z' },
  { name: 'feature/priority-engine', isDefault: false, ahead: 3, behind: 1, lastCommit: '2026-09-08T09:15:00Z' },
  { name: 'feature/sprint-optimizer', isDefault: false, ahead: 7, behind: 0, lastCommit: '2026-09-07T22:30:00Z' },
  { name: 'fix/rubric-calc-overflow', isDefault: false, ahead: 1, behind: 2, lastCommit: '2026-09-06T14:00:00Z' },
  { name: 'dev/algorithm-lab', isDefault: false, ahead: 12, behind: 5, lastCommit: '2026-09-08T08:00:00Z' },
];

const COMMITS = [
  { sha: 'a3f2c9d', message: 'feat: implement Min-Heap priority scheduler', author: 'Alex Chen', branch: 'feature/priority-engine', date: '2026-09-08T10:42:00Z', files: 4, additions: 245, deletions: 12 },
  { sha: 'b7e1a4f', message: 'fix: correct BST range query boundary condition', author: 'Maya Johnson', branch: 'main', date: '2026-09-08T09:30:00Z', files: 2, additions: 18, deletions: 7 },
  { sha: 'c5d9b3e', message: 'feat: add 0/1 Knapsack DP engine', author: 'Alex Chen', branch: 'feature/sprint-optimizer', date: '2026-09-07T22:30:00Z', files: 3, additions: 189, deletions: 0 },
  { sha: 'd1f4e8a', message: 'docs: update API specification in FRONTENT.md', author: 'Noah Kim', branch: 'main', date: '2026-09-07T18:00:00Z', files: 1, additions: 56, deletions: 23 },
  { sha: 'e8c2b6d', message: 'fix: rubric weight validation overflow edge case', author: 'Sophia Park', branch: 'fix/rubric-calc-overflow', date: '2026-09-06T14:00:00Z', files: 2, additions: 14, deletions: 8 },
  { sha: 'f3a7d1c', message: 'feat: DAG topological sort with cycle detection', author: 'Alex Chen', branch: 'dev/algorithm-lab', date: '2026-09-06T11:00:00Z', files: 5, additions: 312, deletions: 0 },
  { sha: 'g9b5e2f', message: 'refactor: extract DSA engine into separate module', author: 'Maya Johnson', branch: 'main', date: '2026-09-05T16:00:00Z', files: 8, additions: 511, deletions: 489 },
  { sha: 'h2c8f4a', message: 'test: add review queue FIFO integration tests', author: 'Noah Kim', branch: 'main', date: '2026-09-05T12:00:00Z', files: 1, additions: 87, deletions: 0 },
];

const PULL_REQUESTS = [
  { id: 1, title: 'feat: Min-Heap Priority Engine', author: 'Alex Chen', branch: 'feature/priority-engine', status: 'OPEN', reviewers: ['Dr. Mitchell'], checks: { lint: 'PASS', tests: 'PASS', security: 'PASS' }, created: '2026-09-08T10:45:00Z' },
  { id: 2, title: 'feat: 0/1 Knapsack Sprint Optimizer', author: 'Alex Chen', branch: 'feature/sprint-optimizer', status: 'REVIEW', reviewers: ['Dr. Mitchell', 'Noah Kim'], checks: { lint: 'PASS', tests: 'RUNNING', security: 'PASS' }, created: '2026-09-07T23:00:00Z' },
  { id: 3, title: 'fix: Rubric calculator overflow', author: 'Sophia Park', branch: 'fix/rubric-calc-overflow', status: 'MERGED', reviewers: ['Alex Chen'], checks: { lint: 'PASS', tests: 'PASS', security: 'PASS' }, created: '2026-09-06T14:30:00Z' },
  { id: 4, title: 'feat: DAG Algorithm Lab', author: 'Alex Chen', branch: 'dev/algorithm-lab', status: 'DRAFT', reviewers: [], checks: { lint: 'FAIL', tests: 'PASS', security: 'PASS' }, created: '2026-09-06T11:30:00Z' },
];

const CI_CHECKS = [
  { name: 'ESLint Analysis', status: 'PASS', duration: '12s', icon: '📝' },
  { name: 'Unit Test Suite', status: 'PASS', duration: '1m 34s', icon: '🧪' },
  { name: 'Integration Tests', status: 'RUNNING', duration: '—', icon: '🔗' },
  { name: 'Security Scan (Snyk)', status: 'PASS', duration: '28s', icon: '🔒' },
  { name: 'Build Verification', status: 'PASS', duration: '45s', icon: '🏗️' },
];

export default function GitHubSync() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('commits');
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState('2026-09-08T10:42:00Z');

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setLastSync(new Date().toISOString());
    }, 2000);
  };

  const prStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':   return <span className="badge badge--success">Open</span>;
      case 'REVIEW': return <span className="badge badge--warning">In Review</span>;
      case 'MERGED': return <span className="badge badge--primary">Merged</span>;
      case 'DRAFT':  return <span className="badge badge--muted">Draft</span>;
      default:       return <span className="badge badge--neutral">{status}</span>;
    }
  };

  const checkBadge = (status) => {
    switch (status) {
      case 'PASS':    return <span style={{ color: 'var(--clr-success)', fontSize: '11px', fontWeight: '600' }}>✓ Pass</span>;
      case 'FAIL':    return <span style={{ color: 'var(--clr-error)', fontSize: '11px', fontWeight: '600' }}>✗ Fail</span>;
      case 'RUNNING': return <span style={{ color: 'var(--clr-warning)', fontSize: '11px', fontWeight: '600' }}>⏳ Running</span>;
      default:        return <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>;
    }
  };

  const formatDate = (d) => new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <AppLayout title="GitHub Sync">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">🐙 GitHub Sync Engine</h1>
          <p className="page-header__subtitle">
            Repository integration hub — track commits, branches, pull requests, and CI/CD pipeline status.
          </p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={handleSync} disabled={syncing}>
          {syncing ? '⏳ Syncing...' : '🔄 Trigger Webhook Sync'}
        </button>
      </div>

      {/* Repo Health Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Repository', value: REPO.name, icon: '📦', sub: `${REPO.owner}` },
          { label: 'Branches', value: BRANCHES.length, icon: '🔀', sub: `default: ${REPO.defaultBranch}` },
          { label: 'Open PRs', value: PULL_REQUESTS.filter(p => p.status === 'OPEN' || p.status === 'REVIEW').length, icon: '🔃', sub: 'awaiting review' },
          { label: 'Last Push', value: formatDate(REPO.lastPush), icon: '⬆️', sub: REPO.language },
          { label: 'Last Sync', value: formatDate(lastSync), icon: '🔗', sub: syncing ? 'syncing…' : 'webhook active' },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ padding: '14px' }}>
            <div style={{ fontSize: '14px', marginBottom: '2px' }}>{s.icon}</div>
            <div style={{ fontSize: i === 0 || i === 4 ? '12px' : '22px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: typeof s.value === 'number' ? 'JetBrains Mono, monospace' : 'inherit' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
            <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
        {/* Left: Tabs */}
        <div>
          {/* Tab Bar */}
          <div className="tab-bar" style={{ marginBottom: '16px' }}>
            {[
              { key: 'commits', label: '📝 Commits' },
              { key: 'prs', label: '🔃 Pull Requests' },
              { key: 'ci', label: '⚙️ CI Pipeline' },
            ].map(t => (
              <button key={t.key}
                className={`tab-bar__item ${activeTab === t.key ? 'tab-bar__item--active' : ''}`}
                onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Commits Tab */}
          {activeTab === 'commits' && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>Commit Stream</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {COMMITS.map(c => (
                  <div key={c.sha} style={{
                    padding: '12px 14px', borderBottom: '1px solid var(--border)',
                    display: 'flex', gap: '12px', alignItems: 'flex-start',
                  }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-light)', fontWeight: '700',
                    }}>
                      {c.sha.substring(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '3px' }}>{c.message}</div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{c.author}</span>
                        <span className="badge badge--neutral" style={{ fontSize: '9px', padding: '1px 5px' }}>{c.branch}</span>
                        <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-light)' }}>{c.sha}</span>
                        <span style={{ fontSize: '10px', color: 'var(--clr-success)' }}>+{c.additions}</span>
                        <span style={{ fontSize: '10px', color: 'var(--clr-error)' }}>-{c.deletions}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                        {formatDate(c.date)} • {c.files} file{c.files !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PRs Tab */}
          {activeTab === 'prs' && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>Pull Requests</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {PULL_REQUESTS.map(pr => (
                  <div key={pr.id} style={{
                    padding: '14px', borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                          #{pr.id} {pr.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {pr.author} → <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10.5px' }}>{pr.branch}</span>
                        </div>
                      </div>
                      {prStatusBadge(pr.status)}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Checks:</span>
                      {Object.entries(pr.checks).map(([k, v]) => (
                        <span key={k} style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k}:</span>
                          {checkBadge(v)}
                        </span>
                      ))}
                    </div>
                    {pr.reviewers.length > 0 && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        Reviewers: {pr.reviewers.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CI Tab */}
          {activeTab === 'ci' && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>CI/CD Pipeline Status</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {CI_CHECKS.map((check, i) => (
                  <div key={i} style={{
                    padding: '12px 14px', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '16px' }}>{check.icon}</span>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)' }}>{check.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Duration: {check.duration}</div>
                      </div>
                    </div>
                    {checkBadge(check.status)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Branches */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '12px' }}>
              🔀 Branches ({BRANCHES.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {BRANCHES.map(b => (
                <div key={b.name} style={{
                  padding: '10px', borderRadius: '8px',
                  background: b.isDefault ? 'rgba(99, 102, 241, 0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${b.isDefault ? 'rgba(99, 102, 241, 0.15)' : 'var(--border)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {b.name}
                    </span>
                    {b.isDefault && <span className="badge badge--primary" style={{ fontSize: '8px', padding: '1px 4px' }}>DEFAULT</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
                    {b.ahead > 0 && <span style={{ color: 'var(--clr-success)' }}>↑{b.ahead} ahead</span>}
                    {b.behind > 0 && <span style={{ color: 'var(--clr-error)' }}>↓{b.behind} behind</span>}
                    {b.ahead === 0 && b.behind === 0 && <span style={{ color: 'var(--text-muted)' }}>up to date</span>}
                  </div>
                  <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {formatDate(b.lastCommit)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>
              📊 Repository Stats
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Stars', value: REPO.stars, icon: '⭐' },
                { label: 'Forks', value: REPO.forks, icon: '🍴' },
                { label: 'Open Issues', value: REPO.openIssues, icon: '🐛' },
                { label: 'Language', value: REPO.language, icon: '🐍' },
              ].map(s => (
                <div key={s.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 0', borderBottom: '1px solid var(--border)',
                  fontSize: '12px',
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>{s.icon} {s.label}</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
