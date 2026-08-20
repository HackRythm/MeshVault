import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import projectService from '../services/projectService';
import { useAuth } from '../context/AuthContext';

export default function ProgressAnalytics() {
  const { user } = useAuth();
  const [minProgress, setMinProgress] = useState(0);
  const [maxProgress, setMaxProgress] = useState(100);
  const [projects, setProjects] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initial fetch of all projects using [0, 100] range
  useEffect(() => {
    handleSearch(null);
  }, []);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();

    setError('');
    setLoading(true);
    setSearched(true);

    try {
      const list = await projectService.getProgressRange(
        minProgress,
        maxProgress,
        user.id,
        user.role
      );
      setProjects(list || []);
    } catch (err) {
      setError(err.message || 'Failed to search projects by progress.');
      setProjects([]);
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
    <AppLayout title="Progress Explorer">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Progress Explorer</h1>
          <p className="page-header__subtitle">
            Query and filter projects in range-based datasets utilizing a Binary Search Tree (BST).
          </p>
        </div>
      </div>

      <div className="card card--flat mb-24">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}>
            <label className="form-label" htmlFor="min-progress">Minimum Progress (%)</label>
            <input
              id="min-progress"
              type="number"
              className="form-input"
              min="0"
              max="100"
              value={minProgress}
              onChange={(e) => setMinProgress(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
            />
          </div>

          <div className="form-group" style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}>
            <label className="form-label" htmlFor="max-progress">Maximum Progress (%)</label>
            <input
              id="max-progress"
              type="number"
              className="form-input"
              min="0"
              max="100"
              value={maxProgress}
              onChange={(e) => setMaxProgress(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
            />
          </div>

          <button type="submit" className="btn btn--primary" style={{ height: '40px', minWidth: '120px' }}>
            🔍 Filter Range
          </button>
        </form>
      </div>

      {error && <div className="login-card__error mb-24">{error}</div>}

      {loading ? (
        <LoadingSpinner message="Searching BST structures..." />
      ) : searched ? (
        <div className="detail-section">
          <h2 className="detail-section__title">Projects Found ({projects.length})</h2>
          {projects.length > 0 ? (
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
                  {projects.map((p) => (
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
            <EmptyState icon="📈" title="No projects in this progress range" text="No projects matching the active scoping criteria fall inside this range." />
          )}
        </div>
      ) : null}
    </AppLayout>
  );
}
