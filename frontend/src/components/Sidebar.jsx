import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Users,
  FolderGit2,
  GraduationCap,
  Search,
  Zap,
  TrendingUp,
  Clock,
  ClipboardList,
  History,
  GitBranch,
  User,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import projectService from '../services/projectService';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  useEffect(() => {
    if (!user || user.role !== 'STAFF') return;

    const checkPendingReviews = async () => {
      try {
        const res = await projectService.getReviewQueueCount();
        setPendingReviewCount(res.count || 0);
      } catch (err) {
        // Silently ignore background polling errors
      }
    };

    checkPendingReviews();
    const interval = setInterval(checkPendingReviews, 6000);
    return () => clearInterval(interval);
  }, [user]);

  const coreNav = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/workspace', label: 'Workspace', icon: Layers },
    { path: '/groups', label: 'Groups', icon: Users },
    { path: '/projects', label: 'Projects', icon: FolderGit2 },
    ...(user?.role === 'STUDENT' ? [{ path: '/my-grades', label: 'My Results', icon: GraduationCap }] : []),
    { path: '/search', label: 'Smart Search', icon: Search },
  ];

  const dsaNav = [
    { path: '/priority-engine', label: 'Priority Engine', icon: Zap },
    { path: '/progress-analytics', label: 'Progress Analytics', icon: TrendingUp },
    { path: '/sprint-optimizer', label: 'Sprint Optimizer', icon: Clock },
    ...(user?.role === 'STAFF' ? [{
      path: '/review-queue',
      label: 'Review Queue',
      icon: ClipboardList,
      badge: pendingReviewCount > 0 ? pendingReviewCount : null,
    }] : []),
    { path: '/audit-trail', label: 'Audit Trail', icon: History },
    ...(user?.role === 'STUDENT' ? [{ path: '/github', label: 'GitHub Sync', icon: GitBranch }] : []),
  ];

  const renderLink = (item) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) =>
          `flex items-center gap-2.5 px-3 py-1.5 text-xs rounded transition-colors ${
            isActive
              ? 'bg-zinc-800/80 text-zinc-100 font-medium border-l-2 border-blue-500 pl-2.5'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 font-normal'
          }`
        }
      >
        <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
        <span className="truncate flex-1">{item.label}</span>
        {item.badge != null && (
          <span className="ml-auto font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50">
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <aside className="w-56 bg-[#0c0c0e] border-r border-zinc-800/80 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="h-12 px-4 border-b border-zinc-800/80 flex items-center gap-2.5">
        <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-[11px] font-bold text-white tracking-wider">
          M
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-semibold text-xs tracking-tight text-zinc-100">MeshVault</span>
          <span className="text-[10px] font-mono text-zinc-400">v1.0</span>
        </div>
      </div>

      {/* Navigation list */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {/* Core Modules */}
        <div>
          <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Core Modules
          </div>
          <nav className="space-y-0.5">
            {coreNav.map(renderLink)}
          </nav>
        </div>

        {/* Other Modules */}
        <div className="pt-2 border-t border-zinc-800/60">
          <nav className="space-y-0.5">
            {dsaNav.map(renderLink)}
          </nav>
        </div>
      </div>

      {/* Bottom Profile & Logout */}
      <div className="p-2 border-t border-zinc-800/80 space-y-0.5">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-1.5 text-xs rounded transition-colors ${
              isActive
                ? 'bg-zinc-800/80 text-zinc-100 font-medium border-l-2 border-blue-500 pl-2.5'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`
          }
        >
          <User className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
          <span className="truncate">Profile</span>
        </NavLink>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs rounded text-zinc-400 hover:text-rose-300 hover:bg-rose-950/20 transition-colors text-left"
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
