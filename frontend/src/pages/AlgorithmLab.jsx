import React, { useState, useMemo, useCallback } from 'react';
import AppLayout from '../layouts/AppLayout';

/* ────────────────────────────────────────────────────────────────────────────
   DAG + Topological Sort (Kahn's Algorithm) — Client-side
   ──────────────────────────────────────────────────────────────────────────── */
function topologicalSort(nodes, edges) {
  const inDegree = {};
  const adj = {};
  nodes.forEach(n => { inDegree[n.id] = 0; adj[n.id] = []; });
  edges.forEach(e => {
    adj[e.from].push(e.to);
    inDegree[e.to] = (inDegree[e.to] || 0) + 1;
  });

  const queue = [];
  nodes.forEach(n => { if (inDegree[n.id] === 0) queue.push(n.id); });

  const order = [];
  while (queue.length > 0) {
    const node = queue.shift();
    order.push(node);
    for (const neighbor of adj[node]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  const hasCycle = order.length !== nodes.length;
  return { order, hasCycle };
}

function longestPath(nodes, edges, topoOrder) {
  const dist = {};
  const prev = {};
  nodes.forEach(n => { dist[n.id] = 0; prev[n.id] = null; });

  const adj = {};
  nodes.forEach(n => { adj[n.id] = []; });
  edges.forEach(e => adj[e.from].push({ to: e.to, weight: e.weight || 1 }));

  for (const u of topoOrder) {
    for (const { to: v, weight } of adj[u]) {
      if (dist[u] + weight > dist[v]) {
        dist[v] = dist[u] + weight;
        prev[v] = u;
      }
    }
  }

  // Find the node with maximum distance
  let maxNode = topoOrder[0];
  for (const id of topoOrder) {
    if (dist[id] > dist[maxNode]) maxNode = id;
  }

  // Trace back the critical path
  const criticalPath = [];
  let cur = maxNode;
  while (cur !== null) {
    criticalPath.unshift(cur);
    cur = prev[cur];
  }

  return { dist, criticalPath, maxDist: dist[maxNode] };
}

/* ────────────────────────────────────────────────────────────────────────────
   Default DAG data
   ──────────────────────────────────────────────────────────────────────────── */
const DEFAULT_NODES = [
  { id: 'A', label: 'Requirements',     x: 100, y: 60,  status: 'COMPLETED' },
  { id: 'B', label: 'System Design',    x: 300, y: 60,  status: 'COMPLETED' },
  { id: 'C', label: 'Backend API',      x: 200, y: 160, status: 'IN_PROGRESS' },
  { id: 'D', label: 'Frontend UI',      x: 400, y: 160, status: 'IN_PROGRESS' },
  { id: 'E', label: 'Database Schema',  x: 100, y: 260, status: 'NOT_STARTED' },
  { id: 'F', label: 'Integration Test', x: 300, y: 260, status: 'NOT_STARTED' },
  { id: 'G', label: 'Deployment',       x: 500, y: 260, status: 'NOT_STARTED' },
  { id: 'H', label: 'Final Review',     x: 350, y: 350, status: 'NOT_STARTED' },
];

const DEFAULT_EDGES = [
  { from: 'A', to: 'B', weight: 2 },
  { from: 'A', to: 'C', weight: 3 },
  { from: 'B', to: 'D', weight: 4 },
  { from: 'C', to: 'E', weight: 2 },
  { from: 'C', to: 'F', weight: 3 },
  { from: 'D', to: 'F', weight: 2 },
  { from: 'D', to: 'G', weight: 5 },
  { from: 'E', to: 'F', weight: 1 },
  { from: 'F', to: 'H', weight: 3 },
  { from: 'G', to: 'H', weight: 2 },
];

export default function AlgorithmLab() {
  const [nodes, setNodes] = useState(DEFAULT_NODES);
  const [edges, setEdges] = useState(DEFAULT_EDGES);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showAddEdge, setShowAddEdge] = useState(false);
  const [edgeFrom, setEdgeFrom] = useState('');
  const [edgeTo, setEdgeTo] = useState('');
  const [edgeWeight, setEdgeWeight] = useState('1');

  const topoResult = useMemo(() => topologicalSort(nodes, edges), [nodes, edges]);
  const cpResult = useMemo(() => {
    if (topoResult.hasCycle) return null;
    return longestPath(nodes, edges, topoResult.order);
  }, [nodes, edges, topoResult]);

  const criticalSet = useMemo(() => cpResult ? new Set(cpResult.criticalPath) : new Set(), [cpResult]);

  const statusColor = (s) => {
    switch (s) {
      case 'COMPLETED':   return { fill: 'rgba(52,211,153,0.15)', stroke: '#34d399', text: '#34d399' };
      case 'IN_PROGRESS': return { fill: 'rgba(251,191,36,0.15)', stroke: '#fbbf24', text: '#fbbf24' };
      default:            return { fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.15)', text: '#a1a1aa' };
    }
  };

  const handleAddEdge = (e) => {
    e.preventDefault();
    if (!edgeFrom || !edgeTo || edgeFrom === edgeTo) return;
    if (edges.some(ed => ed.from === edgeFrom && ed.to === edgeTo)) return;
    setEdges(prev => [...prev, { from: edgeFrom, to: edgeTo, weight: parseInt(edgeWeight) || 1 }]);
    setEdgeFrom(''); setEdgeTo(''); setEdgeWeight('1');
  };

  const handleRemoveEdge = (from, to) => {
    setEdges(prev => prev.filter(e => !(e.from === from && e.to === to)));
  };

  const handleReset = () => {
    setNodes(DEFAULT_NODES);
    setEdges(DEFAULT_EDGES);
    setSelectedNode(null);
  };

  const nodeMap = useMemo(() => {
    const m = {};
    nodes.forEach(n => { m[n.id] = n; });
    return m;
  }, [nodes]);

  return (
    <AppLayout title="Algorithm Lab">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">🧪 Algorithm Lab — DAG Topological Sort</h1>
          <p className="page-header__subtitle">
            Directed Acyclic Graph visualizer with Kahn's topological ordering and critical path (longest path) analysis.
          </p>
        </div>
        <button className="btn btn--secondary btn--sm" onClick={handleReset}>🔄 Reset Graph</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        {/* Left: Graph + Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* DAG SVG */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Dependency Graph
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {topoResult.hasCycle ? (
                  <span className="badge badge--danger">⚠ Cycle Detected</span>
                ) : (
                  <span className="badge badge--success">✓ Valid DAG</span>
                )}
                <span className="badge badge--neutral">{nodes.length} nodes • {edges.length} edges</span>
              </div>
            </div>

            <svg viewBox="0 0 620 400" style={{ width: '100%', height: 'auto', minHeight: '280px' }}>
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.25)" />
                </marker>
                <marker id="arrowhead-crit" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#f87171" />
                </marker>
              </defs>

              {/* Edges */}
              {edges.map((e, i) => {
                const from = nodeMap[e.from];
                const to = nodeMap[e.to];
                if (!from || !to) return null;
                const isCritical = criticalSet.has(e.from) && criticalSet.has(e.to) &&
                  cpResult?.criticalPath.indexOf(e.to) === cpResult?.criticalPath.indexOf(e.from) + 1;

                // Calculate edge points offset from node centers
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const offsetX = (dx / dist) * 28;
                const offsetY = (dy / dist) * 28;

                return (
                  <g key={`edge-${i}`}>
                    <line
                      x1={from.x + offsetX} y1={from.y + offsetY}
                      x2={to.x - offsetX} y2={to.y - offsetY}
                      stroke={isCritical ? '#f87171' : 'rgba(255,255,255,0.12)'}
                      strokeWidth={isCritical ? 2.5 : 1.5}
                      markerEnd={isCritical ? 'url(#arrowhead-crit)' : 'url(#arrowhead)'}
                      style={{ transition: 'all 0.3s ease' }}
                    />
                    <text
                      x={(from.x + to.x) / 2 + 8}
                      y={(from.y + to.y) / 2 - 6}
                      fontSize="9" fill={isCritical ? '#f87171' : 'rgba(255,255,255,0.3)'}
                      fontFamily="JetBrains Mono, monospace" fontWeight="600"
                    >
                      w={e.weight}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map(n => {
                const sc = statusColor(n.status);
                const isCrit = criticalSet.has(n.id);
                const isSelected = selectedNode === n.id;
                return (
                  <g key={n.id} onClick={() => setSelectedNode(n.id === selectedNode ? null : n.id)} style={{ cursor: 'pointer' }}>
                    <circle cx={n.x} cy={n.y} r="26"
                      fill={isCrit ? 'rgba(248,113,113,0.10)' : sc.fill}
                      stroke={isSelected ? '#818cf8' : isCrit ? '#f87171' : sc.stroke}
                      strokeWidth={isSelected ? 2.5 : isCrit ? 2 : 1.5}
                      style={{ transition: 'all 0.3s ease' }}
                    />
                    <text x={n.x} y={n.y - 2} textAnchor="middle" fill={isCrit ? '#f87171' : sc.text}
                      fontSize="14" fontWeight="700" fontFamily="Inter, sans-serif">
                      {n.id}
                    </text>
                    <text x={n.x} y={n.y + 12} textAnchor="middle" fill="rgba(255,255,255,0.35)"
                      fontSize="7" fontFamily="Inter, sans-serif">
                      {n.label.length > 14 ? n.label.substring(0, 13) + '…' : n.label}
                    </text>
                    {cpResult && (
                      <text x={n.x + 22} y={n.y - 18} textAnchor="middle" fill="var(--accent-light)"
                        fontSize="9" fontWeight="600" fontFamily="JetBrains Mono, monospace">
                        d={cpResult.dist[n.id]}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Topological Order */}
          <div className="card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>
              Topological Order (Kahn's Algorithm)
            </span>
            {topoResult.hasCycle ? (
              <div className="login-card__error" style={{ fontSize: '12px' }}>
                ⚠️ Cycle detected — topological sort is impossible. Remove a back-edge to resolve.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {topoResult.order.map((id, i) => (
                  <React.Fragment key={id}>
                    <div style={{
                      padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700',
                      background: criticalSet.has(id) ? 'rgba(248,113,113,0.10)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${criticalSet.has(id) ? 'rgba(248,113,113,0.25)' : 'var(--border)'}`,
                      color: criticalSet.has(id) ? '#f87171' : 'var(--text-secondary)',
                    }}>
                      {id}: {nodeMap[id]?.label || ''}
                    </div>
                    {i < topoResult.order.length - 1 && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Complexity */}
          <div className="card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>
              Algorithmic Complexity
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {[
                { op: "Kahn's Sort", val: 'O(V + E)', icon: '📐' },
                { op: 'Cycle Detect', val: 'O(V + E)', icon: '🔄' },
                { op: 'Longest Path', val: 'O(V + E)', icon: '🛤️' },
                { op: 'Space', val: 'O(V + E)', icon: '💾' },
              ].map(c => (
                <div key={c.op} style={{
                  padding: '10px', borderRadius: '8px', textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: '14px', marginBottom: '3px' }}>{c.icon}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>{c.op}</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-light)', fontFamily: 'JetBrains Mono, monospace' }}>{c.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Critical Path */}
          {cpResult && !topoResult.hasCycle && (
            <div className="card" style={{ padding: '16px', borderColor: 'rgba(248,113,113,0.25)' }}>
              <span style={{ fontSize: '10.5px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                🔴 Critical Path (Longest: {cpResult.maxDist})
              </span>
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {cpResult.criticalPath.map((id, i) => (
                  <div key={id} style={{
                    padding: '6px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '600',
                    background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)',
                    color: '#f87171', display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span>{i + 1}. {nodeMap[id]?.label || id}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10.5px' }}>d={cpResult.dist[id]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Edge */}
          <div className="card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '12px' }}>
              ➕ Add Dependency Edge
            </span>
            <form onSubmit={handleAddEdge} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '10.5px' }}>From</label>
                  <select className="form-select" value={edgeFrom} onChange={e => setEdgeFrom(e.target.value)}
                    style={{ fontSize: '12px', padding: '7px 10px' }}>
                    <option value="">—</option>
                    {nodes.map(n => <option key={n.id} value={n.id}>{n.id}: {n.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '10.5px' }}>To</label>
                  <select className="form-select" value={edgeTo} onChange={e => setEdgeTo(e.target.value)}
                    style={{ fontSize: '12px', padding: '7px 10px' }}>
                    <option value="">—</option>
                    {nodes.map(n => <option key={n.id} value={n.id}>{n.id}: {n.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '10.5px' }}>Weight</label>
                <input className="form-input" type="number" min="1" value={edgeWeight}
                  onChange={e => setEdgeWeight(e.target.value)} style={{ fontSize: '12px', padding: '7px 10px' }} />
              </div>
              <button className="btn btn--primary btn--sm" type="submit" style={{ width: '100%' }}>Add Edge</button>
            </form>
          </div>

          {/* Edge List */}
          <div className="card" style={{ padding: '16px', flex: 1, overflow: 'auto' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>
              Edges ({edges.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {edges.map((e, i) => {
                const isCrit = criticalSet.has(e.from) && criticalSet.has(e.to) &&
                  cpResult?.criticalPath.indexOf(e.to) === cpResult?.criticalPath.indexOf(e.from) + 1;
                return (
                  <div key={i} style={{
                    padding: '6px 10px', borderRadius: '5px', fontSize: '11px',
                    background: isCrit ? 'rgba(248,113,113,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isCrit ? 'rgba(248,113,113,0.15)' : 'var(--border)'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ color: isCrit ? '#f87171' : 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {e.from} → {e.to} (w={e.weight})
                    </span>
                    <button onClick={() => handleRemoveEdge(e.from, e.to)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                      fontSize: '13px', padding: '0 2px',
                    }}>&times;</button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="card" style={{ padding: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '10.5px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }} /> Completed
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24' }} /> In Progress
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a1a1aa' }} /> Not Started
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f87171' }} /> Critical Path
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
