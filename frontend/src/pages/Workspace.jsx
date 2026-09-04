import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ProjectCard from '../components/ProjectCard';
import GroupCard from '../components/GroupCard';
import workspaceService from '../services/workspaceService';
import projectService from '../services/projectService';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext';

export default function Workspace() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWs, setSelectedWs] = useState(null);
  const [wsDetail, setWsDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  // Modals state
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Join workspace state (Student)
  const [joinWsCode, setJoinWsCode] = useState('');
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');


  // Access modal state
  const [isRestricted, setIsRestricted] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [allowedUserIds, setAllowedUserIds] = useState([]);
  const [allowedGroupIds, setAllowedGroupIds] = useState([]);
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessSuccess, setAccessSuccess] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  // Scheme modal state
  const [criteria, setCriteria] = useState([]);
  const [newCritName, setNewCritName] = useState('');
  const [newCritDesc, setNewCritDesc] = useState('');
  const [newCritMax, setNewCritMax] = useState('');
  const [newCritWeight, setNewCritWeight] = useState('');
  const [schemeSaving, setSchemeSaving] = useState(false);
  const [schemeSuccess, setSchemeSuccess] = useState(false);
  const [schemeError, setSchemeError] = useState('');
  const [editingCritId, setEditingCritId] = useState(null);

  // Gradebook tab states
  const [activeTab, setActiveTab] = useState('overview'); // overview or gradebook
  const [workspaceGrades, setWorkspaceGrades] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [gradesSearch, setGradesSearch] = useState('');

  // 1. Fetch workspaces listing
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const list = await workspaceService.getWorkspaces(user.id, user.role);
        setWorkspaces(list);
        if (list.length > 0) {
          setSelectedWs(list[0]);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch workspaces.');
      } finally {
        setLoadingList(false);
      }
    };
    fetchWorkspaces();
  }, [user]);

  // 2. Fetch selected workspace details (groups + projects)
  useEffect(() => {
    if (!selectedWs) return;

    const fetchDetail = async () => {
      try {
        setLoadingDetail(true);
        const detail = await workspaceService.getWorkspace(selectedWs.id, user.id, user.role);
        setWsDetail(detail);
      } catch (err) {
        setError(err.message || 'Failed to load workspace details.');
      } finally {
        setLoadingDetail(false);
      }
    };
    fetchDetail();
  }, [selectedWs, user]);

  // 2.5 Fetch student grades if in gradebook view
  useEffect(() => {
    if (!selectedWs || activeTab !== 'gradebook' || user.role !== 'STAFF') return;

    const fetchGrades = async () => {
      try {
        setLoadingGrades(true);
        const data = await workspaceService.getWorkspaceStudentGrades(selectedWs.id);
        setWorkspaceGrades(data || []);
      } catch (err) {
        setError(err.message || 'Failed to load workspace grades.');
      } finally {
        setLoadingGrades(false);
      }
    };
    fetchGrades();
  }, [selectedWs, activeTab, user.role]);

  // 3. Load Access Control Data
  useEffect(() => {
    if (!showAccessModal || !selectedWs) return;
    
    const loadAccessData = async () => {
      try {
        setAccessError('');
        const data = await workspaceService.getWorkspaceAccess(selectedWs.id);
        setIsRestricted(data.is_restricted);
        setAllowedUserIds(data.allowed_user_ids || []);
        setAllowedGroupIds(data.allowed_group_ids || []);
        
        const studentsList = await authService.getStudents();
        setAllStudents(studentsList || []);
      } catch (err) {
        setAccessError(err.message || 'Failed to load access settings.');
      }
    };
    
    loadAccessData();
  }, [showAccessModal, selectedWs]);

  // 4. Load Grading Scheme Data
  useEffect(() => {
    if (!showSchemeModal || !selectedWs) return;

    const loadSchemeData = async () => {
      try {
        setSchemeError('');
        const data = await workspaceService.getGradingScheme(selectedWs.id);
        if (data && data.criteria) {
          setCriteria(data.criteria);
        } else {
          setCriteria([]);
        }
      } catch (err) {
        setSchemeError(err.message || 'Failed to load grading scheme.');
      }
    };

    loadSchemeData();
  }, [showSchemeModal, selectedWs]);

  const handleSaveAccess = async () => {
    setAccessSaving(true);
    setAccessSuccess(false);
    setAccessError('');
    try {
      await workspaceService.updateWorkspaceAccess(selectedWs.id, {
        is_restricted: isRestricted,
        allowed_user_ids: allowedUserIds,
        allowed_group_ids: allowedGroupIds,
      });
      setAccessSuccess(true);
      // Reload workspace details to refresh projects/groups
      const detail = await workspaceService.getWorkspace(selectedWs.id, user.id, user.role);
      setWsDetail(detail);
      setTimeout(() => setShowAccessModal(false), 1200);
    } catch (err) {
      setAccessError(err.message || 'Failed to save workspace access.');
    } finally {
      setAccessSaving(false);
    }
  };

  const handleSaveScheme = async () => {
    const totalWeight = criteria.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0);
    const hasWeights = criteria.some(c => c.weight !== undefined && c.weight !== null && c.weight !== '');
    
    if (hasWeights && Math.abs(totalWeight - 100.0) > 0.01) {
      setSchemeError('Sum of all criterion weights must equal 100%');
      return;
    }
    
    setSchemeSaving(true);
    setSchemeSuccess(false);
    setSchemeError('');
    try {
      await workspaceService.saveGradingScheme(selectedWs.id, {
        criteria: criteria.map(c => ({
          name: c.name,
          description: c.description,
          max_marks: parseFloat(c.max_marks),
          weight: c.weight !== undefined && c.weight !== '' && c.weight !== null ? parseFloat(c.weight) : null,
        })),
      });
      setSchemeSuccess(true);
      setTimeout(() => setShowSchemeModal(false), 1200);
    } catch (err) {
      setSchemeError(err.message || 'Failed to save grading scheme.');
    } finally {
      setSchemeSaving(false);
    }
  };

  const handleJoinWorkspace = async (e) => {
    e.preventDefault();
    if (!joinWsCode.trim()) {
      setJoinError('Please enter a Workspace ID (e.g. WS-001).');
      return;
    }

    setJoinError('');
    setJoinSuccess('');
    setJoinSubmitting(true);

    try {
      const res = await workspaceService.joinWorkspace(joinWsCode.trim());
      setJoinSuccess(res.message || 'Join request submitted! Awaiting staff approval.');
      setJoinWsCode('');
      // Reload workspaces
      const list = await workspaceService.getWorkspaces(user.id, user.role);
      setWorkspaces(list);
      if (list.length > 0 && !selectedWs) {
        setSelectedWs(list[0]);
      }
    } catch (err) {
      setJoinError(err.message || 'Failed to submit join request.');
    } finally {
      setJoinSubmitting(false);
    }
  };


  const handleAddCriterion = (e) => {
    e.preventDefault();
    if (!newCritName.trim()) {
      setSchemeError('Criterion name is required');
      return;
    }
    if (!newCritMax || parseFloat(newCritMax) <= 0) {
      setSchemeError('Max marks must be a positive number');
      return;
    }

    const weightVal = newCritWeight !== '' ? parseFloat(newCritWeight) : null;
    if (weightVal !== null && (weightVal < 0 || weightVal > 100)) {
      setSchemeError('Weight must be between 0% and 100%');
      return;
    }

    if (editingCritId !== null) {
      setCriteria(prev => prev.map(c => c.id === editingCritId ? {
        ...c,
        name: newCritName.trim(),
        description: newCritDesc.trim() || null,
        max_marks: parseFloat(newCritMax),
        weight: weightVal
      } : c));
      setEditingCritId(null);
    } else {
      if (criteria.some(c => c.name.toLowerCase() === newCritName.trim().toLowerCase())) {
        setSchemeError('Criterion name must be unique');
        return;
      }
      
      const newCrit = {
        id: Date.now(),
        name: newCritName.trim(),
        description: newCritDesc.trim() || null,
        max_marks: parseFloat(newCritMax),
        weight: weightVal
      };
      setCriteria(prev => [...prev, newCrit]);
    }

    setNewCritName('');
    setNewCritDesc('');
    setNewCritMax('');
    setNewCritWeight('');
    setSchemeError('');
  };

  const handleDeleteCriterion = (id) => {
    setCriteria(prev => prev.filter(c => c.id !== id));
  };

  const handleStartEditCriterion = (crit) => {
    setEditingCritId(crit.id);
    setNewCritName(crit.name);
    setNewCritDesc(crit.description || '');
    setNewCritMax(crit.max_marks.toString());
    setNewCritWeight(crit.weight !== null && crit.weight !== undefined ? crit.weight.toString() : '');
  };

  const filteredStudents = allStudents.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.user_id.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const toggleStudentAccess = (id) => {
    setAllowedUserIds(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const toggleGroupAccess = (id) => {
    setAllowedGroupIds(prev =>
      prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]
    );
  };

  // Inline Modal Styles
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
    maxWidth: '650px',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: 'var(--shadow-lg)',
    display: 'flex',
    flexDirection: 'column',
    padding: '28px',
  };

  const schemeTotalWeight = criteria.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0);

  if (loadingList) {
    return (
      <AppLayout title="Workspace">
        <LoadingSpinner message="Loading workspace metadata..." />
      </AppLayout>
    );
  }

  if (workspaces.length === 0) {
    return (
      <AppLayout title="Workspace">
        <div className="page-header">
          <div className="page-header__left">
            <h1 className="page-header__title">Workspace</h1>
            <p className="page-header__subtitle">No active workspaces assigned.</p>
          </div>
          {user.role === 'STAFF' ? (
            <Link to="/workspace/new" className="btn btn--secondary">
              ➕ New Workspace
            </Link>
          ) : (
            <button
              onClick={() => {
                setShowJoinModal(true);
                setJoinError('');
                setJoinSuccess('');
              }}
              className="btn btn--primary"
            >
              🔗 Join Workspace
            </button>
          )}
        </div>
        <EmptyState icon="📂" title="No workspaces assigned" text="You do not have access to any workspaces at the moment." />
        
        {user.role === 'STUDENT' && (
          <div style={{ textAlign: 'center', marginTop: '-16px', marginBottom: '32px' }}>
            <button
              onClick={() => {
                setShowJoinModal(true);
                setJoinError('');
                setJoinSuccess('');
              }}
              className="btn btn--primary"
            >
              🔗 Enter Workspace ID to Join
            </button>
          </div>
        )}

        {/* Join Workspace Modal for Students */}
        {showJoinModal && (
          <div style={modalOverlayStyle} onClick={() => setShowJoinModal(false)}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-16">
                <h3 className="modal__title">🔗 Join Academic Workspace</h3>
                <button onClick={() => setShowJoinModal(false)} className="btn btn--ghost btn--sm">✕</button>
              </div>

              {joinError && <div className="login-card__error mb-16">{joinError}</div>}
              {joinSuccess && <div className="badge badge--success mb-16 p-12" style={{ display: 'block', textAlign: 'center' }}>{joinSuccess}</div>}

              <form onSubmit={handleJoinWorkspace}>
                <div className="form-group mb-20">
                  <label className="form-label">Workspace ID *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={joinWsCode}
                    onChange={(e) => setJoinWsCode(e.target.value)}
                    placeholder="e.g. WS-001 or WS-DSA-2025"
                    required
                    autoFocus
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Obtain the Workspace ID from your instructor or course syllabus.
                  </span>
                </div>

                <div className="flex gap-12" style={{ justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowJoinModal(false)} className="btn btn--secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn--primary" disabled={joinSubmitting}>
                    {joinSubmitting ? 'Submitting Request...' : 'Submit Join Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AppLayout>
    );
  }

  const handleDeleteWorkspace = async () => {
    if (!selectedWs) return;
    if (!window.confirm(`⚠️ WARNING: Are you sure you want to permanently delete workspace "${selectedWs.name}" (${selectedWs.course_code})?\n\nThis will remove all associated group links and workspace records. This action cannot be undone.`)) return;

    try {
      await workspaceService.deleteWorkspace(selectedWs.id);
      alert('Workspace deleted successfully.');
      const list = await workspaceService.getWorkspaces(user.id, user.role);
      setWorkspaces(list);
      if (list && list.length > 0) {
        setSelectedWs(list[0]);
      } else {
        setSelectedWs(null);
        setWsDetail(null);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete workspace.');
    }
  };

  return (
    <AppLayout title="Workspace">
      <div className="page-header">
        <div className="page-header__left">
          {workspaces.length > 1 ? (
            <div className="flex items-center gap-12">
              <span className="form-label" style={{ marginBottom: 0 }}>Active Workspace:</span>
              <select
                className="form-select"
                value={selectedWs?.id || ''}
                onChange={(e) => {
                  const ws = workspaces.find(w => w.id === parseInt(e.target.value));
                  setSelectedWs(ws);
                }}
                style={{ padding: '6px 36px 6px 12px', minWidth: '220px' }}
              >
                {workspaces.map(w => (
                  <option key={w.id} value={w.id}>{w.course_code} - {w.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <h1 className="page-header__title">{selectedWs?.course_code}: {selectedWs?.course_name}</h1>
              <p className="page-header__subtitle">{selectedWs?.name} • Academic Year {selectedWs?.academic_year}</p>
            </>
          )}
        </div>
        <div className="flex gap-12 flex-wrap">
          {user.role === 'STUDENT' && (
            <button
              onClick={() => {
                setShowJoinModal(true);
                setJoinError('');
                setJoinSuccess('');
              }}
              className="btn btn--secondary"
            >
              🔗 Join Another Workspace
            </button>
          )}
          {selectedWs && user.role === 'STAFF' && (
            <>
              <button onClick={() => {
                setShowAccessModal(true);
                setAccessSuccess(false);
                setAccessError('');
              }} className="btn btn--secondary">
                🔒 Manage Access
              </button>
              <button onClick={() => {
                setShowSchemeModal(true);
                setEditingCritId(null);
                setSchemeSuccess(false);
                setSchemeError('');
              }} className="btn btn--secondary">
                📋 Grading Scheme
              </button>
            </>
          )}
          {selectedWs && user.role === 'STAFF' && (
            <Link to={`/projects/new?workspace_id=${selectedWs.id}`} className="btn btn--primary">
              ➕ New Project
            </Link>
          )}
          {user.role === 'STAFF' && (
            <Link to="/workspace/new" className="btn btn--secondary">
              ➕ New Workspace
            </Link>
          )}
          {selectedWs && user.role === 'STAFF' && (selectedWs.created_by === user.id || !selectedWs.created_by) && (
            <button
              onClick={handleDeleteWorkspace}
              className="btn btn--danger"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'var(--text-danger)', color: 'var(--text-danger)' }}
            >
              🗑️ Delete Workspace
            </button>
          )}
        </div>
      </div>

      {error && <div className="login-card__error mb-24">{error}</div>}

      {loadingDetail ? (
        <LoadingSpinner message="Loading workspace elements..." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* ─── Workspace Join Code (host only) ─── */}
          {selectedWs && user.role === 'STAFF' && selectedWs.join_code && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 'var(--radius)', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>🔑 Workspace Join Code:</span>
              <code style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '2px', color: 'var(--text-accent)', background: 'rgba(99,102,241,0.12)', padding: '4px 10px', borderRadius: '6px' }}>
                {selectedWs.join_code}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(selectedWs.join_code)}
                className="btn btn--ghost btn--sm"
                style={{ fontSize: '11px' }}
              >
                📋 Copy
              </button>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Share with group leaders to join this workspace</span>
            </div>
          )}

          {selectedWs?.description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', background: 'rgba(255,255,255,0.01)', padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              {selectedWs.description}
            </p>
          )}

          {/* ─── Workspace Tab Navigation (Staff Only) ─── */}
          {selectedWs && user.role === 'STAFF' && (
            <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`btn ${activeTab === 'overview' ? 'btn--primary' : 'btn--ghost'}`}
                style={{ fontSize: '13px', padding: '8px 16px', borderRadius: 'var(--radius-sm)' }}
              >
                👥 Overview (Groups &amp; Projects)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('gradebook')}
                className={`btn ${activeTab === 'gradebook' ? 'btn--primary' : 'btn--ghost'}`}
                style={{ fontSize: '13px', padding: '8px 16px', borderRadius: 'var(--radius-sm)' }}
              >
                📊 Mark Registry (Gradebook)
              </button>
            </div>
          )}

          {activeTab === 'overview' || user.role !== 'STAFF' ? (
            <>
              {/* Pending Join / Leave Requests (Staff Only) */}
              {user.role === 'STAFF' && wsDetail?.pending_requests?.length > 0 && (
                <div className="detail-section mb-24" style={{ border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius)', padding: '20px', background: 'rgba(245, 158, 11, 0.03)' }}>
                  <h2 className="detail-section__title" style={{ color: 'var(--clr-warning)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: 'none', paddingBottom: 0 }}>
                    ⏳ Pending Requests ({wsDetail.pending_requests.length})
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Review membership join requests and group leave permissions for this workspace.
                  </p>
                  <div className="card p-0" style={{ overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left' }}>Type</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left' }}>Student / Group</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left' }}>Details</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left' }}>Requested At</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wsDetail.pending_requests.map((req) => (
                          <tr key={`${req.type || 'join'}-${req.id}`} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 16px' }}>
                              {req.type === 'GROUP_LEAVE' ? (
                                <span className="badge badge--warning" style={{ fontSize: '11px' }}>🚪 Leave Workspace</span>
                              ) : (
                                <span className="badge badge--primary" style={{ fontSize: '11px' }}>🔗 Join Request</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: '500' }}>
                              {req.type === 'GROUP_LEAVE' ? (
                                <div>
                                  <strong>{req.group_name}</strong>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Code: {req.group_code} • Leader: {req.user_name}</div>
                                </div>
                              ) : (
                                req.user_name
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                              {req.type === 'GROUP_LEAVE' ? 'Request to leave workspace' : req.user_email}
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                              {req.requested_at ? new Date(req.requested_at).toLocaleDateString() : 'Just now'}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <button
                                onClick={async () => {
                                  try {
                                    if (req.type === 'GROUP_LEAVE') {
                                      await workspaceService.approveGroupRemoval(selectedWs.id, req.group_id);
                                    } else {
                                      await workspaceService.approveJoinRequest(selectedWs.id, req.id);
                                    }
                                    const detail = await workspaceService.getWorkspace(selectedWs.id, user.id, user.role);
                                    setWsDetail(detail);
                                  } catch (e) {
                                    alert(e.message || 'Failed to approve');
                                  }
                                }}
                                className="btn btn--primary btn--sm"
                                style={{ marginRight: '8px' }}
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    if (req.type === 'GROUP_LEAVE') {
                                      await workspaceService.rejectGroupRemoval(selectedWs.id, req.group_id);
                                    } else {
                                      await workspaceService.rejectJoinRequest(selectedWs.id, req.id);
                                    }
                                    const detail = await workspaceService.getWorkspace(selectedWs.id, user.id, user.role);
                                    setWsDetail(detail);
                                  } catch (e) {
                                    alert(e.message || 'Failed to reject');
                                  }
                                }}
                                className="btn btn--secondary btn--sm"
                              >
                                ✕ Reject
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Groups Section */}
              <div className="detail-section">
                <h2 className="detail-section__title">Class Groups ({wsDetail?.groups?.length || 0})</h2>
                {wsDetail?.groups?.length > 0 ? (
                  <div className="grid grid--3">
                    {wsDetail.groups.map(group => (
                      <GroupCard key={group.id} group={group} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon="👥" title="No groups established" text="No lab teams have been approved inside this workspace yet." />
                )}
              </div>

              {/* Projects Section — linked with workspace context for faculty evaluation */}
              <div className="detail-section">
                <h2 className="detail-section__title">Workspace Projects ({wsDetail?.projects?.length || 0})</h2>
                {wsDetail?.projects?.length > 0 ? (
                  <div className="grid grid--3">
                    {wsDetail.projects.map(proj => (
                      <div key={proj.project_id} className="card" style={{ padding: '18px', cursor: 'pointer', transition: 'border-color 0.2s', border: '1px solid var(--border)' }}
                        onClick={() => window.location.href = `/projects/${proj.project_id}?workspace_id=${selectedWs.id}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>{proj.name}</h3>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>{proj.project_id}</div>
                        {proj.group_name && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Group: {proj.group_name}</div>}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                          <span className={`badge ${proj.status === 'COMPLETED' ? 'badge--success' : proj.status === 'IN_PROGRESS' ? 'badge--warning' : 'badge--muted'}`} style={{ fontSize: '10px' }}>
                            {proj.status?.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-bar__fill" style={{ width: `${proj.progress || 0}%` }} />
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>{Math.round(proj.progress || 0)}% complete</div>
                        {user.role === 'STAFF' && (
                          <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(99,102,241,0.8)', fontWeight: '500' }}>
                            📊 View Evaluation & Comments →
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon="📁" title="No projects tracked" text="There are currently no active projects registered under this workspace." />
                )}
              </div>
            </>
          ) : (
            /* ─── Mark Registry (Gradebook) Tab ─── */
            <div className="detail-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="detail-section__title" style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
                  📝 Student Mark Registry &amp; History
                </h2>
                <div style={{ width: '300px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="🔍 Search student name, ID or project..."
                    value={gradesSearch}
                    onChange={(e) => setGradesSearch(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {loadingGrades ? (
                <LoadingSpinner message="Querying student marks..." />
              ) : workspaceGrades.length > 0 ? (
                (() => {
                  const filtered = workspaceGrades.filter(g =>
                    g.student_name.toLowerCase().includes(gradesSearch.toLowerCase()) ||
                    g.student_user_id.toLowerCase().includes(gradesSearch.toLowerCase()) ||
                    g.project_id.toLowerCase().includes(gradesSearch.toLowerCase())
                  );

                  const handleReleaseFromRegistry = async (gradeId, studentName) => {
                    try {
                      await projectService.releaseStudentGrade(selectedWs.id, '', gradeId);
                      // reload
                      const data = await workspaceService.getWorkspaceStudentGrades(selectedWs.id);
                      setWorkspaceGrades(data || []);
                    } catch (err) {
                      alert(err.message || 'Failed to release grade.');
                    }
                  };

                  return filtered.length > 0 ? (
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Project ID</th>
                            <th>Total Mark</th>
                            <th>Criterion Breakdown</th>
                            <th>Status</th>
                            <th>Date Evaluated</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((g) => {
                            let crits = [];
                            try {
                              if (g.criterion_scores) {
                                crits = typeof g.criterion_scores === 'string' ? JSON.parse(g.criterion_scores) : g.criterion_scores;
                              }
                            } catch {}

                            return (
                              <tr key={g.id}>
                                <td>
                                  <strong>{g.student_name}</strong>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{g.student_user_id}</div>
                                </td>
                                <td>
                                  <Link to={`/projects/${g.project_id}?workspace_id=${selectedWs.id}`} style={{ fontWeight: '600' }}>
                                    {g.project_id}
                                  </Link>
                                </td>
                                <td style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent)' }}>
                                  {g.total_score} / {g.max_score}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
                                    {crits.map((c, cIdx) => (
                                      <div key={cIdx}>
                                        <span style={{ color: 'var(--text-muted)' }}>{c.name}: </span>
                                        <strong>{c.score}/{c.max_marks}</strong>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td>
                                  <span className={`badge ${g.is_released ? 'badge--success' : 'badge--warning'}`}>
                                    {g.is_released ? 'RELEASED' : 'UNRELEASED'}
                                  </span>
                                </td>
                                <td style={{ fontSize: '11.5px' }}>
                                  {new Date(g.created_at).toLocaleDateString()}
                                </td>
                                <td>
                                  {!g.is_released ? (
                                    <button
                                      type="button"
                                      className="btn btn--sm"
                                      style={{ background: 'var(--clr-success)', border: 'none', color: '#fff', fontSize: '11px', padding: '4px 10px' }}
                                      onClick={() => handleReleaseFromRegistry(g.id, g.student_name)}
                                    >
                                      🔓 Release Grade
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Released</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState icon="🔍" title="No matching records" text="No student grades match your search query." />
                  );
                })()
              ) : (
                <EmptyState icon="📝" title="Gradebook empty" text="No individual student evaluations have been submitted in this workspace yet." />
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Manage Access Modal ─── */}
      {showAccessModal && selectedWs && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div className="flex justify-between items-center mb-24">
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>🔒 Workspace Access Control</h3>
              <button onClick={() => setShowAccessModal(false)} className="btn btn--ghost btn--sm">✕</button>
            </div>

            {accessSuccess && <div className="login-card__success mb-16">Changes saved successfully!</div>}
            {accessError && <div className="login-card__error mb-16">{accessError}</div>}

            <div className="form-group mb-24">
              <label className="flex items-center gap-12 cursor-pointer" style={{ fontSize: '14px', fontWeight: '500' }}>
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={isRestricted}
                  onChange={(e) => setIsRestricted(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                Enforce Workspace Restrictions (Limit who can view this course)
              </label>
            </div>

            <div style={{ opacity: isRestricted ? 1 : 0.5, pointerEvents: isRestricted ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
              <div className="grid grid--2 gap-24 mb-24">
                {/* Groups Access Column */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: '12px' }}>
                    Allowed Groups
                  </h4>
                  <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px', minHeight: '180px', maxHeight: '240px', overflowY: 'auto' }}>
                    {wsDetail?.groups?.length > 0 ? (
                      wsDetail.groups.map(g => (
                        <label key={g.id} className="flex items-center gap-8 cursor-pointer py-6" style={{ fontSize: '13px' }}>
                          <input
                            type="checkbox"
                            checked={allowedGroupIds.includes(g.id)}
                            onChange={() => toggleGroupAccess(g.id)}
                          />
                          {g.name}
                        </label>
                      ))
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No groups in workspace</span>
                    )}
                  </div>
                </div>

                {/* Students Access Column */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: '12px' }}>
                    Allowed Students
                  </h4>
                  <input
                    type="text"
                    className="form-input mb-8"
                    placeholder="Search student directory..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  />
                  <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px', minHeight: '138px', maxHeight: '198px', overflowY: 'auto' }}>
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map(s => (
                        <label key={s.id} className="flex items-center gap-8 cursor-pointer py-6" style={{ fontSize: '13px' }}>
                          <input
                            type="checkbox"
                            checked={allowedUserIds.includes(s.id)}
                            onChange={() => toggleStudentAccess(s.id)}
                          />
                          <div>
                            <div>{s.name}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{s.user_id}</div>
                          </div>
                        </label>
                      ))
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No students found</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-12 mt-16" style={{ justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAccessModal(false)} className="btn btn--secondary">Cancel</button>
              <button onClick={handleSaveAccess} disabled={accessSaving} className="btn btn--primary">
                {accessSaving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Grading Scheme Modal ─── */}
      {showSchemeModal && selectedWs && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div className="flex justify-between items-center mb-24">
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>📋 Course Grading Scheme</h3>
              <button onClick={() => setShowSchemeModal(false)} className="btn btn--ghost btn--sm">✕</button>
            </div>

            {schemeSuccess && <div className="login-card__success mb-16">Grading scheme saved successfully!</div>}
            {schemeError && <div className="login-card__error mb-16">{schemeError}</div>}

            <div className="mb-24" style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-accent)' }}>
                    <th style={{ padding: '10px 12px' }}>Criterion</th>
                    <th style={{ padding: '10px 12px' }}>Max Marks</th>
                    <th style={{ padding: '10px 12px' }}>Weight</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.length > 0 ? (
                    criteria.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <strong>{c.name}</strong>
                          {c.description && <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{c.description}</p>}
                        </td>
                        <td style={{ padding: '10px 12px' }}>{c.max_marks}</td>
                        <td style={{ padding: '10px 12px' }}>{c.weight !== null && c.weight !== undefined ? `${c.weight}%` : 'N/A'}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <button onClick={() => handleStartEditCriterion(c)} className="btn btn--ghost btn--sm" style={{ padding: '4px 8px', marginRight: '6px' }}>✏️</button>
                          <button onClick={() => handleDeleteCriterion(c.id)} className="btn btn--ghost btn--sm" style={{ padding: '4px 8px', color: 'var(--clr-error)' }}>✕</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No grading criteria added yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mb-24 px-12 py-8" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.01)' }}>
              <span style={{ fontWeight: '600', fontSize: '13.5px' }}>Total Weights Sum:</span>
              <span style={{
                fontWeight: '700',
                fontSize: '15px',
                color: schemeTotalWeight === 100 ? 'var(--clr-success)' : schemeTotalWeight > 100 ? 'var(--clr-error)' : 'var(--clr-warning)'
              }}>
                {schemeTotalWeight}% {schemeTotalWeight === 100 ? '✓ Valid' : '⚠ Must equal 100%'}
              </span>
            </div>

            {/* Criterion Add/Edit Form */}
            <form onSubmit={handleAddCriterion} className="card p-16 mb-24" style={{ background: 'rgba(255,255,255,0.01)' }}>
              <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>
                {editingCritId !== null ? '✏️ Edit Criterion' : '➕ Add Criterion'}
              </h4>
              <div className="grid grid--2 gap-12">
                <div className="form-group mb-12">
                  <label className="form-label" style={{ fontSize: '11px' }}>Name</label>
                  <input type="text" className="form-input" value={newCritName} onChange={(e) => setNewCritName(e.target.value)} required placeholder="e.g. Code Quality" />
                </div>
                <div className="form-group mb-12">
                  <label className="form-label" style={{ fontSize: '11px' }}>Description</label>
                  <input type="text" className="form-input" value={newCritDesc} onChange={(e) => setNewCritDesc(e.target.value)} placeholder="Optional description..." />
                </div>
              </div>
              <div className="grid grid--2 gap-12">
                <div className="form-group mb-12">
                  <label className="form-label" style={{ fontSize: '11px' }}>Max Marks</label>
                  <input type="number" step="any" className="form-input" value={newCritMax} onChange={(e) => setNewCritMax(e.target.value)} required placeholder="e.g. 20" />
                </div>
                <div className="form-group mb-12">
                  <label className="form-label" style={{ fontSize: '11px' }}>Weight / Percentage (%)</label>
                  <input type="number" step="any" className="form-input" value={newCritWeight} onChange={(e) => setNewCritWeight(e.target.value)} placeholder="e.g. 20" />
                </div>
              </div>
              <div className="flex gap-12 mt-12">
                <button type="submit" className="btn btn--secondary btn--sm">
                  {editingCritId !== null ? 'Update Criterion' : 'Add Criterion'}
                </button>
                {editingCritId !== null && (
                  <button type="button" onClick={() => {
                    setEditingCritId(null);
                    setNewCritName('');
                    setNewCritDesc('');
                    setNewCritMax('');
                    setNewCritWeight('');
                  }} className="btn btn--ghost btn--sm">Cancel</button>
                )}
              </div>
            </form>

            <div className="flex gap-12" style={{ justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSchemeModal(false)} className="btn btn--secondary">Close</button>
              <button onClick={handleSaveScheme} disabled={schemeSaving} className="btn btn--primary">
                {schemeSaving ? 'Saving Scheme...' : 'Save Scheme'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Workspace Modal for Students */}
      {showJoinModal && (
        <div style={modalOverlayStyle} onClick={() => setShowJoinModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-16">
              <h3 className="modal__title">🔗 Join Academic Workspace</h3>
              <button onClick={() => setShowJoinModal(false)} className="btn btn--ghost btn--sm">✕</button>
            </div>

            {joinError && <div className="login-card__error mb-16">{joinError}</div>}
            {joinSuccess && <div className="badge badge--success mb-16 p-12" style={{ display: 'block', textAlign: 'center' }}>{joinSuccess}</div>}

            <form onSubmit={handleJoinWorkspace}>
              <div className="form-group mb-20">
                <label className="form-label">Workspace ID *</label>
                <input
                  type="text"
                  className="form-input"
                  value={joinWsCode}
                  onChange={(e) => setJoinWsCode(e.target.value)}
                  placeholder="e.g. WS-001 or WS-DSA-2025"
                  required
                  autoFocus
                />
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Obtain the Workspace ID from your instructor or course syllabus.
                </span>
              </div>

              <div className="flex gap-12" style={{ justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowJoinModal(false)} className="btn btn--secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={joinSubmitting}>
                  {joinSubmitting ? 'Submitting Request...' : 'Submit Join Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
