import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const list = await groupService.getGroups(null, user.id, user.role);
        setGroups(list);
      } catch (err) {
        setError(err.message || 'Failed to fetch groups.');
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, [user]);

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
            {user.role === 'STAFF' ? 'View and track all student groups.' : 'Your assigned project group.'}
          </p>
        </div>
      </div>

      {error && <div className="login-card__error mb-24">{error}</div>}

      {groups.length > 0 ? (
        <div className="grid grid--3">
          {groups.map(group => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      ) : (
        <EmptyState icon="👥" title="No groups assigned" text="There are currently no active teams found for your account." />
      )}
    </AppLayout>
  );
}
