import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import searchService from '../services/searchService';
import { useAuth } from '../context/AuthContext';

export default function SmartSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setError('');
    setLoading(true);
    setSearched(true);

    try {
      const res = await searchService.searchProjects(q, user.id, user.role);
      setResults(res.results || []);
    } catch (err) {
      setError(err.message || 'Smart search failed.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED': return <span className="badge badge--success">Completed</span>;
      case 'IN_PROGRESS': return <span className="badge badge--warning">In Progress</span>;
      case 'NOT_STARTED':
      default: return <span className="badge badge--muted">Not Started</span>;
    }
  };

  return (
    <AppLayout title="Smart Search">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Smart Search Engine</h1>
          <p className="page-header__subtitle">
            Query workspace projects instantly via pre-indexed hash tables.
          </p>
        </div>
      </div>

      <div className="card card--flat mb-24">
        <form onSubmit={handleSearch} className="search-bar">
          <span className="search-bar__icon">🔍</span>
          <input
            type="text"
            className="search-bar__input"
            placeholder="Search by exact ID, exact name, or partial ID/name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>
          Examples: "CS-DSA-A01", "Binary Search", "Analyzer", "A01", "Sorter"
        </span>
      </div>

      {error && <div className="login-card__error mb-24">{error}</div>}

      {loading ? (
        <LoadingSpinner message="Searching indexed tables..." />
      ) : searched ? (
        <div className="detail-section">
          <h2 className="detail-section__title">Search Results ({results.length})</h2>
          {results.length > 0 ? (
            <div className="table-wrapper card card--flat" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project ID</th>
                    <th>Project Name</th>
                    <th>Group</th>
                    <th>Workspace</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((p) => (
                    <tr key={p.project_id}>
                      <td>
                        <Link to={`/projects/${p.project_id}`} style={{ fontWeight: '600' }}>
                          {p.project_id}
                        </Link>
                      </td>
                      <td>{p.name}</td>
                      <td>{p.group_name || 'N/A'}</td>
                      <td>{p.workspace_name || 'N/A'}</td>
                      <td>{getStatusBadge(p.status)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ minWidth: '32px', textAlign: 'right', fontSize: '11.5px' }}>{Math.round(p.progress)}%</span>
                          <div className="progress-bar" style={{ width: '60px' }}>
                            <div className="progress-bar__fill" style={{ width: `${p.progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>{p.deadline ? new Date(p.deadline).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon="🔍" title="No projects found" text="No pre-indexed records matched your search parameters." />
          )}
        </div>
      ) : (
        <div className="empty-state" style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
          <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-secondary)' }}>Centralized Search Engine</h4>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', maxWidth: '340px', marginTop: '4px' }}>
            Input a query term to evaluate matching parameters from SQLite databases in O(1) average lookup times.
          </p>
        </div>
      )}
    </AppLayout>
  );
}
