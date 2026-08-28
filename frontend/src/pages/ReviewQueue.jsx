import React, { useState, useEffect } from 'react';
import AppLayout from '../layouts/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import projectService from '../services/projectService';
import workspaceService from '../services/workspaceService';
import { useAuth } from '../context/AuthContext';

import StudentGradingPanel from '../components/StudentGradingPanel';

export default function ReviewQueue() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWs, setSelectedWs] = useState(null);
  const [queue, setQueue] = useState([]);
  const [nextRequest, setNextRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // 1. Fetch workspaces on load
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const list = await workspaceService.getWorkspaces(user.id, user.role);
        setWorkspaces(list);
        if (list.length > 0) {
          setSelectedWs(list[0]);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch workspaces.');
        setLoading(false);
      }
    };
    fetchWorkspaces();
  }, [user]);

  // 2. Fetch Review Queue and Peek Next Request when selected workspace changes
  useEffect(() => {
    if (!selectedWs) return;
    fetchQueueData();
  }, [selectedWs]);

  const fetchQueueData = async () => {
    try {
      setLoading(true);
      const queueList = await projectService.getReviewQueue(selectedWs.id);
      setQueue(queueList);
      
      const nextReq = await projectService.getReviewQueueNext(selectedWs.id);
      setNextRequest(nextReq);
    } catch (err) {
      setError(err.message || 'Failed to load review queue.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessNext = async () => {
    if (!nextRequest) return;
    
    setError('');
    setProcessing(true);
    try {
      await projectService.processReviewRequest();
      // Reload queue and next request
      await fetchQueueData();
    } catch (err) {
      setError(err.message || 'Failed to process request.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading && workspaces.length === 0) {
    return (
      <AppLayout title="Review Queue">
        <LoadingSpinner message="Retrieving workspace registry..." />
      </AppLayout>
    );
  }

  if (workspaces.length === 0) {
    return (
      <AppLayout title="Review Queue">
        <EmptyState icon="📂" title="No workspaces assigned" text="You do not have access to any workspaces to review projects." />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Staff Review Queue">
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
              <h1 className="page-header__title">Staff Review Queue</h1>
              <p className="page-header__subtitle">{selectedWs?.course_code} — {selectedWs?.name}</p>
            </>
          )}
        </div>
      </div>

      {error && <div className="login-card__error mb-24">{error}</div>}

      {loading ? (
        <LoadingSpinner message="Querying queue registry..." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Dequeue / Process Section */}
          <div className="card card--flat">
            <h3 className="card__title" style={{ fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚡</span> Next Up for Review (FIFO Peek)
            </h3>

            {nextRequest ? (
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', padding: '20px', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span className="badge badge--warning" style={{ textTransform: 'uppercase' }}>{nextRequest.request_type}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(nextRequest.created_at).toLocaleString()}</span>
                </div>
                <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{nextRequest.project_name}</h4>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>Project ID: {nextRequest.project_id} • Group: {nextRequest.group_name}</p>
                
                <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid var(--accent)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
                  <strong style={{ fontSize: '12px', display: 'block', color: 'var(--text-secondary)', marginBottom: '4px' }}>Submission Message:</strong>
                  <p style={{ fontSize: '13px', lineHeight: '1.5' }}>{nextRequest.message}</p>
                </div>

                {/* Individual Student Grading Panel */}
                {selectedWs && (
                  <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                    <StudentGradingPanel
                      workspaceId={selectedWs.id}
                      projectId={nextRequest.project_id}
                      groupName={nextRequest.group_name}
                      members={nextRequest.members || []}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Submitted by: <strong>{nextRequest.submitted_by}</strong></span>
                  <button
                    className="btn btn--primary"
                    disabled={processing}
                    onClick={handleProcessNext}
                    style={{ background: 'var(--clr-success)', borderColor: 'var(--clr-success)' }}
                  >
                    {processing ? 'Processing...' : '✔ Approve & Dequeue'}
                  </button>
                </div>
              </div>
            ) : (
              <EmptyState icon="🎉" title="Queue is empty" text="All project submissions have been reviewed and approved!" />
            )}
          </div>

          {/* Queue Size & FIFO Overview */}
          <div className="card card--flat">
            <h3 className="card__title" style={{ fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📋</span> Pending Review Queue ({queue.length})
            </h3>
            
            {queue.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {queue.map((req, idx) => (
                  <div
                    key={req.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: idx === 0 ? 'rgba(108, 92, 231, 0.04)' : 'rgba(255,255,255,0.01)',
                      border: idx === 0 ? '1px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: idx === 0 ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '11px'
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: '1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '13px' }}>{req.project_id}</strong>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{req.request_type}</span>
                      </div>
                      <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Group: {req.group_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="📭" title="No pending requests" text="Queue size is currently 0." />
            )}
          </div>

        </div>
      )}
    </AppLayout>
  );
}
