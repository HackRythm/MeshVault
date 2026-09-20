import React, { useState, useEffect } from 'react';
import AppLayout from '../layouts/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import GitHubRepoSection from '../components/GitHubRepoSection';
import projectService from '../services/projectService';

export default function GitHubSync() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserProjects();
  }, []);

  const fetchUserProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await projectService.getProjects();
      setProjects(list || []);
      if (list && list.length > 0) {
        setSelectedProjectId(list[0].project_id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = projects.find(p => p.project_id === selectedProjectId);

  return (
    <AppLayout title="GitHub Sync">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">🐙 GitHub Repository Sync</h1>
          <p className="page-header__subtitle">
            Connect and monitor live GitHub repositories for your academic projects.
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading project list..." />
      ) : error ? (
        <div style={{ padding: '14px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '8px', border: '1px solid #fecaca' }}>
          ⚠️ {error}
        </div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted, #64748b)', margin: 0 }}>
            No projects found. Create a project first to connect a GitHub repository.
          </p>
        </div>
      ) : (
        <div>
          {/* Project Selector Header */}
          <div className="card" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                Select Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '14px',
                  fontWeight: '500',
                  minWidth: '280px',
                  background: 'var(--bg-card, #ffffff)',
                  color: 'var(--text-main, #0f172a)',
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.project_id}>
                    {p.name} ({p.project_id})
                  </option>
                ))}
              </select>
            </div>

            {selectedProject && (
              <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
                Group: <strong style={{ color: 'var(--text-main, #0f172a)' }}>{selectedProject.group_name || 'N/A'}</strong>
              </div>
            )}
          </div>

          {/* Render GitHub Section for Selected Project */}
          {selectedProjectId && (
            <GitHubRepoSection key={selectedProjectId} projectId={selectedProjectId} />
          )}
        </div>
      )}
    </AppLayout>
  );
}
