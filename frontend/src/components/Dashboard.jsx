import { useState, useEffect } from 'react';
import StatCard from './ui/StatCard';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { dsaApi, projectApi, logApi } from '../services/api';
import { HiCollection, HiClock, HiShieldCheck, HiLightningBolt, HiArrowRight } from 'react-icons/hi';

export default function Dashboard({ onNavigate }) {
  const [deadlines, setDeadlines] = useState([]);
  const [stats, setStats] = useState({ projects: 0, deadlines: 0, verified: 0, efficiency: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch projects
      let projectCount = 0;
      try {
        const { data } = await projectApi.getAll();
        projectCount = data.projects?.length || 0;
      } catch { /* backend may not be running */ }

      // Fetch logs
      let logs = [];
      try {
        const { data } = await logApi.getAll(10);
        logs = data.logs || [];
      } catch { /* ok */ }

      // Fetch deadlines from DSA engine
      let deadlineData = [];
      try {
        const { data } = await dsaApi.getDeadlines();
        deadlineData = data.deadlines || [];
      } catch { /* ok */ }

      // If no deadlines seeded, seed some sample ones
      if (deadlineData.length === 0) {
        const now = Date.now() / 1000;
        const sampleDeadlines = [
          { id: '1', title: 'AVL Tree Implementation Report', deadline: now + 86400 * 2, project: 'Advanced DSA', priority: 'high' },
          { id: '2', title: 'Merkle Tree Verification Demo', deadline: now + 86400 * 5, project: 'Cryptography', priority: 'critical' },
          { id: '3', title: 'Knapsack Optimization Paper', deadline: now + 86400 * 8, project: 'Algorithm Design', priority: 'medium' },
          { id: '4', title: 'Sprint Planning Presentation', deadline: now + 86400 * 12, project: 'Software Eng', priority: 'low' },
          { id: '5', title: 'Trie Search Benchmarks', deadline: now + 86400 * 15, project: 'Data Structures', priority: 'medium' },
        ];
        try {
          await dsaApi.addDeadlines(sampleDeadlines);
          const { data } = await dsaApi.getDeadlines();
          deadlineData = data.deadlines || [];
        } catch { deadlineData = sampleDeadlines; }
      }

      setDeadlines(deadlineData);
      setRecentLogs(logs);
      setStats({
        projects: projectCount,
        deadlines: deadlineData.length,
        verified: logs.filter(l => l.verified).length,
        efficiency: 87.5,
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDeadline = (timestamp) => {
    const now = Date.now() / 1000;
    const diff = timestamp - now;
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);

    if (diff < 0) return { text: 'Overdue', variant: 'alert', urgent: true };
    if (days === 0) return { text: `${hours}h left`, variant: 'alert', urgent: true };
    if (days <= 3) return { text: `${days}d ${hours}h`, variant: 'warning', urgent: false };
    return { text: `${days} days`, variant: 'accent', urgent: false };
  };

  const priorityColors = {
    critical: 'alert',
    high: 'warning',
    medium: 'accent',
    low: 'muted',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<HiCollection />}
          label="Total Projects"
          value={stats.projects}
          trend="+2 this week"
          trendUp={true}
          color="accent"
        />
        <StatCard
          icon={<HiClock />}
          label="Upcoming Deadlines"
          value={stats.deadlines}
          trend="3 within 7 days"
          trendUp={false}
          color="warning"
        />
        <StatCard
          icon={<HiShieldCheck />}
          label="Verified Logs"
          value={stats.verified}
          trend="SHA-256 Merkle"
          trendUp={true}
          color="success"
        />
        <StatCard
          icon={<HiLightningBolt />}
          label="Sprint Efficiency"
          value={`${stats.efficiency}%`}
          trend="Knapsack DP"
          trendUp={true}
          color="accent"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Deadlines (MinHeap sorted) */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-heading">Priority Deadlines</h3>
              <p className="text-xs text-muted mt-0.5">Sorted by MinHeap Priority Queue</p>
            </div>
            <Badge variant="accent" icon="⚡">Min-Heap PQ</Badge>
          </div>

          <div className="space-y-3">
            {deadlines.slice(0, 5).map((item, i) => {
              const dl = formatDeadline(item.deadline);
              return (
                <Card key={item.id || i} className="flex items-center justify-between" padding="px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold
                      ${dl.urgent ? 'bg-alert/10 text-alert' : 'bg-accent/10 text-accent'}`}>
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-heading">{item.title}</h4>
                      <p className="text-xs text-muted mt-0.5">{item.project}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={priorityColors[item.priority] || 'accent'}>
                      {item.priority}
                    </Badge>
                    <Badge variant={dl.variant} pulse={dl.urgent}>
                      {dl.text}
                    </Badge>
                  </div>
                </Card>
              );
            })}

            {deadlines.length === 0 && !loading && (
              <Card hover={false} className="text-center py-8">
                <p className="text-muted">No deadlines yet. Create a project to get started!</p>
              </Card>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-heading">Recent Activity</h3>
            <button
              onClick={() => onNavigate('audit')}
              className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
            >
              View All <HiArrowRight />
            </button>
          </div>

          <div className="space-y-3">
            {recentLogs.length > 0 ? (
              recentLogs.slice(0, 6).map((log, i) => (
                <Card key={log._id || i} padding="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-accent text-xs font-semibold">
                        {log.user?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-body line-clamp-2">{log.content}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-muted">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                        {log.verified && (
                          <Badge variant="success">✓ Verified</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card hover={false} className="text-center py-8">
                <p className="text-muted text-sm">No activity yet.</p>
                <p className="text-muted text-xs mt-1">Create logs in the Audit Trail</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
