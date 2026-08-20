import React from 'react';
import AppLayout from '../layouts/AppLayout';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, logout } = useAuth();

  return (
    <AppLayout title="Profile">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">User Account</h1>
          <p className="page-header__subtitle">Your profile metadata.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="navbar__avatar" style={{ width: '64px', height: '64px', fontSize: '24px' }}>
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700' }}>{user.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{user.role} Account</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>University User ID:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{user.user_id}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Email Address:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{user.email}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Database Record PK:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{user.id}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Account Created:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{new Date(user.created_at).toLocaleDateString()}</strong>
          </div>
        </div>

        {user.role === 'STUDENT' && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-accent)' }}>🐙 GitHub Integration</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: '500', fontSize: '13px' }}>GitHub Sync Status</div>
                <div style={{ fontSize: '11px', color: 'var(--clr-warning)' }}>⚠️ Feature Building (Target: End Sem Evaluation)</div>
              </div>
              <button className="btn btn--secondary btn--sm" disabled style={{ opacity: 0.6 }}>Connect</button>
            </div>
          </div>
        )}

        <button onClick={logout} className="btn btn--danger" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
          🚪 Sign Out of Session
        </button>
      </div>
    </AppLayout>
  );
}
