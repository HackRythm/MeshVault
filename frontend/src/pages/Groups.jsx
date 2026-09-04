import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import GroupCard from '../components/GroupCard';
import groupService from '../services/groupService';
import workspaceService from '../services/workspaceService';
import { useAuth } from '../context/AuthContext';

export default function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [showJoinWsModal, setShowJoinWsModal] = useState(false);

  // Group Form states
  const [manualWorkspaceCode, setManualWorkspaceCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [groupDesc, setGroupDesc] = useState('');

  // Join Group state
  const [groupJoinCode, setGroupJoinCode] = useState('');

  // Join Workspace state
  const [joinWsCode, setJoinWsCode] = useState('');
  const [joinWsError, setJoinWsError] = useState('');
  const [joinWsSuccess, setJoinWsSuccess] = useState('');
  const [joinWsSubmitting, setJoinWsSubmitting] = useState(false);

  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsList, wsList] = await Promise.all([
        groupService.getGroups(null, user.id, user.role),
        workspaceService.getWorkspaces(user.id, user.role),
      ]);
      setGroups(groupsList || []);
      setWorkspaces(wsList || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch groups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setModalError('Group Name is required.');
      return;
    }

    setModalError('');
    setSubmitting(true);
    try {
      await groupService.createGroup(
        groupName.trim(),
        groupCode.trim() || undefined,
        groupDesc.trim() || undefined,
        manualWorkspaceCode.trim() || undefined
      );
      setShowCreateModal(false);
      setGroupName('');
      setGroupCode('');
      setGroupDesc('');
      setManualWorkspaceCode('');
      await fetchData();
    } catch (err) {
      setModalError(err.message || 'Failed to create group.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    if (!groupJoinCode) {
      setModalError('Please enter a Group Join Code.');
      return;
    }

    setModalError('');
    setSubmitting(true);
    try {
      await groupService.joinGroup(groupJoinCode.trim());
      setShowJoinGroupModal(false);
      setGroupJoinCode('');
      await fetchData();
    } catch (err) {
      setModalError(err.message || 'Failed to join group.');
    } finally {
      setSubmitting(false);
    }
  };

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
      const res = await workspaceService.joinWorkspace(joinWsCode.trim());
      setJoinWsSuccess(res.message || 'Join request submitted! Awaiting staff approval.');
      setJoinWsCode('');
      await fetchData();
    } catch (err) {
      setJoinWsError(err.message || 'Failed to submit workspace join request.');
    } finally {
      setJoinWsSubmitting(false);
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
    maxWidth: '520px',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: 'var(--shadow-lg)',
    display: 'flex',
    flexDirection: 'column',
    padding: '28px',
  };

  const handleGenerateGroupCode = () => {
    const prefix = groupName.trim() ? groupName.trim().replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase() : 'GP';
    const randPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGroupCode(`${prefix}-${randPart}`);
  };

  if (loading) {
    return (
      <AppLayout title="Groups">
        <LoadingSpinner message="Loading groups list..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Groups">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Class Groups</h1>
          <p className="page-header__subtitle">
            {user.role === 'STAFF' ? 'View and track all student groups across workspaces.' : 'Create, join, or view your workspace project teams.'}
          </p>
        </div>
        {user.role === 'STUDENT' && (
          <div className="page-header__actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => { setModalError(''); setShowJoinGroupModal(true); }} className="btn btn--secondary">
              🚪 Join Group
            </button>
            <button
              onClick={() => {
                setModalError('');
                setShowCreateModal(true);
                if (!groupCode) {
                  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
                  setGroupCode(`GP-${rand}`);
                }
              }}
              className="btn btn--primary"
            >
              ➕ Create Group
            </button>
          </div>
        )}
      </div>

      {error && <div className="login-card__error mb-24">{error}</div>}

      {groups.length > 0 ? (
        <div className="grid grid--3">
          {groups.map(group => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      ) : (
        <div>
          <EmptyState
            icon="👥"
            title="No groups formed yet"
            text="Form a group with your peers first, or join an existing team!"
          />
          {user.role === 'STUDENT' && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '-12px', marginBottom: '32px' }}>
              <button
                onClick={() => {
                  setModalError('');
                  setShowCreateModal(true);
                  if (!groupCode) {
                    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
                    setGroupCode(`GP-${rand}`);
                  }
                }}
                className="btn btn--primary"
              >
                ➕ Create Group
              </button>
              <button onClick={() => { setModalError(''); setShowJoinGroupModal(true); }} className="btn btn--secondary">
                🚪 Join Group
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Create Group Modal ─── */}
      {showCreateModal && (
        <div style={modalOverlayStyle} onClick={() => setShowCreateModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Create New Group</h2>
              <button onClick={() => setShowCreateModal(false)} className="btn btn--ghost btn--sm">✕</button>
            </div>
            {modalError && <div className="login-card__error mb-16">{modalError}</div>}
            
            <form onSubmit={handleCreateGroup}>
              <div className="form-group mb-16">
                <label className="form-label" htmlFor="groupName">Group Name *</label>
                <input
                  id="groupName"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Nexus Coders or Team Alpha"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  disabled={submitting}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group mb-16">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" htmlFor="groupCode" style={{ marginBottom: 0 }}>Unique Group Code (Join ID) *</label>
                  <button
                    type="button"
                    onClick={handleGenerateGroupCode}
                    className="btn btn--secondary btn--sm"
                    style={{ padding: '3px 10px', fontSize: '12px' }}
                  >
                    🎲 Generate Code
                  </button>
                </div>
                <input
                  id="groupCode"
                  type="text"
                  className="form-input"
                  placeholder="e.g. GP-NEXUS or GP-ZSLDUG (Click 'Generate Code' or enter custom ID)"
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value)}
                  disabled={submitting}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Share this unique Group Code with your team members so they can join your group.
                </span>
              </div>

              <div className="form-group mb-16">
                <label className="form-label" htmlFor="manualWorkspaceCode">Academic Workspace Code (Optional)</label>
                <input
                  id="manualWorkspaceCode"
                  type="text"
                  className="form-input"
                  placeholder="e.g. WS-ADSA-204 or WS-001 (Optional: you can also join from inside the group)"
                  value={manualWorkspaceCode}
                  onChange={(e) => setManualWorkspaceCode(e.target.value)}
                  disabled={submitting}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Link directly to a course workspace now, or join anytime from inside your group page.
                </span>
              </div>

              <div className="form-group mb-24">
                <label className="form-label" htmlFor="groupDesc">Description</label>
                <textarea
                  id="groupDesc"
                  className="form-textarea"
                  rows="3"
                  placeholder="Describe your group's focus or lab assignments..."
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn--secondary" disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? 'Creating...' : '✓ Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ─── Join Group Modal ─── */}
      {showJoinGroupModal && (
        <div style={modalOverlayStyle} onClick={() => setShowJoinGroupModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Join Group</h2>
              <button onClick={() => setShowJoinGroupModal(false)} className="btn btn--ghost btn--sm">✕</button>
            </div>
            {modalError && <div className="login-card__error mb-16">{modalError}</div>}
            <form onSubmit={handleJoinGroup}>
              <div className="form-group mb-24">
                <label className="form-label" htmlFor="joinCode">Enter Group Code *</label>
                <input
                  id="joinCode"
                  type="text"
                  className="form-input"
                  placeholder="e.g. ALPHA-X7K92P"
                  value={groupJoinCode}
                  onChange={(e) => setGroupJoinCode(e.target.value)}
                  disabled={submitting}
                  required
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowJoinGroupModal(false)} className="btn btn--secondary" disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? 'Joining...' : 'Join Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
