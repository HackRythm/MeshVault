import { useState, useEffect } from 'react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import { dsaApi, logApi, projectApi } from '../services/api';
import { HiShieldCheck, HiPlus, HiClock } from 'react-icons/hi';

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [merkleResult, setMerkleResult] = useState(null);
  const [merkleTree, setMerkleTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [building, setBuilding] = useState(false);
  const [showAddLog, setShowAddLog] = useState(false);
  const [logForm, setLogForm] = useState({ project: '', content: '' });

  useEffect(() => {
    loadData();
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

  const handleAddLog = async (e) => {
    e.preventDefault();
    try {
      await logApi.create(logForm);
      setShowAddLog(false);
      setLogForm({ project: '', content: '' });
      loadData();
    } catch (err) {
      console.error('Failed to add log:', err);
    }
  };

  const handleBuildMerkle = async () => {
    setBuilding(true);
    try {
      const logContents = logs.map(l => l.content);
      if (logContents.length === 0) {
        // Demo with sample data
        const sampleLogs = [
          'Implemented AVL tree rotations — LL, RR, LR, RL cases',
          'Added SHA-256 hashing to update log entries',
          'Completed priority queue with min-heap for deadlines',
          'Built trie search index for project autocomplete',
          'Sprint 1 completed — 87.5% utilization via knapsack DP',
        ];
        const { data: buildData } = await dsaApi.buildMerkle(sampleLogs);
        setMerkleResult({ built: true, ...buildData });
        const { data: treeData } = await dsaApi.getMerkleTree();
        setMerkleTree(treeData);
        // Also index these in AVL tree
        try {
          const now = Date.now() / 1000;
          await dsaApi.indexLogs(sampleLogs.map((content, i) => ({
            timestamp: now - (sampleLogs.length - i) * 3600,
            content,
            project: 'Demo',
            user: 'System',
          })));
        } catch { /* ok */ }
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
          'Implemented AVL tree rotations — LL, RR, LR, RL cases',
          'Added SHA-256 hashing to update log entries',
          'Completed priority queue with min-heap for deadlines',
          'Built trie search index for project autocomplete',
          'Sprint 1 completed — 87.5% utilization via knapsack DP',
        ];
      const { data } = await dsaApi.verifyMerkle(logContents);
      setMerkleResult((prev) => ({ ...prev, ...data }));
    } catch (err) {
      console.error('Verification failed:', err);
    }
    setVerifying(false);
  };

  const truncateHash = (hash) => {
    if (!hash) return '—';
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-heading">Audit Trail</h3>
          <p className="text-xs text-muted mt-0.5">SHA-256 Merkle Tree verification · AVL Tree chronological indexing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowAddLog(true)} icon={<HiPlus />}>
            Add Log
          </Button>
          <Button variant="secondary" size="sm" onClick={handleBuildMerkle} loading={building} icon="🌳">
            Build Merkle Tree
          </Button>
          <Button
            variant="success" size="sm"
            onClick={handleVerify} loading={verifying}
            icon={<HiShieldCheck />}
            disabled={!merkleResult?.built}
          >
            Verify Integrity
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Merkle Tree Visualization & Status */}
        <div className="lg:col-span-1 space-y-4">
          {/* Verification Status */}
          <Card hover={false} padding="p-5">
            <h4 className="text-sm font-semibold text-heading mb-3">Verification Status</h4>
            {merkleResult ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {merkleResult.verified ? (
                    <Badge variant="success" icon="🛡️">SHA-256 Merkle Verified</Badge>
                  ) : merkleResult.verified === false && merkleResult.message?.includes('FAILURE') ? (
                    <Badge variant="alert" icon="⚠️">Integrity Compromised</Badge>
                  ) : (
                    <Badge variant="warning" icon="⏳">Tree Built — Ready to Verify</Badge>
                  )}
                </div>

                {merkleResult.root_hash && (
                  <div className="bg-canvas rounded-lg p-3 mt-2">
                    <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Merkle Root</p>
                    <p className="font-mono text-xs text-accent break-all">{merkleResult.root_hash || merkleResult.expected_root}</p>
                  </div>
                )}

                {merkleResult.leaf_count && (
                  <div className="flex gap-3 text-xs">
                    <div className="bg-canvas rounded-lg px-3 py-2 flex-1 text-center">
                      <p className="text-muted">Leaves</p>
                      <p className="text-heading font-semibold">{merkleResult.leaf_count}</p>
                    </div>
                    <div className="bg-canvas rounded-lg px-3 py-2 flex-1 text-center">
                      <p className="text-muted">Levels</p>
                      <p className="text-heading font-semibold">{merkleResult.tree_levels || '—'}</p>
                    </div>
                  </div>
                )}

                {merkleResult.message && (
                  <p className={`text-xs ${merkleResult.verified ? 'text-success' : 'text-alert'}`}>
                    {merkleResult.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-3xl mb-2">🌳</p>
                <p className="text-sm text-muted">Build a Merkle tree to start verification</p>
              </div>
            )}
          </Card>

          {/* Tree Visualization */}
          {merkleTree && (
            <Card hover={false} padding="p-5">
              <h4 className="text-sm font-semibold text-heading mb-3">Tree Structure</h4>
              <div className="space-y-2">
                {[...merkleTree.tree].reverse().map((level, li) => (
                  <div key={li}>
                    <p className="text-[10px] text-muted uppercase tracking-wider mb-1">
                      {li === 0 ? '🏛️ Root' : li === merkleTree.tree.length - 1 ? '🍃 Leaves' : `Level ${merkleTree.levels - 1 - li}`}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {level.map((hash, hi) => (
                        <span
                          key={hi}
                          className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${
                            li === 0 ? 'bg-accent/10 text-accent' : 'bg-canvas text-muted'
                          }`}
                          title={hash}
                        >
                          {hash.slice(0, 8)}…
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Algorithm Info */}
          <Card hover={false} padding="p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted font-medium mb-2">DSA Engines Active</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="text-xs text-body">SHA-256 Merkle Tree</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="text-xs text-body">AVL Tree (Log Index)</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Chronological Log Timeline */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-heading">Update Log Timeline</h4>
            <Badge variant="accent" icon="🌲">AVL-Indexed</Badge>
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
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-3">
                {logs.map((log, i) => (
                  <div key={log._id || i} className="relative flex gap-4 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                    {/* Dot */}
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                      ${log.verified ? 'bg-success/20 border-2 border-success' : 'bg-surface border-2 border-border'}`}>
                      {log.verified
                        ? <HiShieldCheck className="text-success text-sm" />
                        : <HiClock className="text-muted text-sm" />
                      }
                    </div>

                    {/* Content */}
                    <Card className="flex-1" padding="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-heading">{log.content}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-[10px] text-muted">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                            {log.project?.title && (
                              <Badge variant="accent">{log.project.title}</Badge>
                            )}
                            {log.user?.name && (
                              <span className="text-[10px] text-muted">by {log.user.name}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {log.verified && <Badge variant="success">✓ Verified</Badge>}
                          {log.merkleHash && (
                            <span className="font-mono text-[9px] text-muted" title={log.merkleHash}>
                              {truncateHash(log.merkleHash)}
                            </span>
                          )}
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
              <p className="text-muted text-sm mt-1">
                Add logs to build an audit trail, then verify with SHA-256 Merkle Tree
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowAddLog(true)} icon={<HiPlus />}>
                  Add First Log
                </Button>
                <Button variant="primary" size="sm" onClick={handleBuildMerkle} loading={building} icon="🌳">
                  Demo with Sample Data
                </Button>
              </div>
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
