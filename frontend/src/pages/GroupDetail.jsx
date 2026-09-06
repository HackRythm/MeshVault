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
  const [showJoinWsModal, setShowJoinWsModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Workspace Join state
  const [joinWsCode, setJoinWsCode] = useState('');
  const [joinWsError, setJoinWsError] = useState('');
  const [joinWsSuccess, setJoinWsSuccess] = useState('');
  const [joinWsSubmitting, setJoinWsSubmitting] = useState(false);

  // Add Project Form states
  const [projId, setProjId] = useState('');
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projCourse, setProjCourse] = useState('');
  const [projPriority, setProjPriority] = useState('MEDIUM');
  const [projDeadline, setProjDeadline] = useState('');
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Review Request Form states (student -> staff queue)
  const [reviewProjId, setReviewProjId] = useState('');
  const [reviewType, setReviewType] = useState('Progress Update');
  const [reviewMsg, setReviewMsg] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Log filter
  const [logFilter, setLogFilter] = useState('ALL');

  const fetchGroupDetail = async () => {
    try {
      setLoading(true);
      const detail = await groupService.getGroup(id);
      setGroup(detail);
      if (detail.projects && detail.projects.length > 0 && !reviewProjId) {
        setReviewProjId(detail.projects[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch group details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupDetail();
  }, [id]);

  const handleJoinWorkspace = async (e) => {
    e.preventDefault();
    if (!joinWsCode.trim()) {
      setJoinWsError('Please enter a Workspace ID (e.g. WS-001).');
      return;
    }

    setJoinWsError('');
    setJoinWsSuccess('');
    setJoinWsSubmitting(true);
    try {
      const res = await groupService.joinWorkspace(id, joinWsCode.trim());
      setJoinWsSuccess(res.message || 'Group joined workspace successfully!');
      setJoinWsCode('');
      await fetchGroupDetail();
      setTimeout(() => setShowJoinWsModal(false), 1200);
    } catch (err) {
      setJoinWsError(err.message || 'Failed to join workspace.');
    } finally {
      setJoinWsSubmitting(false);
    }
  };

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

  const handleGroupReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewProjId) {
      setReviewError('Please select a project to review.');
      return;
    }
    if (!reviewMsg.trim()) {
      setReviewError('Please enter a message for the review request.');
      return;
    }

    setReviewSubmitting(true);
    setReviewError('');
    setReviewSuccess('');

    try {
      await projectService.submitReviewRequest({
        project_id: parseInt(reviewProjId),
        submitted_by: user.id,
        request_type: reviewType,
        message: reviewMsg.trim(),
      });
      setReviewSuccess('Review request submitted successfully to the Staff Review Queue!');
      setReviewMsg('');
      await fetchGroupDetail();
      setTimeout(() => {
        setShowReviewModal(false);
        setReviewSuccess('');
      }, 1500);
    } catch (err) {
      setReviewError(err.message || 'Failed to submit review request.');
    } finally {
      setReviewSubmitting(false);
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

  const handleRequestLeaveWorkspace = async () => {
    if (!window.confirm(`Are you sure you want to request to leave workspace "${group.workspace_name}" (${group.workspace_code || `WS-${group.workspace_id}`})?\n\nThis will send a leave permission request to the course instructor.`)) return;

    try {
      await groupService.requestLeaveWorkspace(group.id, group.workspace_id);
      alert('Leave workspace request submitted! Awaiting instructor approval.');
      await fetchGroupDetail();
    } catch (err) {
      alert(err.message || 'Failed to submit leave request.');
    }
  };

  const copyCodeToClipboard = () => {
    if (group && group.code) {
      navigator.clipboard.writeText(group.code);
      alert('Group code copied to clipboard!');
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'REVIEW_REQUESTED': return '📋';
      case 'REVIEW_PROCESSED': return '✅';
      case 'GRADE_EVALUATED': return '🎓';
      case 'PROJECT_CREATED': return '🆕';
      case 'PROJECT_UPDATED': return '✏️';
      case 'PROGRESS_UPDATED': return '📈';
      case 'STATUS_CHANGED': return '🔄';
      case 'MILESTONE_ADDED': return '🏁';
      default: return '📜';
    }
  };

  const getActivityBadge = (type) => {
    switch (type) {
      case 'REVIEW_REQUESTED': return <span className="badge badge--warning">Review Requested</span>;
      case 'REVIEW_PROCESSED': return <span className="badge badge--success">Review Approved</span>;
      case 'GRADE_EVALUATED': return <span className="badge badge--accent">Grade Recorded</span>;
      case 'PROJECT_CREATED': return <span className="badge badge--info">Project Created</span>;
      case 'PROGRESS_UPDATED': return <span className="badge badge--warning">Progress Updated</span>;
      case 'MILESTONE_ADDED': return <span className="badge badge--muted">Milestone Added</span>;
      default: return <span className="badge badge--neutral">{type.replace('_', ' ')}</span>;
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
  const isRemovalPending = group.workspace_connection_status === 'REMOVAL_PENDING';
  const pendingReviews = group.pending_reviews || [];
  const activities = group.activities || [];
  const reviewRequests = group.review_requests || [];

  // Filter activities and reviews
  let filteredActivities = activities;
  if (logFilter === 'REVIEWS') {
    filteredActivities = activities.filter(a => a.activity_type.includes('REVIEW') || a.activity_type.includes('GRADE'));
  } else if (logFilter === 'MILESTONES') {
    filteredActivities = activities.filter(a => a.activity_type === 'MILESTONE_ADDED');
  } else if (logFilter === 'PROJECTS') {
    filteredActivities = activities.filter(a => a.activity_type.includes('PROJECT') || a.activity_type.includes('PROGRESS'));
  }

  return (
    <AppLayout title={`Groups / ${group.name}`}>
      <div className="page-header">
        <div className="page-header__left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-header__title" style={{ margin: 0 }}>{group.name}</h1>
            {group.group_number && (
              <span className="badge badge--neutral" style={{ fontSize: '13px', padding: '3px 8px' }}>
                {group.group_number}
              </span>
            )}
            {group.workspace_id ? (
              isRemovalPending ? (
                <span className="badge badge--warning" style={{ fontSize: '12px' }}>
                  ⏳ Leave Pending: {group.workspace_code || `WS-${group.workspace_id}`}
                </span>
              ) : (
                <span className="badge badge--success" style={{ fontSize: '12px' }}>
                  ✓ {group.workspace_code || `WS-${group.workspace_id}`}: {group.workspace_name}
                </span>
              )
            ) : (
              <span className="badge badge--muted" style={{ fontSize: '12px' }}>
                ⚠️ No Workspace Linked
              </span>
            )}
          </div>
          <p className="page-header__subtitle" style={{ marginTop: '6px' }}>
            Group Code: <code style={{ background: 'var(--bg-card-hover)', padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>{group.code}</code>
            {user.role === 'STUDENT' && (
              <button onClick={copyCodeToClipboard} className="btn btn--ghost btn--sm" style={{ padding: '2px 6px' }}>📋 Copy</button>
            )}
          </p>
        </div>
        <div className="page-header__actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link to="/groups" className="btn btn--secondary">⬅️ Back</Link>
          
          {/* Student Review Request Button */}
          {user.role === 'STUDENT' && group.projects && group.projects.length > 0 && (
            <button
              onClick={() => {
                setReviewError('');
                setReviewSuccess('');
                setShowReviewModal(true);
              }}
              className="btn btn--primary"
              style={{ background: 'var(--accent-gradient)' }}
            >
              🚀 Request Review
            </button>
          )}

          {/* Join Workspace / Leave Workspace button inside the group */}
          {user.role === 'STUDENT' && isUserLeader && (
            <>
              {!group.workspace_id ? (
                <button
                  onClick={() => {
                    setJoinWsError('');
                    setJoinWsSuccess('');
                    setShowJoinWsModal(true);
                  }}
                  className="btn btn--primary"
                >
                  🔗 Join Workspace
                </button>
              ) : isRemovalPending ? (
                <span className="badge badge--warning" style={{ padding: '6px 12px', fontSize: '12px' }}>
                  ⏳ Leave Request Pending Staff Approval
                </span>
              ) : (
                <button
                  onClick={handleRequestLeaveWorkspace}
                  className="btn btn--secondary"
                  style={{ color: 'var(--text-danger)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                >
                  🚪 Leave Workspace
                </button>
              )}
            </>
          )}

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

      {/* Staff Review Alert Banner */}
      {user.role === 'STAFF' && pendingReviews.length > 0 && (
        <div
          className="card mb-24 p-16"
          style={{
            border: '1px solid rgba(255, 107, 107, 0.4)',
            background: 'rgba(255, 107, 107, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: 'var(--radius)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🔔</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '14.5px', color: 'var(--clr-error)' }}>
                {pendingReviews.length} Pending Review Request{pendingReviews.length === 1 ? '' : 's'} from this Group!
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Latest: <strong>{pendingReviews[0].request_type}</strong> for {pendingReviews[0].project_name} ({pendingReviews[0].project_id}) — Submitted by {pendingReviews[0].submitted_by}
              </div>
            </div>
          </div>
          <Link
            to="/review-queue"
            className="btn btn--primary btn--sm"
            style={{ background: 'var(--clr-error)', borderColor: 'var(--clr-error)', whiteSpace: 'nowrap' }}
          >
            ⚡ Review in Staff Queue ➜
          </Link>
        </div>
      )}

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

        {/* Projects and Activity Log column */}
        <div className="detail-section">
          {/* Workspace Connection Banner */}
          {!group.workspace_id ? (
            <div className="card mb-20 p-16" style={{ border: '1px solid rgba(99, 102, 241, 0.4)', background: 'rgba(99, 102, 241, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 'var(--radius)', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px', color: 'var(--text-primary)' }}>
                  🏫 Connect Group to Academic Workspace
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  This group is standalone. As group leader, use the instructor's <strong>Workspace Code</strong> (e.g. WS-ADSA-204) to join a course workspace.
                </div>
              </div>
              {user.role === 'STUDENT' && isUserLeader && (
                <button
                  onClick={() => {
                    setJoinWsError('');
                    setJoinWsSuccess('');
                    setShowJoinWsModal(true);
                  }}
                  className="btn btn--primary btn--sm"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  🔗 Join Workspace
                </button>
              )}
            </div>
          ) : isRemovalPending ? (
            <div className="card mb-20 p-16" style={{ border: '1px solid rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 'var(--radius)', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px', color: 'var(--clr-warning)' }}>
                  ⏳ Leave Workspace Request Submitted (Awaiting Staff Permission)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Your request to unlink <strong>{group.name}</strong> from <strong>{group.workspace_name}</strong> is currently pending review and permission from the course instructor.
                </div>
              </div>
              <span className="badge badge--warning" style={{ padding: '6px 12px' }}>
                Pending Review
              </span>
            </div>
          ) : (
            <div className="card mb-20 p-16" style={{ border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 'var(--radius)', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px', color: 'var(--text-primary)' }}>
                  ✓ Connected to Workspace: <span style={{ color: 'var(--clr-primary)' }}>{group.workspace_code || `WS-${group.workspace_id}`}</span> ({group.workspace_name})
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Course: {group.course_code || 'N/A'} {group.course_name ? `— ${group.course_name}` : ''} | Group Number: <strong>{group.group_number || 'N/A'}</strong>
                </div>
              </div>
              {user.role === 'STUDENT' && isUserLeader && (
                <button
                  onClick={handleRequestLeaveWorkspace}
                  className="btn btn--secondary btn--sm"
                  style={{ whiteSpace: 'nowrap', color: 'var(--text-danger)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                >
                  🚪 Leave Workspace
                </button>
              )}
            </div>
          )}

          {/* Group Projects Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="detail-section__title" style={{ margin: 0 }}>Group Projects ({group.projects?.length || 0})</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {user.role === 'STUDENT' && (
                <button onClick={() => { setModalError(''); setShowProjectModal(true); }} className="btn btn--primary btn--sm">
                  ➕ Add Project
                </button>
              )}
            </div>
          </div>
          {group.projects && group.projects.length > 0 ? (
            <div className="grid grid--2 mb-32">
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
            <div className="card mb-32" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              📭 No projects registered for this group yet. Click Add Project to start.
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* GROUP ACTIVITY & PAST UPDATES LOG (Student & Staff Side)     */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="card card--flat">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 className="card__title" style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📜</span> Group Activity & Past Updates Log
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Audit log of past project updates, review submissions, and staff approvals.
                </p>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className={`btn btn--sm ${logFilter === 'ALL' ? 'btn--primary' : 'btn--ghost'}`}
                  onClick={() => setLogFilter('ALL')}
                  style={{ fontSize: '11.5px', padding: '4px 10px' }}
                >
                  All ({activities.length})
                </button>
                <button
                  className={`btn btn--sm ${logFilter === 'REVIEWS' ? 'btn--primary' : 'btn--ghost'}`}
                  onClick={() => setLogFilter('REVIEWS')}
                  style={{ fontSize: '11.5px', padding: '4px 10px' }}
                >
                  Reviews ({reviewRequests.length})
                </button>
                <button
                  className={`btn btn--sm ${logFilter === 'MILESTONES' ? 'btn--primary' : 'btn--ghost'}`}
                  onClick={() => setLogFilter('MILESTONES')}
                  style={{ fontSize: '11.5px', padding: '4px 10px' }}
                >
                  Milestones
                </button>
                <button
                  className={`btn btn--sm ${logFilter === 'PROJECTS' ? 'btn--primary' : 'btn--ghost'}`}
                  onClick={() => setLogFilter('PROJECTS')}
                  style={{ fontSize: '11.5px', padding: '4px 10px' }}
                >
                  Projects
                </button>
              </div>
            </div>

            {/* Pending Reviews Box if any */}
            {reviewRequests.filter(r => r.status === 'PENDING').length > 0 && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(253, 203, 110, 0.08)', border: '1px solid rgba(253, 203, 110, 0.3)', borderRadius: 'var(--radius-sm)' }}>
                <strong style={{ fontSize: '12.5px', color: 'var(--clr-warning)', display: 'block', marginBottom: '8px' }}>
                  ⏳ Active Pending Review Requests ({reviewRequests.filter(r => r.status === 'PENDING').length}):
                </strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {reviewRequests.filter(r => r.status === 'PENDING').map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px' }}>
                      <span><strong>{r.project_name}</strong> ({r.project_id}) — <em>{r.request_type}</em>: "{r.message}"</span>
                      <span className="badge badge--warning">Pending Staff Queue</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline List */}
            {filteredActivities && filteredActivities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                {filteredActivities.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      padding: '14px 12px',
                      borderBottom: idx === filteredActivities.length - 1 ? 'none' : '1px solid var(--border)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: '20px', marginTop: '2px' }}>
                      {getActivityIcon(item.activity_type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>
                            {item.user_name}
                          </span>
                          {item.user_role && (
                            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: '4px' }}>
                              {item.user_role}
                            </span>
                          )}
                          {item.project_name && (
                            <span style={{ fontSize: '12px', color: 'var(--clr-primary)' }}>
                              • {item.project_name} ({item.project_id})
                            </span>
                          )}
                        </div>
                        <div>
                          {getActivityBadge(item.activity_type)}
                        </div>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        {item.message}
                      </p>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                📭 No past updates recorded for this filter.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submit Review Request Modal (Student Side) */}
      {showReviewModal && (
        <div style={modalOverlayStyle} onClick={() => setShowReviewModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                🚀 Submit Review Request to Staff
              </h2>
              <button onClick={() => setShowReviewModal(false)} className="btn btn--ghost btn--sm">✕</button>
            </div>

            {reviewError && <div className="login-card__error mb-16">{reviewError}</div>}
            {reviewSuccess && <div className="badge badge--success mb-16 p-12" style={{ display: 'block', textAlign: 'center' }}>{reviewSuccess}</div>}

            <form onSubmit={handleGroupReviewSubmit}>
              <div className="form-group mb-16">
                <label className="form-label">Select Group Project *</label>
                <select
                  className="form-control"
                  value={reviewProjId}
                  onChange={(e) => setReviewProjId(e.target.value)}
                  disabled={reviewSubmitting}
                  required
                >
                  {group.projects?.map(p => (
                    <option key={p.id} value={p.id}>{p.project_id} — {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group mb-16">
                <label className="form-label">Review Request Type *</label>
                <select
                  className="form-control"
                  value={reviewType}
                  onChange={(e) => setReviewType(e.target.value)}
                  disabled={reviewSubmitting}
                >
                  <option value="Progress Update">Progress Update</option>
                  <option value="Milestone Review">Milestone Review</option>
                  <option value="Code Review">Code Review</option>
                  <option value="Final Submission">Final Submission</option>
                </select>
              </div>

              <div className="form-group mb-24">
                <label className="form-label">Review Notes & Message *</label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Describe what your group accomplished and what needs staff review..."
                  value={reviewMsg}
                  onChange={(e) => setReviewMsg(e.target.value)}
                  disabled={reviewSubmitting}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowReviewModal(false)} className="btn btn--secondary" disabled={reviewSubmitting}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={reviewSubmitting}>
                  {reviewSubmitting ? 'Submitting to Queue...' : '🚀 Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  placeholder="e.g. AID-ADSA-A11 or CS-DSA-01"
                  value={projId}
                  onChange={(e) => setProjId(e.target.value)}
                  disabled={submitting}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unique project code for your project.</span>
              </div>
              <div className="form-group mb-16">
                <label className="form-label" htmlFor="projName">Project Name *</label>
                <input
                  id="projName"
                  type="text"
                  className="form-control"
                  placeholder="e.g. MeshVault or Search Visualizer"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  disabled={submitting}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Descriptive title of the project.</span>
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

      {/* Join Workspace Modal for this Group */}
      {showJoinWsModal && (
        <div style={modalOverlayStyle} onClick={() => setShowJoinWsModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-16">
              <h3 className="modal__title" style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                🔗 Connect Group to Academic Workspace
              </h3>
              <button onClick={() => setShowJoinWsModal(false)} className="btn btn--ghost btn--sm">✕</button>
            </div>

            {joinWsError && <div className="login-card__error mb-16">{joinWsError}</div>}
            {joinWsSuccess && <div className="badge badge--success mb-16 p-12" style={{ display: 'block', textAlign: 'center' }}>{joinWsSuccess}</div>}

            <form onSubmit={handleJoinWorkspace}>
              <div className="form-group mb-20">
                <label className="form-label">Academic Workspace Code (Unique ID) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={joinWsCode}
                  onChange={(e) => setJoinWsCode(e.target.value)}
                  placeholder="e.g. WS-ADSA-204 or WS-001"
                  required
                  autoFocus
                />
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Enter the unique Workspace Code generated by your instructor to link <strong>{group.name}</strong> and all its projects to the course environment.
                </span>
              </div>

              <div className="flex gap-12" style={{ justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowJoinWsModal(false)} className="btn btn--secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={joinWsSubmitting}>
                  {joinWsSubmitting ? 'Connecting...' : '✓ Link Group to Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
