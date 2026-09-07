import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { MetricsStrip } from '../components/ui/MetricsStrip';
import { DataTable } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import projectService from '../services/projectService';
import { useAuth } from '../context/AuthContext';
import { Calendar, Activity, Users, ArrowUpRight } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await projectService.getDashboard(user.id, user.role);
        setStats(res);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <LoadingSpinner message="Loading dashboard metrics..." />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Dashboard">
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-md text-xs text-rose-300">
          {error}
        </div>
      </AppLayout>
    );
  }

  const metrics = [
    {
      label: 'Assigned Groups',
      value: stats?.total_groups || 0,
      subtext: 'active squads',
    },
    {
      label: user.role === 'STAFF' ? 'Registered Students' : 'Group Members',
      value: stats?.total_students || 0,
      subtext: user.role === 'STAFF' ? 'enrolled learners' : 'in your group',
    },
    {
      label: 'Projects Tracked',
      value: stats?.total_projects || 0,
      subtext: 'all repositories',
    },
    {
      label: 'In Progress',
      value: stats?.active_projects || 0,
      subtext: 'active developments',
      badge: 'LIVE',
    },
  ];

  const deadlineColumns = [
    {
      header: 'Project ID',
      accessor: 'project_id',
      isId: true,
      render: (val) => (
        <Link
          to={`/projects/${val}`}
          className="text-blue-400 hover:text-blue-300 hover:underline font-mono inline-flex items-center gap-1"
        >
          {val}
          <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
        </Link>
      ),
    },
    {
      header: 'Project Name',
      accessor: 'name',
      render: (val) => <span className="font-medium text-zinc-200">{val}</span>,
    },
    {
      header: 'Group',
      accessor: 'group_name',
      render: (val, row) => (
        <Link
          to={`/groups/${row.group_id}`}
          className="text-zinc-300 hover:text-zinc-100 hover:underline"
        >
          {val}
        </Link>
      ),
    },
    {
      header: 'Deadline',
      accessor: 'deadline',
      render: (val) => (
        <span className="text-zinc-400">
          {val ? new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      header: 'Progress',
      accessor: 'progress',
      align: 'right',
      render: (val) => {
        const pct = Math.round(val || 0);
        return (
          <div className="inline-flex items-center gap-2 justify-end">
            <span className="text-zinc-300 font-mono text-[11px] w-8 text-right">{pct}%</span>
            <div className="w-14 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <AppLayout title="Dashboard">
      {/* Metrics Strip */}
      <MetricsStrip metrics={metrics} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Upcoming Deadlines */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                Upcoming Deadlines
              </h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              {stats?.upcoming_deadlines?.length || 0} scheduled
            </span>
          </div>

          <DataTable
            columns={deadlineColumns}
            data={stats?.upcoming_deadlines || []}
            keyField="project_id"
            emptyMessage="No pending deadlines registered"
          />
        </div>

        {/* Right 1 Col: Recent Activities & Team Widget */}
        <div className="space-y-5">
          {/* Recent Activity Feed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-zinc-400" />
                <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                  Recent Activity
                </h3>
              </div>
              <Link to="/audit-trail" className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline">
                View All
              </Link>
            </div>

            <div className="border border-zinc-800 rounded-lg bg-[#0c0c0e] divide-y divide-zinc-800/60 overflow-hidden">
              {stats?.recent_activity?.length > 0 ? (
                stats.recent_activity.slice(0, 6).map((act) => (
                  <div key={act.id} className="p-3 text-xs flex gap-2.5 items-start hover:bg-zinc-900/30 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-300 leading-relaxed">
                        <strong className="text-zinc-100 font-medium">{act.user_name}</strong>{' '}
                        <span className="text-zinc-400">{act.message?.replace(/'[^']+'/g, '')}</span>
                        {act.project_id && (
                          <Link
                            to={`/projects/${act.project_id}`}
                            className="font-mono text-blue-400 hover:underline ml-1"
                          >
                            {act.project_id}
                          </Link>
                        )}
                      </p>
                      <span className="text-[10px] font-mono text-zinc-400 mt-1 block">
                        {act.created_at ? new Date(act.created_at).toLocaleString() : ''}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Activity}
                  title="No recent activities"
                  description="System actions and updates will appear here."
                  className="border-none py-6"
                />
              )}
            </div>
          </div>

          {/* Student Team Widget */}
          {user.role === 'STUDENT' && stats?.group_members?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                    My Team Roster
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">
                  {stats.group_members.length} peers
                </span>
              </div>

              <div className="border border-zinc-800 rounded-lg bg-[#0c0c0e] divide-y divide-zinc-800/60 overflow-hidden">
                {stats.group_members.map((member) => {
                  const isSelf = member.id === user.id;
                  const initials = member.name
                    ? member.name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
                    : 'U';
                  return (
                    <div
                      key={member.id}
                      className="p-2.5 flex items-center justify-between hover:bg-zinc-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-[10px] font-mono font-medium text-zinc-300">
                          {initials}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                            {member.name}
                            {isSelf && <Badge variant="default" size="xs">You</Badge>}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400">
                            {member.user_id}
                          </div>
                        </div>
                      </div>
                      {member.is_leader && (
                        <Badge variant="LEADER" size="xs">Leader</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
