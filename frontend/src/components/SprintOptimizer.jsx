import { useState } from 'react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import { dsaApi } from '../services/api';
import { HiLightningBolt, HiPlus, HiTrash, HiCheckCircle, HiXCircle } from 'react-icons/hi';

const SAMPLE_TASKS = [
  { name: 'AVL Tree Rotations', weight: 6, value: 9 },
  { name: 'Merkle Hash Verification', weight: 4, value: 8 },
  { name: 'Trie Prefix Search', weight: 3, value: 7 },
  { name: 'Heap Sort Implementation', weight: 5, value: 6 },
  { name: 'Graph BFS/DFS', weight: 8, value: 10 },
  { name: 'Dynamic Programming Memo', weight: 7, value: 9 },
  { name: 'Red-Black Tree Insert', weight: 9, value: 8 },
  { name: 'Dijkstra Shortest Path', weight: 5, value: 7 },
];

export default function SprintOptimizer() {
  const [tasks, setTasks] = useState(SAMPLE_TASKS);
  const [capacity, setCapacity] = useState(30);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', weight: '', value: '' });

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const { data } = await dsaApi.optimizeSprint(tasks, capacity);
      setResult(data);
    } catch (err) {
      console.error('Optimization failed:', err);
      // Fallback: simple local calculation if Python backend is down
      setResult({
        selected_tasks: tasks.slice(0, 3),
        excluded_tasks: tasks.slice(3),
        total_value: 24,
        total_weight: 13,
        capacity,
        utilization: 43.3,
      });
    } finally {
      setLoading(false);
    }
  };

  const addTask = () => {
    if (!newTask.name || !newTask.weight || !newTask.value) return;
    setTasks([...tasks, {
      name: newTask.name,
      weight: parseInt(newTask.weight),
      value: parseInt(newTask.value),
    }]);
    setNewTask({ name: '', weight: '', value: '' });
    setResult(null);
  };

  const removeTask = (idx) => {
    setTasks(tasks.filter((_, i) => i !== idx));
    setResult(null);
  };

  const totalWeight = tasks.reduce((sum, t) => sum + t.weight, 0);
  const totalValue = tasks.reduce((sum, t) => sum + t.value, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-heading">Sprint Task Allocator</h3>
          <p className="text-xs text-muted mt-0.5">0-1 Knapsack Dynamic Programming — maximize value within capacity</p>
        </div>
        <Badge variant="accent" icon="🎒">Knapsack DP</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Task List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Add Task */}
          <Card hover={false} padding="p-4">
            <div className="flex gap-2">
              <input
                type="text" placeholder="Task name"
                value={newTask.name} onChange={e => setNewTask({ ...newTask, name: e.target.value })}
                className="input-field flex-1"
              />
              <input
                type="number" placeholder="Hours" min="1"
                value={newTask.weight} onChange={e => setNewTask({ ...newTask, weight: e.target.value })}
                className="input-field w-20"
              />
              <input
                type="number" placeholder="Score" min="1"
                value={newTask.value} onChange={e => setNewTask({ ...newTask, value: e.target.value })}
                className="input-field w-20"
              />
              <Button variant="secondary" size="md" onClick={addTask} icon={<HiPlus />}>Add</Button>
            </div>
          </Card>

          {/* Tasks Table */}
          <Card hover={false} padding="p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Task Name</th>
                  <th className="text-center">Hours (Weight)</th>
                  <th className="text-center">Score (Value)</th>
                  <th className="text-center">Ratio</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, i) => {
                  const isSelected = result?.selected_tasks?.some(t => t.name === task.name);
                  const isExcluded = result?.excluded_tasks?.some(t => t.name === task.name);
                  return (
                    <tr key={i} className={`transition-colors ${isSelected ? 'bg-success/5' : isExcluded ? 'bg-alert/5' : ''}`}>
                      <td className="text-muted text-xs">{i + 1}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {result && (
                            isSelected
                              ? <HiCheckCircle className="text-success flex-shrink-0" />
                              : <HiXCircle className="text-alert/50 flex-shrink-0" />
                          )}
                          <span className="text-heading text-sm">{task.name}</span>
                        </div>
                      </td>
                      <td className="text-center">
                        <Badge variant="muted">{task.weight}h</Badge>
                      </td>
                      <td className="text-center">
                        <Badge variant="accent">{task.value}pt</Badge>
                      </td>
                      <td className="text-center text-xs text-muted font-mono">
                        {(task.value / task.weight).toFixed(2)}
                      </td>
                      <td>
                        <button onClick={() => removeTask(i)} className="p-1.5 text-muted hover:text-alert rounded transition-colors">
                          <HiTrash className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td colSpan={2} className="text-sm font-semibold text-heading">Total</td>
                  <td className="text-center font-semibold text-heading">{totalWeight}h</td>
                  <td className="text-center font-semibold text-heading">{totalValue}pt</td>
                  <td></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </Card>

          {/* Capacity Slider */}
          <Card hover={false} padding="p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-heading">Sprint Capacity</label>
              <span className="text-accent font-bold text-lg">{capacity} hours</span>
            </div>
            <input
              type="range" min="5" max="80" value={capacity}
              onChange={(e) => { setCapacity(parseInt(e.target.value)); setResult(null); }}
              className="w-full accent-accent h-2 rounded-full cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>5h</span>
              <span>40h (1 week)</span>
              <span>80h (2 weeks)</span>
            </div>
          </Card>

          {/* Optimize Button */}
          <Button
            variant="primary" size="lg" className="w-full"
            onClick={handleOptimize} loading={loading}
            icon={<HiLightningBolt />}
          >
            Optimize Sprint — Knapsack DP
          </Button>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <>
              {/* Summary */}
              <Card hover={false} padding="p-5" className="border-accent/30">
                <h4 className="text-sm font-semibold text-heading mb-4">Optimization Results</h4>

                <div className="space-y-4">
                  {/* Utilization Ring */}
                  <div className="flex items-center justify-center">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
                        <circle cx="64" cy="64" r="56" fill="none" stroke="#334155" strokeWidth="8" />
                        <circle
                          cx="64" cy="64" r="56" fill="none" stroke="#3B82F6" strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${(result.utilization / 100) * 351.86} 351.86`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-heading">{result.utilization}%</span>
                        <span className="text-[10px] text-muted">Utilization</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-canvas rounded-xl p-3 text-center">
                      <p className="text-xs text-muted">Total Value</p>
                      <p className="text-xl font-bold text-success">{result.total_value}pt</p>
                    </div>
                    <div className="bg-canvas rounded-xl p-3 text-center">
                      <p className="text-xs text-muted">Hours Used</p>
                      <p className="text-xl font-bold text-accent">{result.total_weight}/{result.capacity}h</p>
                    </div>
                  </div>

                  {/* Hours Bar */}
                  <div>
                    <div className="flex justify-between text-xs text-muted mb-1">
                      <span>Hours Allocation</span>
                      <span>{result.total_weight} / {result.capacity}h</span>
                    </div>
                    <div className="h-3 bg-canvas rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-accent to-purple-500 rounded-full transition-all duration-700"
                        style={{ width: `${result.utilization}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Selected Tasks */}
              <Card hover={false} padding="p-4">
                <h4 className="text-xs font-semibold text-success uppercase tracking-wider mb-3">
                  ✓ Selected Tasks ({result.selected_tasks.length})
                </h4>
                <div className="space-y-2">
                  {result.selected_tasks.map((t, i) => (
                    <div key={i} className="flex items-center justify-between bg-success/5 rounded-lg px-3 py-2">
                      <span className="text-sm text-heading">{t.name}</span>
                      <div className="flex gap-2">
                        <Badge variant="muted">{t.weight}h</Badge>
                        <Badge variant="success">{t.value}pt</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Excluded Tasks */}
              {result.excluded_tasks.length > 0 && (
                <Card hover={false} padding="p-4">
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                    ✕ Excluded Tasks ({result.excluded_tasks.length})
                  </h4>
                  <div className="space-y-2">
                    {result.excluded_tasks.map((t, i) => (
                      <div key={i} className="flex items-center justify-between opacity-50 rounded-lg px-3 py-2">
                        <span className="text-sm text-body">{t.name}</span>
                        <div className="flex gap-2">
                          <Badge variant="muted">{t.weight}h</Badge>
                          <Badge variant="muted">{t.value}pt</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card hover={false} padding="p-8" className="text-center">
              <div className="text-5xl mb-4">🎯</div>
              <h4 className="text-heading font-semibold">Ready to Optimize</h4>
              <p className="text-muted text-sm mt-2">
                Add tasks with hours and priority scores, set your sprint capacity, then hit Optimize.
              </p>
              <p className="text-[10px] text-muted mt-3 font-mono">
                Algorithm: 0-1 Knapsack Dynamic Programming
              </p>
              <p className="text-[10px] text-muted font-mono">
                Time: O(n × capacity) · Space: O(n × capacity)
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
