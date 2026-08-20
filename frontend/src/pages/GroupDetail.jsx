import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import ProjectCard from '../components/ProjectCard';
import groupService from '../services/groupService';

export default function GroupDetail() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGroupDetail = async () => {
      try {
        const detail = await groupService.getGroup(id);
        setGroup(detail);
      } catch (err) {
        setError(err.message || 'Failed to fetch group details.');
      } finally {
        setLoading(false);
      }
    };
    fetchGroupDetail();
  }, [id]);

  if (loading) {
    return (
      <AppLayout title="Group Detail">
        <LoadingSpinner message="Retrieving group membership and projects..." />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Group Detail">
        <div className="login-card__error">{error}</div>
        <Link to="/groups" className="btn btn--secondary mt-16">⬅️ Back to Groups</Link>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Groups / ${group.name}`}>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">{group.name}</h1>
          <p className="page-header__subtitle">Workspace: {group.workspace_name}</p>
        </div>
        <Link to="/groups" className="btn btn--secondary">⬅️ Back</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '24px', alignItems: 'start' }}>
        {/* Members List */}
        <div className="card card--flat">
          <h3 className="card__title" style={{ fontSize: '15px', marginBottom: '16px' }}>👥 Group Members</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {group.members && group.members.length > 0 ? (
              group.members.map(member => (
                <div key={member.id} className="member-chip" style={{ margin: 0, display: 'flex', width: '100%' }}>
                  <div className="member-chip__avatar">
                    {member.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontWeight: '500' }}>{member.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{member.user_id}</div>
                  </div>
                </div>
              ))
            ) : (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No student members assigned yet.</span>
            )}
          </div>

          {group.description && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Group Description</h4>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{group.description}</p>
            </div>
          )}
        </div>

        {/* Projects list */}
        <div className="detail-section">
          <h2 className="detail-section__title">Assigned Projects ({group.projects?.length || 0})</h2>
          {group.projects && group.projects.length > 0 ? (
            <div className="grid grid--2">
              {group.projects.map(proj => (
                <ProjectCard key={proj.project_id} project={proj} />
              ))}
            </div>
          ) : (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              📭 No projects registered for this group yet.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
