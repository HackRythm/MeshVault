import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import projectService from '../services/projectService';
import { useAuth } from '../context/AuthContext';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get('workspace_id') ? parseInt(searchParams.get('workspace_id')) : null;

  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Milestone state
  const [msTitle, setMsTitle] = useState('');
  const [msDesc, setMsDesc] = useState('');
  const [msDue, setMsDue] = useState('');
  const [msStatus, setMsStatus] = useState('PENDING');
  const [addingMs, setAddingMs] = useState(false);
  const [msError, setMsError] = useState('');

  // Review request (student → staff queue)
  const [reqType, setReqType] = useState('Progress Update');
  const [reqMsg, setReqMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Workspace-scoped comments
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Reply state: { [commentId]: string }
  const [replyTexts, setReplyTexts] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [postingReply, setPostingReply] = useState(false);

  // Evaluation state (faculty only)
  const [evaluations, setEvaluations] = useState([]);
  const [loadingEvals, setLoadingEvals] = useState(false);
  const [showEvalForm, setShowEvalForm] = useState(false);
  const [evalScore, setEvalScore] = useState('');
  const [evalMaxScore, setEvalMaxScore] = useState('100');
  const [evalNotes, setEvalNotes] = useState('');
  const [submittingEval, setSubmittingEval] = useState(false);
  const [evalError, setEvalError] = useState('');
  const [evalSuccess, setEvalSuccess] = useState('');

  // ─── Load project ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetch = async () => {
      try {
        let detail;
        if (workspaceId) {
          // Workspace-scoped view (faculty or student inside a workspace context)
          detail = await projectService.getWorkspaceProject(workspaceId, projectId);
        } else {
          detail = await projectService.getProject(projectId);
        }
        setProject(detail);
      } catch (err) {
        setError(err.message || 'Failed to fetch project details.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [projectId, workspaceId]);

  // ─── Load workspace-scoped comments ──────────────────────────────────────────
  useEffect(() => {
    if (!project || !workspaceId) return;
    const fetchComments = async () => {
      try {
        setLoadingComments(true);
        const data = await projectService.getWorkspaceComments(workspaceId, project.project_id);
        setComments(data || []);
      } catch (err) {
        setCommentsError(err.message || 'Failed to fetch review comments.');
      } finally {
        setLoadingComments(false);
      }
    };
    fetchComments();
  }, [project, workspaceId]);

  // ─── Load evaluations (faculty only) ─────────────────────────────────────────
  useEffect(() => {
    if (!project || !workspaceId || user.role !== 'STAFF') return;
    const fetchEvals = async () => {
      try {
        setLoadingEvals(true);
        const data = await projectService.getEvaluations(workspaceId, project.project_id);
        setEvaluations(data || []);
      } catch (err) {
        // Silently ignore — grading may not exist yet
      } finally {
        setLoadingEvals(false);
      }
    };
    fetchEvals();
  }, [project, workspaceId, user.role]);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!msTitle) return;
    setMsError('');
    try {
      const data = { title: msTitle, description: msDesc || null, status: msStatus, due_date: msDue || null };
      const newMs = await projectService.addMilestone(project.project_id, data);
      setProject(prev => ({ ...prev, milestones: [...(prev.milestones || []), newMs] }));
      setMsTitle(''); setMsDesc(''); setMsDue(''); setMsStatus('PENDING'); setAddingMs(false);
    } catch (err) {
      setMsError(err.message || 'Failed to add milestone.');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reqMsg.trim()) return;
    setSubmitting(true); setSubmitError(''); setSubmitSuccess('');
    try {
      await projectService.submitReviewRequest({
        project_id: project.id,
        submitted_by: user.id,
        request_type: reqType,
        message: reqMsg.trim()
      });
      setSubmitSuccess('Review request submitted to Staff Review Queue!');
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
    setPostingComment(true); setCommentsError('');
    try {
      const added = await projectService.addWorkspaceComment(workspaceId, project.project_id, newComment.trim());
      setComments(prev => [...prev, { ...added, replies: [] }]);
      setNewComment('');
    } catch (err) {
      setCommentsError(err.message || 'Failed to post review comment.');
    } finally {
      setPostingComment(false);
    }
  };

  const handleReply = async (commentId) => {
    const text = replyTexts[commentId]?.trim();
    if (!text) return;
    setPostingReply(true);
    try {
      const reply = await projectService.replyToComment(workspaceId, project.project_id, commentId, text);
      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, replies: [...(c.replies || []), reply] } : c
      ));
      setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
      setReplyingTo(null);
    } catch (err) {
      setCommentsError(err.message || 'Failed to post reply.');
    } finally {
      setPostingReply(false);
    }
  };

  const handleSubmitEval = async (e) => {
    e.preventDefault();
    const score = parseFloat(evalScore);
    const maxScore = parseFloat(evalMaxScore);
    if (isNaN(score) || isNaN(maxScore)) { setEvalError('Enter valid numbers.'); return; }
    if (score < 0) { setEvalError('Score cannot be negative.'); return; }
    if (score > maxScore) { setEvalError('Score cannot exceed max score.'); return; }
    setSubmittingEval(true); setEvalError(''); setEvalSuccess('');
    try {
      const ev = await projectService.submitEvaluation(workspaceId, project.project_id, {
        score,
        max_score: maxScore,
        notes: evalNotes.trim() || null,
      });
      setEvaluations(prev => [...prev, ev]);
      setEvalScore(''); setEvalMaxScore('100'); setEvalNotes('');
      setEvalSuccess(`Evaluation recorded: ${score}/${maxScore}`);
      setShowEvalForm(false);
    } catch (err) {
      setEvalError(err.message || 'Failed to submit evaluation.');
    } finally {
      setSubmittingEval(false);
    }
  };

  // ─── Render helpers ───────────────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED': return <span className="badge badge--success">Completed</span>;
      case 'IN_PROGRESS': return <span className="badge badge--warning">In Progress</span>;
      default: return <span className="badge badge--muted">Not Started</span>;
    }
  };
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'HIGH': return <span className="badge badge--error">High</span>;
      case 'MEDIUM': return <span className="badge badge--warning">Medium</span>;
      default: return <span className="badge badge--success">Low</span>;
    }
  };

  if (loading) return <AppLayout title="Project Details"><LoadingSpinner message="Retrieving project parameters..." /></AppLayout>;
  if (error) return (
    <AppLayout title="Project Details">
      <div className="login-card__error">{error}</div>
      <Link to="/projects" className="btn btn--secondary mt-16">⬅️ Back to Projects</Link>
    </AppLayout>
  );

  const backLink = workspaceId ? `/workspace` : `/projects`;
  const isWorkspaceContext = !!workspaceId;

  return (
    <AppLayout title={`Projects / ${project.project_id}`}>
      <div className="page-header">
        <div className="page-header__left">
          <div className="flex items-center gap-12">
            <h1 className="page-header__title">{project.name}</h1>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>({project.project_id})</span>
          </div>
          <p className="page-header__subtitle">
            {project.workspace_name && <span>Workspace: <strong>{project.workspace_name}</strong> • </span>}
            Group: <Link to={`/groups/${project.group_id}`} style={{ fontWeight: '500' }}>{project.group_name}</Link>
          </p>
        </div>
        <div className="flex gap-12">
          {/* Faculty CANNOT edit student projects */}
          {user.role === 'STUDENT' && (
            <Link to={`/projects/${project.project_id}/edit`} className="btn btn--secondary">✏️ Edit Project</Link>
          )}
          <Link to={backLink} className="btn btn--ghost">⬅️ Back</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        {/* ─── Left Column ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Metadata */}
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

          {/* Student: Submit review request */}
          {user.role === 'STUDENT' && (
            <div className="card card--flat">
              <h3 className="card__title" style={{ fontSize: '15px', marginBottom: '16px' }}>✉️ Submit Project Update for Review</h3>
              {submitSuccess && <div className="login-card__success mb-16" style={{ fontSize: '13px' }}>{submitSuccess}</div>}
              {submitError && <div className="login-card__error mb-16">{submitError}</div>}
              <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Request Type</label>
                  <select className="form-select" value={reqType} onChange={e => setReqType(e.target.value)}>
                    <option>Progress Update</option>
                    <option>Milestone Update</option>
                    <option>General Submission</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Submission Message</label>
                  <textarea className="form-textarea" value={reqMsg} onChange={e => setReqMsg(e.target.value)} required rows={3}
                    placeholder="Briefly describe what requires staff review..." />
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
              {/* Only students can add milestones to their own projects */}
              {user.role === 'STUDENT' && !addingMs && (
                <button onClick={() => setAddingMs(true)} className="btn btn--secondary btn--sm">➕ Add Milestone</button>
              )}
            </div>
            {addingMs && (
              <form onSubmit={handleAddMilestone} className="card mb-16" style={{ background: 'rgba(255,255,255,0.01)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>New Milestone</h4>
                {msError && <div className="login-card__error mb-16">{msError}</div>}
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input type="text" className="form-input" value={msTitle} onChange={e => setMsTitle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={msDesc} onChange={e => setMsDesc(e.target.value)} />
                </div>
                <div className="grid grid--2">
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input type="date" className="form-input" value={msDue} onChange={e => setMsDue(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={msStatus} onChange={e => setMsStatus(e.target.value)}>
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
              project.milestones.map(m => (
                <div key={m.id} className="milestone-item">
                  <div className={`milestone-item__check ${m.status === 'COMPLETED' ? 'milestone-item__check--done' : m.status === 'IN_PROGRESS' ? 'milestone-item__check--progress' : ''}`}>
                    {m.status === 'COMPLETED' ? '✓' : m.status === 'IN_PROGRESS' ? '⌛' : '○'}
                  </div>
                  <div className="milestone-item__body">
                    <div className="milestone-item__title">{m.title}</div>
                    {m.description && <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{m.description}</p>}
                  </div>
                  {m.due_date && <span className="milestone-item__due">Due: {new Date(m.due_date).toLocaleDateString()}</span>}
                </div>
              ))
            ) : (
              <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', borderStyle: 'dashed' }}>
                No milestones established yet.
              </div>
            )}
          </div>

          {/* ─── Review Comments (workspace-scoped) ─── */}
          {isWorkspaceContext && (
            <div className="detail-section">
              <h2 className="detail-section__title">Project Review Comments</h2>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                🔒 Comments are scoped to this workspace only. Other groups and workspaces cannot see this discussion.
              </p>

              {commentsError && <div className="login-card__error mb-16">{commentsError}</div>}

              {loadingComments ? (
                <LoadingSpinner message="Loading review comments..." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  {comments.length > 0 ? comments.map(c => (
                    <div key={c.id}>
                      {/* Top-level comment */}
                      <div className="card card--flat" style={{ background: c.is_faculty ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.01)', padding: '16px', border: `1px solid ${c.is_faculty ? 'rgba(99,102,241,0.25)' : 'var(--border)'}` }}>
                        <div className="flex justify-between items-center mb-8">
                          <div className="flex items-center gap-8">
                            <div className="member-chip__avatar" style={{ width: '28px', height: '28px', fontSize: '11px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.is_faculty ? 'rgba(99,102,241,0.3)' : undefined }}>
                              {c.user_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                            </div>
                            <span style={{ fontWeight: '600', fontSize: '13px' }}>{c.user_name}</span>
                            {c.is_faculty && <span className="badge badge--muted" style={{ fontSize: '10px' }}>Faculty</span>}
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{c.comment}</p>

                        {/* Reply button */}
                        <button
                          onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                          className="btn btn--ghost btn--sm"
                          style={{ marginTop: '8px', fontSize: '11px', padding: '3px 8px' }}
                        >
                          💬 {replyingTo === c.id ? 'Cancel' : 'Reply'}
                        </button>
                      </div>

                      {/* Replies */}
                      {c.replies && c.replies.length > 0 && (
                        <div style={{ marginLeft: '24px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {c.replies.map(r => (
                            <div key={r.id} className="card card--flat" style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.005)', border: '1px solid var(--border)' }}>
                              <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-8">
                                  <div className="member-chip__avatar" style={{ width: '22px', height: '22px', fontSize: '10px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {r.user_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                  </div>
                                  <span style={{ fontWeight: '600', fontSize: '12px' }}>{r.user_name}</span>
                                  {r.is_faculty && <span className="badge badge--muted" style={{ fontSize: '9px' }}>Faculty</span>}
                                </div>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleString()}</span>
                              </div>
                              <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', margin: 0, lineHeight: '1.5' }}>{r.comment}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply form */}
                      {replyingTo === c.id && (
                        <div style={{ marginLeft: '24px', marginTop: '8px' }}>
                          <div className="flex gap-8">
                            <input
                              type="text"
                              className="form-input"
                              value={replyTexts[c.id] || ''}
                              onChange={e => setReplyTexts(prev => ({ ...prev, [c.id]: e.target.value }))}
                              placeholder="Write your reply..."
                              style={{ flex: 1, fontSize: '12.5px' }}
                              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply(c.id)}
                            />
                            <button
                              onClick={() => handleReply(c.id)}
                              disabled={postingReply}
                              className="btn btn--secondary btn--sm"
                            >
                              {postingReply ? '...' : 'Reply'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', borderStyle: 'dashed' }}>
                      No review comments recorded for this project in this workspace yet.
                    </div>
                  )}
                </div>
              )}

              {/* Faculty: Write new comment */}
              {user.role === 'STAFF' && (
                <form onSubmit={handleAddComment} className="card" style={{ background: 'rgba(255,255,255,0.01)', padding: '20px' }}>
                  <h3 className="card__title" style={{ fontSize: '14px', marginBottom: '12px' }}>✍️ Write Review Comment</h3>
                  <div className="form-group">
                    <textarea className="form-textarea" value={newComment} onChange={e => setNewComment(e.target.value)} required
                      placeholder="Provide constructive feedback, review notes, or academic comments..." rows={4} />
                  </div>
                  <button type="submit" disabled={postingComment} className="btn btn--primary">
                    {postingComment ? 'Posting...' : 'Submit Review Comment'}
                  </button>
                </form>
              )}

              {/* Student: Read-only notice */}
              {user.role === 'STUDENT' && (
                <div className="card" style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.01)', borderStyle: 'dashed', textAlign: 'center' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    🔒 Students can read and reply to comments, but cannot post top-level review comments.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ─── Faculty: Grading / Evaluation Panel ─── */}
          {isWorkspaceContext && user.role === 'STAFF' && (
            <div className="detail-section">
              <div className="flex justify-between items-center mb-16">
                <h2 className="detail-section__title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
                  📊 Grading &amp; Evaluation
                </h2>
                <button onClick={() => { setShowEvalForm(f => !f); setEvalError(''); setEvalSuccess(''); }}
                  className="btn btn--secondary btn--sm">
                  {showEvalForm ? 'Cancel' : '➕ New Evaluation'}
                </button>
              </div>

              {evalError && <div className="login-card__error mb-16">{evalError}</div>}
              {evalSuccess && <div className="login-card__success mb-16">{evalSuccess}</div>}

              {showEvalForm && (
                <form onSubmit={handleSubmitEval} className="card mb-24" style={{ background: 'rgba(255,255,255,0.01)', padding: '20px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>New Evaluation Record</h4>
                  <div className="grid grid--2 gap-12">
                    <div className="form-group mb-12">
                      <label className="form-label" style={{ fontSize: '11px' }}>Score</label>
                      <input type="number" step="0.01" min="0" className="form-input" value={evalScore}
                        onChange={e => setEvalScore(e.target.value)} required placeholder="e.g. 85" />
                    </div>
                    <div className="form-group mb-12">
                      <label className="form-label" style={{ fontSize: '11px' }}>Max Score</label>
                      <input type="number" step="0.01" min="1" className="form-input" value={evalMaxScore}
                        onChange={e => setEvalMaxScore(e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-group mb-12">
                    <label className="form-label" style={{ fontSize: '11px' }}>Notes (optional)</label>
                    <textarea className="form-textarea" value={evalNotes} onChange={e => setEvalNotes(e.target.value)}
                      placeholder="Evaluation remarks..." rows={3} />
                  </div>
                  <button type="submit" disabled={submittingEval} className="btn btn--primary">
                    {submittingEval ? 'Saving...' : 'Record Evaluation'}
                  </button>
                </form>
              )}

              {/* Grading History */}
              <h4 style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: '12px' }}>
                Grading History ({evaluations.length} record{evaluations.length !== 1 ? 's' : ''})
              </h4>
              {loadingEvals ? (
                <LoadingSpinner message="Loading grading history..." />
              ) : evaluations.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {evaluations.map((ev, idx) => {
                    const pct = Math.round((ev.score / ev.max_score) * 100);
                    const isLatest = idx === evaluations.length - 1;
                    return (
                      <div key={ev.id} className="card card--flat" style={{ padding: '14px 18px', border: `1px solid ${isLatest ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`, background: isLatest ? 'rgba(99,102,241,0.04)' : 'rgba(255,255,255,0.005)' }}>
                        <div className="flex justify-between items-center">
                          <div>
                            <span style={{ fontSize: '18px', fontWeight: '700', color: pct >= 75 ? 'var(--clr-success)' : pct >= 50 ? 'var(--clr-warning)' : 'var(--clr-error)' }}>
                              {ev.score}/{ev.max_score}
                            </span>
                            <span style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>({pct}%)</span>
                            {isLatest && <span className="badge badge--muted" style={{ marginLeft: '8px', fontSize: '10px' }}>Latest</span>}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(ev.created_at).toLocaleDateString()}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>by {ev.evaluator_name}</div>
                          </div>
                        </div>
                        {ev.notes && (
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', marginBottom: 0, lineHeight: '1.5' }}>
                            {ev.notes}
                          </p>
                        )}
                        {/* Progress bar */}
                        <div className="progress-bar" style={{ marginTop: '10px' }}>
                          <div className="progress-bar__fill" style={{ width: `${pct}%`, background: pct >= 75 ? 'var(--clr-success)' : pct >= 50 ? 'var(--clr-warning)' : 'var(--clr-error)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', borderStyle: 'dashed' }}>
                  No evaluations recorded yet for this project.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Right Column ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Group Members */}
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
                      <div style={{ fontWeight: '500' }}>
                        {member.name}
                        {member.is_leader && <span className="badge badge--muted" style={{ marginLeft: '6px', fontSize: '9px' }}>Leader</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{member.user_id}</div>
                    </div>
                  </div>
                ))
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No student members assigned.</span>
              )}
            </div>
          </div>

          {/* Activity Logs — only for students (not faculty workspace view) */}
          {!isWorkspaceContext && project.activities && (
            <div className="card card--flat">
              <h3 className="card__title" style={{ fontSize: '15px', marginBottom: '16px' }}>🔔 Recent Log</h3>
              {project.activities.length > 0 ? (
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
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', display: 'block' }}>No activities logged yet.</span>
              )}
            </div>
          )}

          {/* Workspace info card */}
          {isWorkspaceContext && (
            <div className="card card--flat" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: '10px' }}>Workspace Context</h4>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                <div style={{ marginBottom: '6px' }}><strong>Workspace:</strong> {project.workspace_name}</div>
                <div style={{ marginBottom: '6px' }}><strong>Group:</strong> {project.group_name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
                  ℹ️ Comments and evaluations are isolated to this workspace. Other workspaces cannot see this data.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
