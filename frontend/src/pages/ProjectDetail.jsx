import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import projectService from '../services/projectService';
import { useAuth } from '../context/AuthContext';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Milestone Modal/Form State
  const [msTitle, setMsTitle] = useState('');
  const [msDesc, setMsDesc] = useState('');
  const [msDue, setMsDue] = useState('');
  const [msStatus, setMsStatus] = useState('PENDING');
  const [addingMs, setAddingMs] = useState(false);
  const [msError, setMsError] = useState('');

  // Review submission state (Student review request to staff queue)
  const [reqType, setReqType] = useState('Progress Update');
  const [reqMsg, setReqMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Review comments state (Faculty persistent feedback)
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentsError, setCommentsError] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    const fetchProjectDetail = async () => {
      try {
        const detail = await projectService.getProject(projectId);
        setProject(detail);
      } catch (err) {
        setError(err.message || 'Failed to fetch project details.');
      } finally {
        setLoading(false);
      }
    };
    fetchProjectDetail();
  }, [projectId]);

  useEffect(() => {
    if (!project) return;
    const fetchComments = async () => {
      try {
        setLoadingComments(true);
        const data = await projectService.getReviewComments(project.project_id);
        setComments(data || []);
      } catch (err) {
        setCommentsError(err.message || 'Failed to fetch review comments.');
      } finally {
        setLoadingComments(false);
      }
    };
    fetchComments();
  }, [project]);

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!msTitle) return;

    setMsError('');
    try {
      const data = {
        title: msTitle,
        description: msDesc || null,
        status: msStatus,
        due_date: msDue || null,
      };
      const newMs = await projectService.addMilestone(project.project_id, data);
      
      // Update local project state with the new milestone
      setProject(prev => ({
        ...prev,
        milestones: [...(prev.milestones || []), newMs]
      }));

      // Reset form
      setMsTitle('');
      setMsDesc('');
      setMsDue('');
      setMsStatus('PENDING');
      setAddingMs(false);
    } catch (err) {
      setMsError(err.message || 'Failed to add milestone.');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reqMsg.trim()) return;

    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      await projectService.submitReviewRequest({
        project_id: project.id,
        submitted_by: user.id,
        request_type: reqType,
        message: reqMsg.trim()
      });
      setSubmitSuccess('Review request successfully submitted to Staff Review Queue!');
      setReqMsg('');
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit review request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setPostingComment(true);
    setCommentsError('');
    try {
      const added = await projectService.addReviewComment(project.project_id, newComment.trim());
      setComments(prev => [...prev, added]);
      setNewComment('');
    } catch (err) {
      setCommentsError(err.message || 'Failed to post review comment.');
    } finally {
      setPostingComment(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Project Details">
        <LoadingSpinner message="Retrieving project parameters and milestones..." />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Project Details">
        <div className="login-card__error">{error}</div>
        <Link to="/projects" className="btn btn--secondary mt-16">⬅️ Back to Projects</Link>
      </AppLayout>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED': return <span className="badge badge--success">Completed</span>;
      case 'IN_PROGRESS': return <span className="badge badge--warning">In Progress</span>;
      case 'NOT_STARTED':
      default: return <span className="badge badge--muted">Not Started</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'HIGH': return <span className="badge badge--error">High</span>;
      case 'MEDIUM': return <span className="badge badge--warning">Medium</span>;
      case 'LOW':
      default: return <span className="badge badge--success">Low</span>;
    }
  };

  return (
    <AppLayout title={`Projects / ${project.project_id}`}>
      <div className="page-header">
        <div className="page-header__left">
          <div className="flex items-center gap-12">
            <h1 className="page-header__title">{project.name}</h1>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>({project.project_id})</span>
          </div>
          <p className="page-header__subtitle">
            Workspace: {project.workspace_name} • Group: <Link to={`/groups/${project.group_id}`} style={{ fontWeight: '500' }}>{project.group_name}</Link>
          </p>
        </div>
        <div className="flex gap-12">
          {(user.role === 'STAFF' || user.role === 'STUDENT') && (
            <Link to={`/projects/${project.project_id}/edit`} className="btn btn--secondary">
              ✏️ Edit Project
            </Link>
          )}
          <Link to="/projects" className="btn btn--ghost">⬅️ Back</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        {/* Left Column: Description, Milestones, Comments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Metadata Grid */}
          <div className="grid grid--4 card card--flat">
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</div>
              <div style={{ marginTop: '4px' }}>{getStatusBadge(project.status)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Priority</div>
              <div style={{ marginTop: '4px' }}>{getPriorityBadge(project.priority)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deadline</div>
              <div style={{ marginTop: '4px', fontSize: '13px', fontWeight: '500' }}>
                {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Progress</div>
              <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>{Math.round(project.progress)}%</span>
                <div className="progress-bar" style={{ flex: 1 }}>
                  <div className="progress-bar__fill" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="detail-section">
            <h2 className="detail-section__title">Description</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {project.description || 'No description available for this project.'}
            </p>
          </div>

          {/* Submit Review Request (Student Only) */}
          {user.role === 'STUDENT' && (
            <div className="card card--flat">
              <h3 className="card__title" style={{ fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✉️</span> Submit Project Update for Review
              </h3>
              {submitSuccess && <div className="login-card__success mb-16" style={{ color: 'var(--clr-success)', fontSize: '13px' }}>{submitSuccess}</div>}
              {submitError && <div className="login-card__error mb-16">{submitError}</div>}
              <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="request-type">Request Type</label>
                  <select
                    id="request-type"
                    className="form-select"
                    value={reqType}
                    onChange={(e) => setReqType(e.target.value)}
                    required
                  >
                    <option value="Progress Update">Progress Update</option>
                    <option value="Milestone Update">Milestone Update</option>
                    <option value="General Submission">General Submission</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="review-msg">Submission Message</label>
                  <textarea
                    id="review-msg"
                    className="form-textarea"
                    value={reqMsg}
                    onChange={(e) => setReqMsg(e.target.value)}
                    required
                    placeholder="Briefly describe what changes/milestones require staff approval..."
                    rows={3}
                  />
                </div>
                <button type="submit" disabled={submitting} className="btn btn--primary" style={{ alignSelf: 'flex-start' }}>
                  {submitting ? 'Submitting...' : 'Submit to Staff Review Queue'}
                </button>
              </form>
            </div>
          )}

          {/* Milestones */}
          <div className="detail-section">
            <div className="flex justify-between items-center mb-16">
              <h2 className="detail-section__title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>Milestones</h2>
              {user.role === 'STAFF' && !addingMs && (
                <button onClick={() => setAddingMs(true)} className="btn btn--secondary btn--sm">
                  ➕ Add Milestone
                </button>
              )}
            </div>

            {addingMs && (
              <form onSubmit={handleAddMilestone} className="card mb-16" style={{ background: 'rgba(255,255,255,0.01)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>New Milestone</h4>
                {msError && <div className="login-card__error mb-16">{msError}</div>}
                
                <div className="form-group">
                  <label className="form-label">Milestone Title</label>
                  <input type="text" className="form-input" value={msTitle} onChange={(e) => setMsTitle(e.target.value)} required placeholder="e.g. Design review submission" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={msDesc} onChange={(e) => setMsDesc(e.target.value)} placeholder="Milestone details..." />
                </div>
                <div className="grid grid--2">
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input type="date" className="form-input" value={msDue} onChange={(e) => setMsDue(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={msStatus} onChange={(e) => setMsStatus(e.target.value)}>
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-12 mt-8">
                  <button type="submit" className="btn btn--primary btn--sm">Save</button>
                  <button type="button" onClick={() => setAddingMs(false)} className="btn btn--ghost btn--sm">Cancel</button>
                </div>
              </form>
            )}

            {project.milestones && project.milestones.length > 0 ? (
              <div>
                {project.milestones.map(m => (
                  <div key={m.id} className="milestone-item">
                    <div className={`milestone-item__check ${m.status === 'COMPLETED' ? 'milestone-item__check--done' : m.status === 'IN_PROGRESS' ? 'milestone-item__check--progress' : ''}`}>
                      {m.status === 'COMPLETED' ? '✓' : m.status === 'IN_PROGRESS' ? '⌛' : '○'}
                    </div>
                    <div className="milestone-item__body">
                      <div className="milestone-item__title">{m.title}</div>
                      {m.description && <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{m.description}</p>}
                    </div>
                    {m.due_date && (
                      <span className="milestone-item__due">
                        Due: {new Date(m.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', borderStyle: 'dashed' }}>
                No milestones have been established yet.
              </div>
            )}
          </div>

          {/* Project Review Comments */}
          <div className="detail-section">
            <h2 className="detail-section__title">Project Review Comments</h2>
            
            {commentsError && <div className="login-card__error mb-16">{commentsError}</div>}
            
            {loadingComments ? (
              <LoadingSpinner message="Loading review comments..." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                {comments.length > 0 ? (
                  comments.map(c => (
                    <div key={c.id} className="card card--flat" style={{ background: 'rgba(255,255,255,0.01)', padding: '16px', border: '1px solid var(--border)' }}>
                      <div className="flex justify-between items-center mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="flex items-center gap-8" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="member-chip__avatar" style={{ width: '28px', height: '28px', fontSize: '11px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {c.user_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                          </div>
                          <span style={{ fontWeight: '600', fontSize: '13px' }}>{c.user_name}</span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(c.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                        {c.comment}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', borderStyle: 'dashed' }}>
                    No review comments have been recorded for this project yet.
                  </div>
                )}
              </div>
            )}

            {user.role === 'STAFF' && (
              <form onSubmit={handleAddComment} className="card" style={{ background: 'rgba(255,255,255,0.01)', padding: '20px' }}>
                <h3 className="card__title" style={{ fontSize: '14px', marginBottom: '12px' }}>✍️ Write Review Comment</h3>
                <div className="form-group">
                  <textarea
                    className="form-textarea"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    required
                    placeholder="Provide constructive feedback, review notes, or academic comments..."
                    rows={4}
                  />
                </div>
                <button type="submit" disabled={postingComment} className="btn btn--primary">
                  {postingComment ? 'Posting Comment...' : 'Submit Review Comment'}
                </button>
              </form>
            )}

            {user.role === 'STUDENT' && (
              <div className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', borderStyle: 'dashed', textAlign: 'center' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>🔒 Comments are read-only for students.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Group Members & Activity Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Members */}
          <div className="card card--flat">
            <h3 className="card__title" style={{ fontSize: '15px', marginBottom: '16px' }}>👥 Group Members</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {project.members && project.members.length > 0 ? (
                project.members.map(member => (
                  <div key={member.id} className="member-chip" style={{ margin: 0, display: 'flex', width: '100%' }}>
                    <div className="member-chip__avatar">
                      {member.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: '500' }}>{member.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{member.user_id}</div>
                    </div>
                  </div>
                ))
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No student members assigned.</span>
              )}
            </div>
          </div>

          {/* Activity Logs */}
          <div className="card card--flat">
            <h3 className="card__title" style={{ fontSize: '15px', marginBottom: '16px' }}>🔔 Recent Log</h3>
            {project.activities && project.activities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {project.activities.map(act => (
                  <div key={act.id} className="activity-item">
                    <div className="activity-item__dot" />
                    <div className="activity-item__content">
                      <p className="activity-item__message" style={{ fontSize: '12px' }}>
                        <strong>{act.user_name}</strong> {act.message.replace(/'[^']+'/g, '')}
                      </p>
                      <span className="activity-item__meta" style={{ fontSize: '10px' }}>
                        {new Date(act.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', display: 'block', padding: '10px 0' }}>
                No activities logged yet.
              </span>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
