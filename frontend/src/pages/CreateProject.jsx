import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import projectService from '../services/projectService';
import groupService from '../services/groupService';
import workspaceService from '../services/workspaceService';

export default function CreateProject() {
  const [searchParams] = useSearchParams();
  const workspaceIdFromUrl = searchParams.get('workspace_id');

  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workspaceId, setWorkspaceId] = useState(workspaceIdFromUrl || '');
  const [groupId, setGroupId] = useState('');
  const [course, setCourse] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [status, setStatus] = useState('NOT_STARTED');
  const [deadline, setDeadline] = useState('');
  
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch workspaces listing
  useEffect(() => {
    const init = async () => {
      try {
        const wsList = await workspaceService.getWorkspaces();
        setWorkspaces(wsList);
        if (workspaceIdFromUrl) {
          setWorkspaceId(workspaceIdFromUrl);
          // Set course code automatically if matching workspace found
          const selected = wsList.find(w => w.id === parseInt(workspaceIdFromUrl));
          if (selected) setCourse(selected.course_code);
        } else if (wsList.length > 0) {
          setWorkspaceId(wsList[0].id.toString());
          setCourse(wsList[0].course_code);
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize page data.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [workspaceIdFromUrl]);

  // 2. Fetch groups whenever selected workspace changes
  useEffect(() => {
    if (!workspaceId) return;
    const fetchGroups = async () => {
      try {
        const gList = await groupService.getGroups(parseInt(workspaceId));
        setGroups(gList);
        if (gList.length > 0) {
          setGroupId(gList[0].id.toString());
        } else {
          setGroupId('');
        }
      } catch (err) {
        console.error('Failed to load workspace groups', err);
      }
    };
    fetchGroups();

    // Auto set course code
    const selected = workspaces.find(w => w.id === parseInt(workspaceId));
    if (selected) {
      setCourse(selected.course_code);
    }
  }, [workspaceId, workspaces]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectId || !name || !workspaceId || !groupId) {
      setError('Please fill in all required fields.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const data = {
        project_id: projectId.trim(),
        name: name.trim(),
        description: description.trim() || null,
        workspace_id: parseInt(workspaceId),
        group_id: parseInt(groupId),
        course: course || null,
        priority,
        status,
        progress: status === 'COMPLETED' ? 100 : status === 'NOT_STARTED' ? 0 : 20,
        deadline: deadline || null,
      };

      await projectService.createProject(data);
      navigate(`/projects/${data.project_id}`);
    } catch (err) {
      setError(err.message || 'Failed to create project.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="New Project">
        <LoadingSpinner message="Initializing project wizard..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="New Project">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Track Project</h1>
          <p className="page-header__subtitle">Establish project tracking for lab teams.</p>
        </div>
        <Link to="/workspace" className="btn btn--secondary">Cancel</Link>
      </div>

      {error && <div className="login-card__error mb-24">{error}</div>}

      <div className="card" style={{ maxWidth: '720px', background: 'var(--bg-card)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="grid grid--2" style={{ gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Project ID (Manually Entered) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. AID-DSA-G11-01"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Project Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Project title..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              placeholder="Detailed description of the project tasks/goals..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ minHeight: '100px' }}
            />
          </div>

          <div className="grid grid--3" style={{ gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Workspace *</label>
              <select
                className="form-select"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                required
              >
                {workspaces.map(w => (
                  <option key={w.id} value={w.id}>{w.course_code} - {w.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Assigned Group *</label>
              <select
                className="form-select"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                required
                disabled={groups.length === 0}
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
                {groups.length === 0 && <option value="">No Groups in Workspace</option>}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Course Code</label>
              <input
                type="text"
                className="form-input"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="Course code"
              />
            </div>
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
              <label className="form-label">Deadline</label>
              <input
                type="date"
                className="form-input"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-16" style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Creating Project...' : '✓ Create Project'}
            </button>
            <Link to="/workspace" className="btn btn--secondary">Cancel</Link>
          </div>

        </form>
      </div>
    </AppLayout>
  );
}
