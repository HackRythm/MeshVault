import { useState, useEffect } from 'react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import { dsaApi, logApi, projectApi } from '../services/api';
import { HiShieldCheck, HiPlus, HiClock, HiRewind } from 'react-icons/hi';

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stackLogs, setStackLogs] = useState([]);
  const [merkleResult, setMerkleResult] = useState(null);
  const [merkleTree, setMerkleTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [building, setBuilding] = useState(false);
  const [showAddLog, setShowAddLog] = useState(false);
  const [logForm, setLogForm] = useState({ project: '', content: '' });

  // Phase mode state: 'midsem' (Simple BST + Stack) or 'endsem' (Merkle + AVL Tree)
  const [engineMode, setEngineMode] = useState('midsem');

  useEffect(() => {
    loadData();
    loadStack();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logRes, projRes] = await Promise.allSettled([
        logApi.getAll(50),
        projectApi.getAll(),
      ]);
      if (logRes.status === 'fulfilled') setLogs(logRes.value.data.logs || []);
      if (projRes.status === 'fulfilled') setProjects(projRes.value.data.projects || []);
    } catch { /* ok */ }
    setLoading(false);
  };

  const loadStack = async () => {
    try {
      const { data } = await dsaApi.stackGet();
      setStackLogs(data.stack || []);
    } catch { /* ok */ }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    try {
      await logApi.create(logForm);
      // Push to Mid-Sem stack
      try {
        await dsaApi.stackPush('ADD_LOG', { content: logForm.content, project: logForm.project });
        await loadStack();
      } catch { /* ok */ }

      setShowAddLog(false);
      setLogForm({ project: '', content: '' });
      loadData();
    } catch (err) {
      console.error('Failed to add log:', err);
    }
  };

  const handleStackPop = async () => {
    try {
      const { data } = await dsaApi.stackPop();
      if (data.popped) {
        await loadStack();
      }
    } catch (err) {
      console.error('Stack pop failed:', err);
    }
  };

  const handleBuildMerkle = async () => {
    setBuilding(true);
    try {
      const logContents = logs.map(l => l.content);
      if (logContents.length === 0) {
        const sampleLogs = [
          'Simple BST timestamp indexing configured',
          'Stack LIFO undo/redo trail initialized',
          'Doubly LinkedList activity feed populated',
          'Priority Queue deadlines operational',
        ];
        const { data: buildData } = await dsaApi.buildMerkle(sampleLogs);
        setMerkleResult({ built: true, ...buildData });
        const { data: treeData } = await dsaApi.getMerkleTree();
        setMerkleTree(treeData);
      } else {
        const { data: buildData } = await dsaApi.buildMerkle(logContents);
        setMerkleResult({ built: true, ...buildData });
        const { data: treeData } = await dsaApi.getMerkleTree();
        setMerkleTree(treeData);
      }
    } catch (err) {
      console.error('Merkle build failed:', err);
    }
    setBuilding(false);
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const logContents = logs.length > 0
        ? logs.map(l => l.content)
        : [
          'Simple BST timestamp indexing configured',
          'Stack LIFO undo/redo trail initialized',
          'Doubly LinkedList activity feed populated',
          'Priority Queue deadlines operational',
        ];
      const { data } = await dsaApi.verifyMerkle(logContents);
      setMerkleResult((prev) => ({ ...prev, ...data }));
    } catch (err) {
      console.error('Verification failed:', err);
    }
    setVerifying(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-heading">Audit Trail & Log Index</h3>
          <p className="text-xs text-muted mt-0.5">
            {engineMode === 'midsem'
              ? 'Phase 1 (Mid-Sem): Simple BST timestamp indexing & Stack LIFO history'
              : 'Phase 2 (End-Sem): SHA-256 Merkle Tree & Self-Balancing AVL Tree'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex items-center bg-canvas p-1 rounded-xl border border-border">
            <button
              onClick={() => setEngineMode('midsem')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                engineMode === 'midsem'
                  ? 'bg-accent text-white shadow-glow-sm'
                  : 'text-muted hover:text-heading'
              }`}
            >
              🔹 Mid-Sem (Light DSAs)
            </button>
            <button
              onClick={() => setEngineMode('endsem')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                engineMode === 'endsem'
                  ? 'bg-accent text-white shadow-glow-sm'
                  : 'text-muted hover:text-heading'
              }`}
            >
              🔸 End-Sem (Advanced DSAs)
            </button>
          </div>

          <Button variant="secondary" size="sm" onClick={() => setShowAddLog(true)} icon={<HiPlus />}>
            Add Log
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel */}
        <div className="lg:col-span-1 space-y-4">
          {engineMode === 'midsem' ? (
            /* Mid-Sem Panel: Stack & Simple BST controls */
            <>
              {/* Stack Action Card */}
              <Card hover={false} padding="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-heading">Audit Log Stack (LIFO)</h4>
                  <Badge variant="accent font-mono">Stack</Badge>
                </div>
                <p className="text-xs text-muted mb-4 leading-relaxed">
                  Last-In, First-Out stack for tracking recent user actions and supporting single-step Undo/Rollback operations.
                </p>

                <div className="flex gap-2 mb-4">
                  <Button
                    variant="secondary" size="sm" className="w-full"
                    onClick={handleStackPop} disabled={stackLogs.length === 0}
                    icon={<HiRewind />}
                  >
                    Undo Top Action (Pop)
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">
                    Current Stack ({stackLogs.length})
                  </p>
                  {stackLogs.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {stackLogs.map((item, idx) => (
                        <div key={idx} className="bg-canvas rounded-lg p-2 text-xs flex justify-between items-center border border-border/50">
                          <span className="text-heading font-medium truncate">{item.action || item.content}</span>
                          <span className="text-[9px] text-accent font-mono">#{stackLogs.length - idx}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted italic">Stack is empty.</p>
                  )}
                </div>
              </Card>

              {/* Simple BST Summary */}
              <Card hover={false} padding="p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted font-medium mb-2">Phase 1 Active Engine</p>
                <div className="space-y-1.5 text-xs text-body">
                  <p><strong className="text-heading">Simple BST:</strong> Logs indexed by timestamp for $O(\log N)$ average lookups.</p>
                  <p><strong className="text-heading">Doubly LinkedList:</strong> Sequential chronological activity feed.</p>
                </div>
              </Card>
            </>
          ) : (
            /* End-Sem Panel: Merkle Tree & AVL Tree controls */
            <>
              <Card hover={false} padding="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-heading">Merkle Integrity Engine</h4>
                  <Badge variant="accent">SHA-256</Badge>
                </div>
                <div className="flex gap-2 mb-4">
                  <Button variant="secondary" size="sm" onClick={handleBuildMerkle} loading={building} icon="🌳">
                    Build Tree
                  </Button>
                  <Button
                    variant="success" size="sm" onClick={handleVerify}
                    loading={verifying} icon={<HiShieldCheck />}
                    disabled={!merkleResult?.built}
                  >
                    Verify
                  </Button>
                </div>

                {merkleResult && (
                  <div className="bg-canvas rounded-lg p-3 space-y-1 text-xs">
                    <p className="text-[10px] text-muted uppercase">Merkle Root</p>
                    <p className="font-mono text-accent text-[11px] break-all">{merkleResult.root_hash || merkleResult.expected_root || '—'}</p>
                    {merkleResult.message && (
                      <p className={`mt-2 font-medium ${merkleResult.verified ? 'text-success' : 'text-alert'}`}>
                        {merkleResult.message}
                      </p>
                    )}
                  </div>
                )}
              </Card>

              {merkleTree && (
                <Card hover={false} padding="p-5">
                  <h4 className="text-sm font-semibold text-heading mb-3">Tree Structure</h4>
                  <div className="space-y-2">
                    {[...merkleTree.tree].reverse().map((level, li) => (
                      <div key={li}>
                        <p className="text-[10px] text-muted uppercase tracking-wider mb-1">
                          {li === 0 ? '🏛️ Root' : `Level ${merkleTree.levels - 1 - li}`}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {level.map((hash, hi) => (
                            <span key={hi} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-canvas text-muted">
                              {hash.slice(0, 8)}…
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Right Panel: Logs Timeline */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-heading">Chronological Log Timeline</h4>
            <Badge variant="accent">
              {engineMode === 'midsem' ? 'Simple BST Indexed' : 'AVL Tree Indexed'}
            </Badge>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-surface border border-border rounded-xl p-4 animate-pulse">
                  <div className="h-3 bg-border rounded w-3/4 mb-2" />
                  <div className="h-3 bg-border rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : logs.length > 0 ? (
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-3">
                {logs.map((log, i) => (
                  <div key={log._id || i} className="relative flex gap-4 animate-slide-up">
                    <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-surface border-2 border-border">
                      <HiClock className="text-muted text-sm" />
                    </div>

                    <Card className="flex-1" padding="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-heading">{log.content}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px] text-muted">
                            <span>{new Date(log.createdAt).toLocaleString()}</span>
                            {log.project?.title && <Badge variant="accent">{log.project.title}</Badge>}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Card hover={false} className="text-center py-12">
              <div className="text-5xl mb-3">📝</div>
              <h4 className="text-heading font-semibold">No update logs yet</h4>
              <p className="text-muted text-xs mt-1">Add logs to build an audit trail</p>
            </Card>
          )}
        </div>
      </div>

      {/* Add Log Modal */}
      {showAddLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddLog(false)} />
          <div className="relative bg-surface border border-border rounded-2xl shadow-2xl max-w-lg w-full z-10 animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-heading">Add Update Log</h2>
              <button onClick={() => setShowAddLog(false)} className="text-muted hover:text-body p-1.5 rounded-lg hover:bg-canvas transition-colors">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddLog} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Project</label>
                <select required value={logForm.project} onChange={e => setLogForm({ ...logForm, project: e.target.value })} className="input-field">
                  <option value="">Select project</option>
                  {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Log Content</label>
                <textarea
                  required value={logForm.content}
                  onChange={e => setLogForm({ ...logForm, content: e.target.value })}
                  className="input-field resize-none h-24"
                  placeholder="What did you accomplish?"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowAddLog(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Add Log Entry</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
