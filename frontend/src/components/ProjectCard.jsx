import React from 'react';
import { Link } from 'react-router-dom';

export default function ProjectCard({ project }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="badge badge--success">Completed</span>;
      case 'IN_PROGRESS':
        return <span className="badge badge--warning">In Progress</span>;
      case 'NOT_STARTED':
      default:
        return <span className="badge badge--muted">Not Started</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'HIGH':
        return <span className="badge badge--error">High Priority</span>;
      case 'MEDIUM':
        return <span className="badge badge--warning">Medium Priority</span>;
      case 'LOW':
      default:
        return <span className="badge badge--success">Low Priority</span>;
    }
  };

  return (
    <div className="card">
      <div className="card__header">
        <span style={{ fontSize: '11px', color: 'var(--text-accent)', fontWeight: '600' }}>
          {project.project_id}
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {getPriorityBadge(project.priority)}
          {getStatusBadge(project.status)}
        </div>
      </div>
      <h3 className="card__title" style={{ marginBottom: '8px' }}>
        <Link to={`/projects/${project.project_id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
          {project.name}
        </Link>
      </h3>
      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '40px' }}>
        {project.description || 'No description provided.'}
      </p>

      {project.group_name && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Group: <Link to={`/groups/${project.group_id}`} style={{ fontWeight: '600', color: 'var(--text-primary)', textDecoration: 'none' }}>{project.group_name}</Link></span>
          {project.course && <span>{project.course}</span>}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>Progress</span>
          <span>{Math.round(project.progress)}%</span>
        </div>
        <div className="progress-bar">
          <div 
            className={`progress-bar__fill ${project.progress >= 100 ? 'progress-bar__fill--success' : project.progress >= 50 ? 'progress-bar__fill--warning' : ''}`}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      {project.deadline && (
        <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Deadline:</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>
            {new Date(project.deadline).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}
