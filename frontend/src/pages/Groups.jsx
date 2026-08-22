import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import GroupCard from '../components/GroupCard';
import groupService from '../services/groupService';
import { useAuth } from '../context/AuthContext';

export default function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Form states
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const list = await groupService.getGroups(null, user.id, user.role);
      setGroups(list);
    } catch (err) {
      setError(err.message || 'Failed to fetch groups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName || !groupCode) {
      setModalError('Group Name and Join Code are required.');
      return;
    }

    setModalError('');
    setSubmitting(true);
    try {
      await groupService.createGroup(groupName.trim(), groupCode.trim(), groupDesc.trim());
      setShowCreateModal(false);
      setGroupName('');
      setGroupCode('');
      setGroupDesc('');
      await fetchGroups();
    } catch (err) {
      setModalError(err.message || 'Failed to create group.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    if (!joinCode) {
      setModalError('Please enter a Group Join Code.');
      return;
    }

    setModalError('');
    setSubmitting(true);
    try {
      await groupService.joinGroup(joinCode.trim());
      setShowJoinModal(false);
      setJoinCode('');
      await fetchGroups();
    } catch (err) {
      setModalError(err.message || 'Failed to join group.');
    } finally {
      setSubmitting(false);
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
    maxWidth: '500px',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: 'var(--shadow-lg)',
    display: 'flex',
    flexDirection: 'column',
    padding: '28px',
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
            {user.role === 'STAFF' ? 'View and track all student groups.' : 'Create, join, or view your independent project teams.'}
          </p>
        </div>
        {user.role === 'STUDENT' && (
          <div className="page-header__actions" style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => { setModalError(''); setShowJoinModal(true); }} className="btn btn--secondary">
              🚪 Join Group
            </button>
            <button onClick={() => { setModalError(''); setShowCreateModal(true); }} className="btn btn--primary">
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
        <EmptyState icon="👥" title="No groups assigned" text="There are currently no active teams found for your account. Join or create one above!" />
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>Create New Group</h2>
              <button onClick={() => setShowCreateModal(false)} className="btn btn--ghost btn--sm">✕</button>
            </div>
            {modalError && <div className="login-card__error mb-16">{modalError}</div>}
            <form onSubmit={handleCreateGroup}>
              <div className="form-group mb-16">
                <label className="form-label" htmlFor="groupName">Group Name *</label>
                <input
                  id="groupName"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Group A11"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="form-group mb-16">
                <label className="form-label" htmlFor="groupCode">Unique Group Code *</label>
                <input
                  id="groupCode"
                  type="text"
                  className="form-control"
                  placeholder="e.g. A11-X7K92P"
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value)}
                  disabled={submitting}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Other students will enter this code to join your group.</span>
              </div>
              <div className="form-group mb-24">
                <label className="form-label" htmlFor="groupDesc">Description</label>
                <textarea
                  id="groupDesc"
                  className="form-control"
                  rows="3"
                  placeholder="Describe your group's focus..."
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn--secondary" disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Group Modal */}
      {showJoinModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>Join Group</h2>
              <button onClick={() => setShowJoinModal(false)} className="btn btn--ghost btn--sm">✕</button>
            </div>
            {modalError && <div className="login-card__error mb-16">{modalError}</div>}
            <form onSubmit={handleJoinGroup}>
              <div className="form-group mb-24">
                <label className="form-label" htmlFor="joinCode">Enter Group Code *</label>
                <input
                  id="joinCode"
                  type="text"
                  className="form-control"
                  placeholder="e.g. A11-X7K92P"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowJoinModal(false)} className="btn btn--secondary" disabled={submitting}>Cancel</button>
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
