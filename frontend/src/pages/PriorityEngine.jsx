import React, { useState, useCallback } from 'react';
import AppLayout from '../layouts/AppLayout';
import { useAuth } from '../context/AuthContext';

/* ────────────────────────────────────────────────────────────────────────────
   Min-Heap implementation (client-side, purely educational / visual)
   ──────────────────────────────────────────────────────────────────────────── */
class MinHeap {
  constructor() { this.heap = []; }

  _parent(i) { return Math.floor((i - 1) / 2); }
  _left(i)   { return 2 * i + 1; }
  _right(i)  { return 2 * i + 2; }

  _swap(i, j) { [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]]; }

  insert(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  _bubbleUp(i) {
    while (i > 0 && this.heap[this._parent(i)].priority > this.heap[i].priority) {
      this._swap(i, this._parent(i));
      i = this._parent(i);
    }
  }

  extractMin() {
    if (this.heap.length === 0) return null;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._bubbleDown(0);
    }
    return min;
  }

  _bubbleDown(i) {
    const n = this.heap.length;
    let smallest = i;
    const l = this._left(i);
    const r = this._right(i);
    if (l < n && this.heap[l].priority < this.heap[smallest].priority) smallest = l;
    if (r < n && this.heap[r].priority < this.heap[smallest].priority) smallest = r;
    if (smallest !== i) {
      this._swap(i, smallest);
      this._bubbleDown(smallest);
    }
  }

  peek() { return this.heap.length > 0 ? this.heap[0] : null; }
  size() { return this.heap.length; }
  toArray() { return [...this.heap]; }
}

/* ────────────────────────────────────────────────────────────────────────────
   Seed data for demo
   ──────────────────────────────────────────────────────────────────────────── */
const SEED_TASKS = [
  { id: 1, name: 'Fix authentication bug',   priority: 1, project: 'CS-DSA-A01', urgency: 'CRITICAL' },
  { id: 2, name: 'Update BST visualization',  priority: 3, project: 'CS-DSA-A01', urgency: 'HIGH' },
  { id: 3, name: 'Write unit tests',          priority: 5, project: 'CS-DSA-A02', urgency: 'MEDIUM' },
  { id: 4, name: 'Refactor hash table module', priority: 7, project: 'CS-DSA-A02', urgency: 'LOW' },
  { id: 5, name: 'Deploy staging build',      priority: 2, project: 'CS-DSA-B01', urgency: 'CRITICAL' },
];

function buildInitialHeap() {
  const h = new MinHeap();
  SEED_TASKS.forEach(t => h.insert({ ...t }));
  return h;
}

/* ────────────────────────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────────────────────────── */
export default function PriorityEngine() {
  const { user } = useAuth();
  const [heap, setHeap] = useState(() => buildInitialHeap());
  const [items, setItems] = useState(() => buildInitialHeap().toArray());
  const [extracted, setExtracted] = useState([]);
  const [highlightIdx, setHighlightIdx] = useState(null);
  const [nextId, setNextId] = useState(100);

  // Form state
  const [taskName, setTaskName] = useState('');
  const [taskPriority, setTaskPriority] = useState('5');
  const [taskProject, setTaskProject] = useState('');
  const [taskUrgency, setTaskUrgency] = useState('MEDIUM');
  const [formError, setFormError] = useState('');

  const refresh = useCallback((h) => {
    setItems([...h.toArray()]);
  }, []);

  const handleInsert = (e) => {
    e.preventDefault();
    if (!taskName.trim()) { setFormError('Task name is required.'); return; }
    const p = parseInt(taskPriority);
    if (isNaN(p) || p < 1 || p > 10) { setFormError('Priority must be 1–10.'); return; }
    setFormError('');

    const item = {
      id: nextId,
      name: taskName.trim(),
      priority: p,
      project: taskProject.trim() || '—',
      urgency: taskUrgency,
    };
    setNextId(n => n + 1);
    heap.insert(item);
    refresh(heap);

    // highlight new position
    const idx = heap.toArray().findIndex(t => t.id === item.id);
    setHighlightIdx(idx);
    setTimeout(() => setHighlightIdx(null), 1200);

    setTaskName(''); setTaskPriority('5'); setTaskProject(''); setTaskUrgency('MEDIUM');
  };

  const handleExtract = () => {
    const min = heap.extractMin();
    if (min) {
      setExtracted(prev => [min, ...prev]);
      refresh(heap);
      setHighlightIdx(0);
      setTimeout(() => setHighlightIdx(null), 800);
    }
  };

  const handleReset = () => {
    const h = buildInitialHeap();
    setHeap(h);
    refresh(h);
    setExtracted([]);
    setHighlightIdx(null);
  };

  const urgencyColor = (u) => {
    switch (u) {
      case 'CRITICAL': return { bg: 'rgba(248,113,113,0.10)', color: '#f87171', border: 'rgba(248,113,113,0.25)' };
      case 'HIGH':     return { bg: 'rgba(251,146,60,0.10)',  color: '#fb923c', border: 'rgba(251,146,60,0.25)' };
      case 'MEDIUM':   return { bg: 'rgba(251,191,36,0.10)',  color: '#fbbf24', border: 'rgba(251,191,36,0.25)' };
      case 'LOW':      return { bg: 'rgba(161,161,170,0.08)', color: '#a1a1aa', border: 'rgba(161,161,170,0.15)' };
      default:         return { bg: 'rgba(161,161,170,0.08)', color: '#a1a1aa', border: 'rgba(161,161,170,0.15)' };
    }
  };

  /* ── Tree layout coordinates ───────────────────────── */
  const getTreePositions = (arr) => {
    const positions = [];
    const levelWidths = [];
    const maxLevel = Math.floor(Math.log2(arr.length || 1));
    for (let i = 0; i < arr.length; i++) {
      const level = Math.floor(Math.log2(i + 1));
      const posInLevel = i - (Math.pow(2, level) - 1);
      const totalInLevel = Math.min(Math.pow(2, level), arr.length - (Math.pow(2, level) - 1));
      const spacing = 700 / (Math.pow(2, level) + 1);
      const x = spacing * (posInLevel + 1);
      const y = 40 + level * 72;
      positions.push({ x, y, level, idx: i });
    }
    return positions;
  };

  const positions = getTreePositions(items);

  return (
    <AppLayout title="Priority Engine">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">⚡ Priority Engine — Min-Heap Scheduler</h1>
          <p className="page-header__subtitle">
            Visual task priority queue powered by a Min-Heap data structure. O(log n) insert & extract-min operations.
          </p>
        </div>
        <button className="btn btn--secondary btn--sm" onClick={handleReset}>🔄 Reset Demo</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        {/* Left: Tree Visualization + Array */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Binary Tree SVG */}
          <div className="card" style={{ padding: '16px', minHeight: '340px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Heap Tree Visualization
              </span>
              <span className="badge badge--info">Size: {items.length}</span>
            </div>
            {items.length === 0 ? (
              <div className="empty-state" style={{ padding: '48px 0' }}>
                <div className="empty-state__icon">🌲</div>
                <h4 className="empty-state__title">Heap is empty</h4>
                <p className="empty-state__text">Insert tasks to build the priority tree.</p>
              </div>
            ) : (
              <svg viewBox="0 0 700 340" style={{ width: '100%', height: 'auto' }}>
                {/* Edges */}
                {positions.map((pos, i) => {
                  if (i === 0) return null;
                  const parentIdx = Math.floor((i - 1) / 2);
                  const parent = positions[parentIdx];
                  return (
                    <line key={`e-${i}`} x1={parent.x} y1={parent.y} x2={pos.x} y2={pos.y}
                      stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                  );
                })}
                {/* Nodes */}
                {positions.map((pos, i) => {
                  const item = items[i];
                  const isHighlight = highlightIdx === i;
                  const uc = urgencyColor(item.urgency);
                  return (
                    <g key={`n-${i}`}>
                      <circle cx={pos.x} cy={pos.y} r="24"
                        fill={isHighlight ? uc.bg : 'rgba(255,255,255,0.03)'}
                        stroke={isHighlight ? uc.color : 'rgba(255,255,255,0.10)'}
                        strokeWidth={isHighlight ? 2 : 1}
                        style={{ transition: 'all 0.3s ease' }}
                      />
                      <text x={pos.x} y={pos.y - 4} textAnchor="middle" fill={uc.color}
                        fontSize="13" fontWeight="700" fontFamily="Inter, sans-serif">
                        {item.priority}
                      </text>
                      <text x={pos.x} y={pos.y + 10} textAnchor="middle" fill="rgba(255,255,255,0.4)"
                        fontSize="8" fontFamily="Inter, sans-serif">
                        {item.name.length > 12 ? item.name.substring(0, 11) + '…' : item.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Array Representation */}
          <div className="card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>
              Heap Array Representation
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {items.length === 0 ? (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>[ empty ]</span>
              ) : items.map((item, i) => {
                const uc = urgencyColor(item.urgency);
                return (
                  <div key={item.id} style={{
                    padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                    background: highlightIdx === i ? uc.bg : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${highlightIdx === i ? uc.border : 'var(--border)'}`,
                    color: uc.color,
                    transition: 'all 0.3s ease',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    [{i}] P{item.priority}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Complexity Card */}
          <div className="card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>
              Algorithmic Complexity — Min-Heap
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {[
                { op: 'Insert', time: 'O(log n)', icon: '➕' },
                { op: 'Extract Min', time: 'O(log n)', icon: '⬆️' },
                { op: 'Peek Min', time: 'O(1)', icon: '👁️' },
                { op: 'Build Heap', time: 'O(n)', icon: '🔧' },
              ].map(c => (
                <div key={c.op} style={{
                  padding: '10px', borderRadius: '8px', textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>{c.icon}</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '2px' }}>{c.op}</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-light)', fontFamily: 'JetBrains Mono, monospace' }}>{c.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Controls + Extracted */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Next Priority */}
          {heap.peek() && (
            <div className="card" style={{ padding: '16px', borderColor: urgencyColor(heap.peek().urgency).border }}>
              <span style={{ fontSize: '10.5px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                🎯 Next Priority Task (Peek)
              </span>
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{heap.peek().name}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: urgencyColor(heap.peek().urgency).bg, color: urgencyColor(heap.peek().urgency).color, borderColor: urgencyColor(heap.peek().urgency).border }}>
                    {heap.peek().urgency}
                  </span>
                  <span className="badge badge--neutral">P{heap.peek().priority}</span>
                  <span className="badge badge--info">{heap.peek().project}</span>
                </div>
              </div>
              <button className="btn btn--danger" onClick={handleExtract}
                style={{ width: '100%', marginTop: '12px' }}>
                ⬆️ Extract Min (Dequeue)
              </button>
            </div>
          )}

          {/* Insert Form */}
          <div className="card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '12px' }}>
              ➕ Enqueue New Task
            </span>
            {formError && <div className="login-card__error mb-8" style={{ fontSize: '11px', padding: '6px 10px' }}>{formError}</div>}
            <form onSubmit={handleInsert} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input className="form-input" value={taskName} onChange={e => setTaskName(e.target.value)}
                placeholder="Task name" style={{ fontSize: '12px', padding: '8px 10px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '10.5px', marginBottom: '3px' }}>Priority (1–10)</label>
                  <input className="form-input" type="number" min="1" max="10" value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value)} style={{ fontSize: '12px', padding: '8px 10px' }} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '10.5px', marginBottom: '3px' }}>Urgency</label>
                  <select className="form-select" value={taskUrgency} onChange={e => setTaskUrgency(e.target.value)}
                    style={{ fontSize: '12px', padding: '8px 10px' }}>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>
              <input className="form-input" value={taskProject} onChange={e => setTaskProject(e.target.value)}
                placeholder="Project ID (optional)" style={{ fontSize: '12px', padding: '8px 10px' }} />
              <button className="btn btn--primary" type="submit" style={{ width: '100%' }}>Insert into Heap</button>
            </form>
          </div>

          {/* Extracted History */}
          <div className="card" style={{ padding: '16px', flex: 1, overflow: 'auto' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>
              📤 Extracted Tasks ({extracted.length})
            </span>
            {extracted.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                No tasks extracted yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {extracted.map((t, i) => {
                  const uc = urgencyColor(t.urgency);
                  return (
                    <div key={`${t.id}-${i}`} style={{
                      padding: '8px 10px', borderRadius: '6px', fontSize: '11.5px',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{t.name}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10.5px', color: uc.color }}>P{t.priority}</span>
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
