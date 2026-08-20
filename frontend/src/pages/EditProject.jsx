import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import projectService from '../services/projectService';

export default function EditProject() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [status, setStatus] = useState('NOT_STARTED');
  const [progress, setProgress] = useState(0);
  const [deadline, setDeadline] = useState('');
  const [course, setCourse] = useState('');

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const p = await projectService.getProject(projectId);
        setName(p.name);
        setDescription(p.description || '');
        setPriority(p.priority);
        setStatus(p.status);
        setProgress(p.progress || 0);
        setDeadline(p.deadline || '');
        setCourse(p.course || '');
      } catch (err) {
        setError(err.message || 'Failed to retrieve project details.');
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) {
      setError('Project Name is required.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const data = {
        name: name.trim(),
        description: description.trim() || null,
        priority,
        status,
        progress: parseFloat(progress),
        deadline: deadline || null,
        course: course || null,
      };

      await projectService.updateProject(projectId, data);
      navigate(`/projects/${projectId}`);
    } catch (err) {
      setError(err.message || 'Failed to update project.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Edit Project">
        <LoadingSpinner message="Retrieving project data..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Edit Project / ${projectId}`}>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Modify parameters for {projectId}</h1>
          <p className="page-header__subtitle">Submit changes to SQLite backend.</p>
        </div>
        <Link to={`/projects/${projectId}`} className="btn btn--secondary">Cancel</Link>
      </div>

      {error && <div className="login-card__error mb-24">{error}</div>}

      <div className="card" style={{ maxWidth: '720px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="grid grid--2" style={{ gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Project Name *</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Course Code</label>
              <input
                type="text"
                className="form-input"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ minHeight: '100px' }}
            />
          </div>

          <div className="grid grid--3" style={{ gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Priority</label>
              <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Status</label>
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Progress ({Math.round(progress)}%)</label>
              <input
                type="range"
                className="form-input"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                style={{ padding: 0 }}
              />
            </div>
          </div>

          <div className="form-group" style={{ maxWidth: '50%' }}>
            <label className="form-label">Deadline</label>
            <input
              type="date"
              className="form-input"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="flex gap-16" style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Saving modifications...' : '✓ Save Modifications'}
            </button>
            <Link to={`/projects/${projectId}`} className="btn btn--secondary">Cancel</Link>
          </div>

        </form>
      </div>
    </AppLayout>
  );
}
