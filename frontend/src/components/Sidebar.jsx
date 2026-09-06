import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import projectService from '../services/projectService';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  useEffect(() => {
    if (!user || user.role !== 'STAFF') return;

    const checkPendingReviews = async () => {
      try {
        const res = await projectService.getReviewQueueCount();
        setPendingReviewCount(res.count || 0);
      } catch (err) {
        // Silently ignore background polling errors
      }
    };

    checkPendingReviews();
    const interval = setInterval(checkPendingReviews, 6000);
    return () => clearInterval(interval);
  }, [user]);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/workspace', label: 'Workspace', icon: '📂' },
    { path: '/groups', label: 'Groups', icon: '👥' },
    { path: '/projects', label: 'Projects', icon: '📁' },
    { path: '/search', label: 'Smart Search', icon: '🔍' },
  ];

  const buildingItems = [
    { path: '/priority-engine', label: 'Priority Engine', icon: '⚡' },
    { path: '/progress-analytics', label: 'Progress Analytics', icon: '📈' },
    { path: '/sprint-optimizer', label: 'Sprint Optimizer', icon: '⏱️' },
    ...(user && user.role === 'STAFF' ? [{
      path: '/review-queue',
      label: 'Review Queue',
      icon: '📋',
      badge: pendingReviewCount > 0 ? pendingReviewCount : null
    }] : []),
    { path: '/audit-trail', label: 'Audit Trail', icon: '📜' },
    { path: '/algorithm-lab', label: 'Algorithm Lab', icon: '🧪' },
    ...(user && user.role === 'STUDENT' ? [{ path: '/github', label: 'GitHub Sync', icon: '🐙' }] : []),
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">MV</div>
        <h1 className="sidebar__title">MeshVault</h1>
      </div>

      <nav style={{ flex: 1 }}>
        <div className="sidebar__section-label">Core Modules</div>
        <ul className="sidebar__nav">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                }
              >
                <span className="sidebar__icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <ul className="sidebar__nav" style={{ marginTop: '16px' }}>
          {buildingItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                }
              >
                <span className="sidebar__icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge != null && (
                  <span
                    className="badge badge--error"
                    style={{
                      marginLeft: 'auto',
                      fontSize: '11px',
                      padding: '2px 7px',
                      borderRadius: '12px',
                      fontWeight: '700',
                      boxShadow: '0 0 8px rgba(255, 107, 107, 0.5)',
                      animation: 'pulse 2s infinite'
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar__bottom">
        <div className="sidebar__nav">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <span className="sidebar__icon">👤</span>
            <span>Profile</span>
          </NavLink>
          <button
            onClick={logout}
            className="sidebar__link"
            style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
          >
            <span className="sidebar__icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
