import React, { useState, useEffect } from 'react';
import AppLayout from '../layouts/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import activityService from '../services/activityService';
import { useAuth } from '../context/AuthContext';

export default function AuditTrail() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const list = await activityService.getActivities(user.id, user.role);
        setActivities(list || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch audit activities.');
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, [user]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'PROJECT_CREATED': return '🆕';
      case 'PROJECT_UPDATED': return '✏️';
      case 'PROGRESS_UPDATED': return '📈';
      case 'STATUS_CHANGED': return '🔄';
      case 'MILESTONE_ADDED': return '🏁';
      default: return '📜';
    }
  };

  const getActivityBadgeClass = (type) => {
    switch (type) {
      case 'PROJECT_CREATED': return 'badge--success';
      case 'PROJECT_UPDATED': return 'badge--info';
      case 'PROGRESS_UPDATED': return 'badge--warning';
      case 'STATUS_CHANGED': return 'badge--accent';
      case 'MILESTONE_ADDED': return 'badge--muted';
      default: return 'badge--flat';
    }
  };

  return (
    <AppLayout title="Audit Trail">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Audit Trail</h1>
          <p className="page-header__subtitle">
            {user.role === 'STAFF' 
              ? 'Chronological system logs tracking all project changes across workspaces.' 
              : 'Chronological tracking of updates made on your group projects.'}
          </p>
        </div>
      </div>

      {error && <div className="login-card__error mb-24">{error}</div>}

      {loading ? (
        <LoadingSpinner message="Retrieving system activity logs..." />
      ) : activities.length > 0 ? (
        <div className="card card--flat">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {activities.map((act) => (
              <div 
                key={act.id} 
                className="activity-item" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '16px', 
                  padding: '16px', 
                  borderBottom: '1px solid var(--border)',
                  lineHeight: '1.5' 
                }}
              >
                <div style={{ fontSize: '24px' }}>{getActivityIcon(act.activity_type)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {act.user_name} <span style={{ fontWeight: '400', color: 'var(--text-secondary)' }}>on project</span> {act.project_name} <span style={{ fontSize: '12px', color: 'var(--text-accent)' }}>({act.project_id})</span>
                    </div>
                    <span className={`badge ${getActivityBadgeClass(act.activity_type)}`}>
                      {act.activity_type.replace('_', ' ')}
                    </span>
                  </div>
                  <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '13.5px' }}>
                    {act.message}
                  </p>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                    {new Date(act.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState icon="📜" title="No activity recorded" text="There are currently no recorded events to display in the audit trail." />
      )}
    </AppLayout>
  );
}
