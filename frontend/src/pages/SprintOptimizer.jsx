import React, { useState, useMemo } from 'react';
import AppLayout from '../layouts/AppLayout';

/* ────────────────────────────────────────────────────────────────────────────
   0/1 Knapsack DP Implementation (client-side, educational)
   ──────────────────────────────────────────────────────────────────────────── */
function knapsack(items, capacity) {
  const n = items.length;
  // dp[i][w] = max value using items 0..i-1 with capacity w
  const dp = Array.from({ length: n + 1 }, () => Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i - 1][w]; // skip item
      if (items[i - 1].effort <= w) {
        dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - items[i - 1].effort] + items[i - 1].value);
      }
    }
  }

  // Backtrack to find selected items
  const selected = [];
  let w = capacity;
  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selected.push(i - 1);
      w -= items[i - 1].effort;
    }
  }
  selected.reverse();

  return { maxValue: dp[n][capacity], dp, selected };
}

/* ────────────────────────────────────────────────────────────────────────────
   Seed backlog items
   ──────────────────────────────────────────────────────────────────────────── */
const DEFAULT_BACKLOG = [
  { id: 1, name: 'Core BST Implementation',      effort: 8,  value: 25, milestone: 'M1' },
  { id: 2, name: 'Hash Table Unit Tests',         effort: 4,  value: 15, milestone: 'M1' },
  { id: 3, name: 'UI Dashboard Polish',           effort: 6,  value: 18, milestone: 'M2' },
  { id: 4, name: 'API Authentication Layer',      effort: 5,  value: 22, milestone: 'M1' },
  { id: 5, name: 'Graph Traversal Module',        effort: 10, value: 30, milestone: 'M3' },
  { id: 6, name: 'Documentation & README',        effort: 3,  value: 10, milestone: 'M2' },
  { id: 7, name: 'Performance Benchmarks',        effort: 7,  value: 20, milestone: 'M3' },
  { id: 8, name: 'Deployment Pipeline Setup',     effort: 9,  value: 28, milestone: 'M2' },
];

export default function SprintOptimizer() {
  const [capacity, setCapacity] = useState(20);
  const [backlog, setBacklog] = useState(DEFAULT_BACKLOG);
  const [showMatrix, setShowMatrix] = useState(false);

  // Form for adding items
  const [newName, setNewName] = useState('');
  const [newEffort, setNewEffort] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newMilestone, setNewMilestone] = useState('M1');
  const [nextId, setNextId] = useState(100);

  const result = useMemo(() => knapsack(backlog, capacity), [backlog, capacity]);
  const selectedSet = useMemo(() => new Set(result.selected), [result.selected]);
  const totalEffort = result.selected.reduce((s, i) => s + backlog[i].effort, 0);
  const utilization = capacity > 0 ? Math.round((totalEffort / capacity) * 100) : 0;

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newEffort || !newValue) return;
    setBacklog(prev => [...prev, {
      id: nextId, name: newName.trim(),
      effort: parseInt(newEffort), value: parseInt(newValue), milestone: newMilestone,
    }]);
    setNextId(n => n + 1);
    setNewName(''); setNewEffort(''); setNewValue(''); setNewMilestone('M1');
  };

  const handleRemove = (idx) => {
    setBacklog(prev => prev.filter((_, i) => i !== idx));
  };

  const handleReset = () => {
    setBacklog(DEFAULT_BACKLOG);
    setCapacity(20);
    setShowMatrix(false);
  };

  return (
    <AppLayout title="Sprint Optimizer">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">⏱️ Sprint Optimizer — 0/1 Knapsack</h1>
          <p className="page-header__subtitle">
            Maximize sprint value by selecting the optimal subset of milestones within your capacity budget using Dynamic Programming.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn--secondary btn--sm" onClick={() => setShowMatrix(!showMatrix)}>
            {showMatrix ? '📊 Hide Matrix' : '📊 Show DP Matrix'}
          </button>
          <button className="btn btn--secondary btn--sm" onClick={handleReset}>🔄 Reset</button>
        </div>
      </div>

      {/* Capacity Slider + Result Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Sprint Capacity (Story Points)
          </span>
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input type="range" min="5" max="50" value={capacity} onChange={e => setCapacity(parseInt(e.target.value))}
              style={{ flex: 1, accentColor: '#6366f1' }} />
            <span style={{ fontSize: '22px', fontWeight: '700', color: 'var(--accent-light)', fontFamily: 'JetBrains Mono, monospace', minWidth: '40px' }}>
              {capacity}
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '10.5px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Optimal Value
          </span>
          <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--clr-success)', marginTop: '6px' }}>
            {result.maxValue}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {result.selected.length} / {backlog.length} tasks selected
          </span>
        </div>

        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '10.5px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Capacity Utilization
          </span>
          <div style={{ fontSize: '28px', fontWeight: '700', color: utilization > 90 ? 'var(--clr-success)' : utilization > 60 ? 'var(--clr-warning)' : 'var(--text-secondary)', marginTop: '6px' }}>
            {utilization}%
          </div>
          <div style={{ marginTop: '6px' }}>
            <div className="progress-bar" style={{ height: '8px' }}>
              <div className="progress-bar__fill" style={{ width: `${utilization}%`, background: utilization > 90 ? 'var(--clr-success)' : 'var(--accent-gradient)' }} />
            </div>
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
            {totalEffort} / {capacity} SP used
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
        {/* Left: Backlog Table */}
        <div>
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sprint Backlog
              </span>
              <span className="badge badge--neutral">{backlog.length} items</span>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '30px' }}>Opt</th>
                    <th>Task</th>
                    <th>Milestone</th>
                    <th style={{ textAlign: 'right' }}>Effort</th>
                    <th style={{ textAlign: 'right' }}>Value</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {backlog.map((item, idx) => {
                    const isSelected = selectedSet.has(idx);
                    return (
                      <tr key={item.id} style={{
                        background: isSelected ? 'rgba(99, 102, 241, 0.06)' : 'transparent',
                        transition: 'background 0.2s ease',
                      }}>
                        <td>
                          {isSelected ? (
                            <span style={{ color: 'var(--clr-success)', fontSize: '14px' }}>✓</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                          )}
                        </td>
                        <td style={{ fontWeight: isSelected ? '600' : '400', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {item.name}
                        </td>
                        <td><span className="badge badge--neutral">{item.milestone}</span></td>
                        <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>{item.effort} SP</td>
                        <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--clr-success)' }}>{item.value}</td>
                        <td>
                          <button onClick={() => handleRemove(idx)} style={{
                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                            fontSize: '12px', padding: '2px',
                          }} title="Remove">&times;</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* DP Matrix (toggleable) */}
          {showMatrix && (
            <div className="card mt-16" style={{ padding: '16px', overflow: 'auto' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>
                Dynamic Programming Table (First 15 columns)
              </span>
              <div style={{ overflow: 'auto', maxHeight: '300px' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '4px 8px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>i\w</th>
                      {Array.from({ length: Math.min(capacity + 1, 16) }, (_, w) => (
                        <th key={w} style={{ padding: '4px 6px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>{w}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.dp.slice(0, backlog.length + 1).map((row, i) => (
                      <tr key={i}>
                        <td style={{ padding: '3px 8px', color: 'var(--text-muted)', borderRight: '1px solid var(--border)', fontWeight: '600' }}>{i}</td>
                        {row.slice(0, Math.min(capacity + 1, 16)).map((val, w) => (
                          <td key={w} style={{
                            padding: '3px 6px', textAlign: 'center',
                            color: val > 0 ? 'var(--accent-light)' : 'rgba(255,255,255,0.12)',
                            background: i > 0 && val !== result.dp[i - 1][w] ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                          }}>{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Complexity Card */}
          <div className="card mt-16" style={{ padding: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>
              Algorithmic Complexity — 0/1 Knapsack
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { op: 'Time', val: 'O(n × W)', desc: 'n items, W capacity' },
                { op: 'Space', val: 'O(n × W)', desc: 'DP table' },
                { op: 'Backtrack', val: 'O(n)', desc: 'solution recovery' },
              ].map(c => (
                <div key={c.op} style={{
                  padding: '10px', borderRadius: '8px', textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '2px' }}>{c.op}</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-light)', fontFamily: 'JetBrains Mono, monospace' }}>{c.val}</div>
                  <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Add Item Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '12px' }}>
              ➕ Add Backlog Item
            </span>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Task name" style={{ fontSize: '12px', padding: '8px 10px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '10.5px' }}>Effort (SP)</label>
                  <input className="form-input" type="number" min="1" max="50" value={newEffort}
                    onChange={e => setNewEffort(e.target.value)} style={{ fontSize: '12px', padding: '8px 10px' }} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '10.5px' }}>Value Points</label>
                  <input className="form-input" type="number" min="1" value={newValue}
                    onChange={e => setNewValue(e.target.value)} style={{ fontSize: '12px', padding: '8px 10px' }} />
                </div>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '10.5px' }}>Milestone</label>
                <select className="form-select" value={newMilestone} onChange={e => setNewMilestone(e.target.value)}
                  style={{ fontSize: '12px', padding: '8px 10px' }}>
                  <option value="M1">Milestone 1</option>
                  <option value="M2">Milestone 2</option>
                  <option value="M3">Milestone 3</option>
                </select>
              </div>
              <button className="btn btn--primary" type="submit" style={{ width: '100%' }}>Add to Backlog</button>
            </form>
          </div>

          {/* Optimal Selection Summary */}
          <div className="card" style={{ padding: '16px', flex: 1 }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>
              ✅ Optimal Sprint Selection
            </span>
            {result.selected.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                No items selected — increase capacity
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {result.selected.map(idx => {
                  const item = backlog[idx];
                  return (
                    <div key={item.id} style={{
                      padding: '8px 10px', borderRadius: '6px',
                      background: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.12)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.milestone} • {item.effort} SP</div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--clr-success)', fontFamily: 'JetBrains Mono, monospace' }}>
                        +{item.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
