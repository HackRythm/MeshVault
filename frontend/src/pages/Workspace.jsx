import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ProjectCard from '../components/ProjectCard';
import GroupCard from '../components/GroupCard';
import workspaceService from '../services/workspaceService';
import { useAuth } from '../context/AuthContext';

export default function Workspace() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWs, setSelectedWs] = useState(null);
  const [wsDetail, setWsDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  // 1. Fetch workspaces listing
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const list = await workspaceService.getWorkspaces(user.id, user.role);
        setWorkspaces(list);
        if (list.length > 0) {
          setSelectedWs(list[0]);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch workspaces.');
      } finally {
        setLoadingList(false);
      }
    };
    fetchWorkspaces();
  }, [user]);

  // 2. Fetch selected workspace details (groups + projects)
  useEffect(() => {
    if (!selectedWs) return;

    const fetchDetail = async () => {
      try {
        setLoadingDetail(true);
        const detail = await workspaceService.getWorkspace(selectedWs.id, user.id, user.role);
        setWsDetail(detail);
      } catch (err) {
        setError(err.message || 'Failed to load workspace details.');
      } finally {
        setLoadingDetail(false);
      }
    };
    fetchDetail();
  }, [selectedWs, user]);

  if (loadingList) {
    return (
      <AppLayout title="Workspace">
        <LoadingSpinner message="Loading workspace metadata..." />
      </AppLayout>
    );
  }

  if (workspaces.length === 0) {
    return (
      <AppLayout title="Workspace">
        <EmptyState icon="📂" title="No workspaces assigned" text="You do not have access to any workspaces at the moment." />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Workspace">
      <div className="page-header">
        <div className="page-header__left">
          {workspaces.length > 1 ? (
            <div className="flex items-center gap-12">
              <span className="form-label" style={{ marginBottom: 0 }}>Active Workspace:</span>
              <select
                className="form-select"
                value={selectedWs?.id || ''}
                onChange={(e) => {
                  const ws = workspaces.find(w => w.id === parseInt(e.target.value));
                  setSelectedWs(ws);
                }}
                style={{ padding: '6px 36px 6px 12px', minWidth: '220px' }}
              >
                {workspaces.map(w => (
                  <option key={w.id} value={w.id}>{w.course_code} - {w.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <h1 className="page-header__title">{selectedWs?.course_code}: {selectedWs?.course_name}</h1>
              <p className="page-header__subtitle">{selectedWs?.name} • Academic Year {selectedWs?.academic_year}</p>
            </>
          )}
        </div>
        {user.role === 'STAFF' && selectedWs && (
          <Link to={`/projects/new?workspace_id=${selectedWs.id}`} className="btn btn--primary">
            ➕ New Project
          </Link>
        )}
      </div>

      {error && <div className="login-card__error mb-24">{error}</div>}

      {loadingDetail ? (
        <LoadingSpinner message="Loading workspace elements..." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {selectedWs?.description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', background: 'rgba(255,255,255,0.01)', padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              {selectedWs.description}
            </p>
          )}

          {/* Groups Section */}
          <div className="detail-section">
            <h2 className="detail-section__title">Class Groups ({wsDetail?.groups?.length || 0})</h2>
            {wsDetail?.groups?.length > 0 ? (
              <div className="grid grid--3">
                {wsDetail.groups.map(group => (
                  <GroupCard key={group.id} group={group} />
                ))}
              </div>
            ) : (
              <EmptyState icon="👥" title="No groups established" text="No lab teams have been formed inside this workspace yet." />
            )}
          </div>

          {/* Projects Section */}
          <div className="detail-section">
            <h2 className="detail-section__title">Workspace Projects ({wsDetail?.projects?.length || 0})</h2>
            {wsDetail?.projects?.length > 0 ? (
              <div className="grid grid--3">
                {wsDetail.projects.map(proj => (
                  <ProjectCard key={proj.project_id} project={proj} />
                ))}
              </div>
            ) : (
              <EmptyState icon="📁" title="No projects tracked" text="There are currently no active projects registered under this workspace." />
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
