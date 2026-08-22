import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import ProjectCard from '../components/ProjectCard';
import groupService from '../services/groupService';
import projectService from '../services/projectService';
import { useAuth } from '../context/AuthContext';

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [showProjectModal, setShowProjectModal] = useState(false);

  // Form states
  const [projId, setProjId] = useState('');
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projCourse, setProjCourse] = useState('');
  const [projPriority, setProjPriority] = useState('MEDIUM');
  const [projDeadline, setProjDeadline] = useState('');

  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchGroupDetail = async () => {
    try {
      setLoading(true);
      const detail = await groupService.getGroup(id);
      setGroup(detail);
    } catch (err) {
      setError(err.message || 'Failed to fetch group details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupDetail();
  }, [id]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projId || !projName) {
      setModalError('Project ID and Project Name are required.');
      return;
    }

    setModalError('');
    setSubmitting(true);
    try {
      await projectService.createProject({
        project_id: projId.trim(),
        name: projName.trim(),
        description: projDesc.trim() || null,
        group_id: parseInt(id),
        course: projCourse.trim() || null,
        priority: projPriority,
        deadline: projDeadline || null,
      });
      setShowProjectModal(false);
      setProjId('');
      setProjName('');
      setProjDesc('');
      setProjCourse('');
      setProjPriority('MEDIUM');
      setProjDeadline('');
      await fetchGroupDetail();
    } catch (err) {
      setModalError(err.message || 'Failed to create project.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromote = async (userId) => {
    if (!window.confirm('Are you sure you want to promote this member to leader?')) return;
    try {
      await groupService.promoteToLeader(id, userId);
      await fetchGroupDetail();
    } catch (err) {
      alert(err.message || 'Failed to promote member.');
    }
  };

  const handleRemove = async (userId, memberName) => {
    const isSelf = userId === user.id;
    const msg = isSelf
      ? 'Are you sure you want to leave this group?'
      : `Are you sure you want to remove ${memberName} from this group?`;
    if (!window.confirm(msg)) return;

    try {
      await groupService.removeMember(id, userId);
      if (isSelf) {
        navigate('/groups');
      } else {
        await fetchGroupDetail();
      }
    } catch (err) {
      alert(err.message || 'Failed to remove member.');
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('WARNING: Are you sure you want to delete this group entirely? This action cannot be undone.')) return;
    try {
      await groupService.deleteGroup(id);
      navigate('/groups');
    } catch (err) {
      alert(err.message || 'Failed to delete group.');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm(`Are you sure you want to delete project: ${projectId}?`)) return;
    try {
      await projectService.deleteProject(projectId);
      await fetchGroupDetail();
    } catch (err) {
      alert(err.message || 'Failed to delete project.');
    }
  };

  const copyCodeToClipboard = () => {
    if (group && group.code) {
      navigator.clipboard.writeText(group.code);
      alert('Group code copied to clipboard!');
    }
  };

  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--bg-overlay)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  };

  const modalContentStyle = {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    width: '100%',
    maxWidth: '550px',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: 'var(--shadow-lg)',
    display: 'flex',
    flexDirection: 'column',
    padding: '28px',
  };

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

  const leaders = group.members?.filter(m => m.is_leader) || [];
  const members = group.members?.filter(m => !m.is_leader) || [];
  const isUserLeader = group.is_leader;

  return (
    <AppLayout title={`Groups / ${group.name}`}>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">{group.name}</h1>
          <p className="page-header__subtitle">
            Group Code: <code style={{ background: 'var(--bg-card-hover)', padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>{group.code}</code>
            {user.role === 'STUDENT' && (
              <button onClick={copyCodeToClipboard} className="btn btn--ghost btn--sm" style={{ padding: '2px 6px' }}>📋 Copy</button>
            )}
          </p>
        </div>
        <div className="page-header__actions" style={{ display: 'flex', gap: '12px' }}>
          <Link to="/groups" className="btn btn--secondary">⬅️ Back</Link>
          {user.role === 'STUDENT' && (
            <>
              {isUserLeader ? (
                <button onClick={handleDeleteGroup} className="btn btn--danger">🗑️ Delete Group</button>
              ) : (
                <button onClick={() => handleRemove(user.id, user.name)} className="btn btn--danger">🚪 Leave Group</button>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '24px', alignItems: 'start' }}>
        {/* Members column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Leaders List */}
          <div className="card card--flat">
            <h3 className="card__title" style={{ fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              👑 Leaders ({leaders.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {leaders.map(leader => (
                <div key={leader.id} className="member-chip" style={{ margin: 0, display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className="member-chip__avatar" style={{ backgroundColor: 'gold', color: 'black' }}>
                      {leader.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: '500' }}>{leader.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{leader.user_id}</div>
                    </div>
                  </div>
                  {user.role === 'STUDENT' && leader.id === user.id && !members.length && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(You)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Members List */}
          <div className="card card--flat">
            <h3 className="card__title" style={{ fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              👥 Members ({members.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {members.length > 0 ? (
                members.map(member => (
                  <div key={member.id} className="member-chip" style={{ margin: 0, display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div className="member-chip__avatar">
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '500' }}>{member.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{member.user_id}</div>
                      </div>
                    </div>
                    {user.role === 'STUDENT' && isUserLeader && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => handlePromote(member.id)} className="btn btn--ghost btn--sm" title="Promote to Leader" style={{ fontSize: '12px' }}>
                          👑 Promote
                        </button>
                        <button onClick={() => handleRemove(member.id, member.name)} className="btn btn--ghost btn--sm" title="Remove Member" style={{ fontSize: '12px', color: 'var(--text-danger)' }}>
                          ✕ Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No regular members. Share code to invite!</span>
              )}
            </div>
          </div>

          {group.description && (
            <div className="card card--flat">
              <h4 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Description</h4>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{group.description}</p>
            </div>
          )}
        </div>

        {/* Projects column */}
        <div className="detail-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 className="detail-section__title" style={{ margin: 0 }}>Group Projects ({group.projects?.length || 0})</h2>
            {user.role === 'STUDENT' && (
              <button onClick={() => { setModalError(''); setShowProjectModal(true); }} className="btn btn--primary">
                ➕ Add Project
              </button>
            )}
          </div>
          {group.projects && group.projects.length > 0 ? (
            <div className="grid grid--2">
              {group.projects.map(proj => (
                <div key={proj.project_id} style={{ position: 'relative' }}>
                  <ProjectCard project={proj} />
                  {user.role === 'STUDENT' && isUserLeader && (
                    <button
                      onClick={() => handleDeleteProject(proj.project_id)}
                      className="btn btn--ghost btn--sm"
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        color: 'var(--text-danger)',
                        padding: '4px 8px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px'
                      }}
                      title="Delete Project"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              📭 No projects registered for this group yet. Click Add Project to start.
            </div>
          )}
        </div>
      </div>

      {/* Add Project Modal */}
      {showProjectModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>Add New Project</h2>
              <button onClick={() => setShowProjectModal(false)} className="btn btn--ghost btn--sm">✕</button>
            </div>
            {modalError && <div className="login-card__error mb-16">{modalError}</div>}
            <form onSubmit={handleCreateProject}>
              <div className="form-group mb-16">
                <label className="form-label" htmlFor="projId">Project ID / Code *</label>
                <input
                  id="projId"
                  type="text"
                  className="form-control"
                  placeholder="e.g. aid-dsa-proj-1"
                  value={projId}
                  onChange={(e) => setProjId(e.target.value)}
                  disabled={submitting}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Must be lowercase, digits, dots, underscores, or dashes only.</span>
              </div>
              <div className="form-group mb-16">
                <label className="form-label" htmlFor="projName">Project Name *</label>
                <input
                  id="projName"
                  type="text"
                  className="form-control"
                  placeholder="e.g. binary-search-tree-visualizer"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  disabled={submitting}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Must be lowercase, digits, dots, underscores, or dashes only.</span>
              </div>
              <div className="form-group mb-16">
                <label className="form-label" htmlFor="projCourse">Course / Subject</label>
                <input
                  id="projCourse"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Data Structures (CS201)"
                  value={projCourse}
                  onChange={(e) => setProjCourse(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="grid grid--2 mb-16">
                <div className="form-group">
                  <label className="form-label" htmlFor="projPriority">Priority</label>
                  <select
                    id="projPriority"
                    className="form-control"
                    value={projPriority}
                    onChange={(e) => setProjPriority(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="projDeadline">Deadline</label>
                  <input
                    id="projDeadline"
                    type="date"
                    className="form-control"
                    value={projDeadline}
                    onChange={(e) => setProjDeadline(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="form-group mb-24">
                <label className="form-label" htmlFor="projDesc">Description</label>
                <textarea
                  id="projDesc"
                  className="form-control"
                  rows="3"
                  placeholder="Describe your project work..."
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowProjectModal(false)} className="btn btn--secondary" disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
