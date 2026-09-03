import React from 'react';
import { Link } from 'react-router-dom';

export default function GroupCard({ group }) {
  return (
    <div className="card">
      <div className="card__header">
        <h3 className="card__title" style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {group.group_number && (
            <span className="badge badge--neutral" style={{ fontSize: '11px', padding: '2px 6px' }}>
              {group.group_number}
            </span>
          )}
          <Link to={`/groups/${group.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
            {group.name}
          </Link>
        </h3>
        <Link to={`/groups/${group.id}`} className="badge badge--info" style={{ textDecoration: 'none' }}>
          {group.member_count || 0} Members
        </Link>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', height: '40px', overflow: 'hidden' }}>
        {group.description || 'No group description.'}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
        <div>
          {group.workspace_id ? (
            <span className="badge badge--success" style={{ fontSize: '10px', padding: '2px 6px' }}>
              ✓ Workspace Assigned
            </span>
          ) : (
            <Link to={`/groups/${group.id}`} style={{ fontSize: '11px', color: 'var(--clr-primary)', textDecoration: 'none', fontWeight: '500' }}>
              🔗 Join Workspace →
            </Link>
          )}
        </div>
        <div>
          <span>Projects: </span>
          <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{group.project_count || 0}</span>
        </div>
      </div>
    </div>
  );
}
