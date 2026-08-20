import React, { useState, useEffect } from 'react';
import AppLayout from '../layouts/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ProjectCard from '../components/ProjectCard';
import projectService from '../services/projectService';
import { useAuth } from '../context/AuthContext';

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const list = await projectService.getProjects(null, null, user.id, user.role);
        setProjects(list);
      } catch (err) {
        setError(err.message || 'Failed to fetch projects.');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [user]);

  if (loading) {
    return (
      <AppLayout title="Projects">
        <LoadingSpinner message="Loading academic projects list..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Projects">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Projects Repository</h1>
          <p className="page-header__subtitle">
            {user.role === 'STAFF' ? 'Review all projects registered across workspaces.' : 'Your team projects list.'}
          </p>
        </div>
      </div>

      {error && <div className="login-card__error mb-24">{error}</div>}

      {projects.length > 0 ? (
        <div className="grid grid--3">
          {projects.map(proj => (
            <ProjectCard key={proj.project_id} project={proj} />
          ))}
        </div>
      ) : (
        <EmptyState icon="📁" title="No projects tracked" text="There are currently no active projects linked to your account." />
      )}
    </AppLayout>
  );
}
