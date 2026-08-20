import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import projectService from '../services/projectService';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await projectService.getDashboard(user.id, user.role);
        setStats(res);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <LoadingSpinner message="Loading dashboard statistics..." />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Dashboard">
        <div className="login-card__error">{error}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Welcome back, {user.name}</h1>
          <p className="page-header__subtitle">
            Here is the current academic tracking status.
          </p>
        </div>
      </div>

      <div className="grid grid--4 mb-24">
        <StatCard
          label="Total Assigned Groups"
          value={stats?.total_groups || 0}
          icon="👥"
          color="info"
        />
        <StatCard
          label={user.role === 'STAFF' ? 'Total Students Registered' : 'Group Members'}
          value={stats?.total_students || 0}
          icon="🎓"
          color="success"
        />
        <StatCard
          label="Total Projects Tracked"
          value={stats?.total_projects || 0}
          icon="📁"
          color="default"
        />
        <StatCard
          label="Active Projects (In Progress)"
          value={stats?.active_projects || 0}
          icon="📈"
          color="warning"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
        {/* Upcoming Deadlines */}
        <div className="card card--flat">
          <h3 className="card__title" style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⏳</span> Upcoming Deadlines
          </h3>
          {stats?.upcoming_deadlines?.length > 0 ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project ID</th>
                    <th>Project Name</th>
                    <th>Group</th>
                    <th>Deadline</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.upcoming_deadlines.map((p) => (
                    <tr key={p.project_id}>
                      <td>
                        <Link to={`/projects/${p.project_id}`} style={{ fontWeight: '600' }}>
                          {p.project_id}
                        </Link>
                      </td>
                      <td>{p.name}</td>
                      <td>{p.group_name}</td>
                      <td>{new Date(p.deadline).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ minWidth: '32px', textAlign: 'right', fontSize: '11.5px' }}>{Math.round(p.progress)}%</span>
                          <div className="progress-bar" style={{ width: '60px' }}>
                            <div className="progress-bar__fill" style={{ width: `${p.progress}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon="📅" title="No upcoming deadlines" text="All active projects are on track with no immediate deadlines." />
          )}
        </div>

        {/* Recent Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card card--flat">
            <h3 className="card__title" style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔔</span> Recent Activities
            </h3>
            {stats?.recent_activity?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {stats.recent_activity.map((act) => (
                  <div key={act.id} className="activity-item">
                    <div className="activity-item__dot" />
                    <div className="activity-item__content">
                      <p className="activity-item__message">
                        <strong>{act.user_name}</strong> {act.message.replace(/'[^']+'/g, '').replace('Project  was', 'project')}
                        {act.project_id && (
                          <span>
                            {' '}for{' '}
                            <Link to={`/projects/${act.project_id}`} style={{ fontWeight: '500' }}>
                              {act.project_id}
                            </Link>
                          </span>
                        )}
                      </p>
                      <span className="activity-item__meta">{new Date(act.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="🔔" title="No activity recorded" text="No actions have been registered for this workspace yet." />
            )}
          </div>

          {user.role === 'STUDENT' && stats?.group_members?.length > 0 && (
            <div className="card card--flat">
              <h3 className="card__title" style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>👥</span> My Group Members
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stats.group_members.map(member => (
                  <div key={member.id} className="member-chip" style={{ margin: 0, display: 'flex', width: '100%' }}>
                    <div className="member-chip__avatar">
                      {member.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: '500' }}>{member.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{member.user_id} {member.id === user.id ? '(You)' : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
