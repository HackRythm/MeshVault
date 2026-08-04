import { HiViewGrid, HiCollection, HiLightningBolt, HiShieldCheck, HiLogout } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <HiViewGrid /> },
  { id: 'projects', label: 'Project Hub', icon: <HiCollection /> },
  { id: 'sprint', label: 'Sprint Optimizer', icon: <HiLightningBolt /> },
  { id: 'audit', label: 'Audit Trail', icon: <HiShieldCheck /> },
];

export default function Sidebar({ activeView, onNavigate }) {
  const { logout, user } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center">
            <span className="text-white font-bold text-sm">MV</span>
          </div>
          <div>
            <h1 className="text-heading font-bold text-base tracking-tight">MeshVault</h1>
            <p className="text-muted text-[10px] uppercase tracking-widest">Academic Tracker</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-4 pb-2 text-[10px] uppercase tracking-widest text-muted font-medium">Navigation</p>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
              transition-all duration-200
              ${activeView === item.id
                ? 'bg-accent/10 text-accent border-l-2 border-accent pl-[14px]'
                : 'text-muted hover:bg-surface-hover hover:text-body'
              }
            `}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* DSA Engine Status */}
      <div className="px-4 pb-3">
        <div className="bg-canvas rounded-xl p-3 border border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted font-medium mb-2">DSA Engines</p>
          <div className="space-y-1.5">
            {['MinHeap PQ', 'AVL Tree', 'Merkle SHA-256', 'Knapsack DP', 'Trie Search'].map((engine) => (
              <div key={engine} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
                <span className="text-xs text-body">{engine}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User & Logout */}
      <div className="px-3 pb-4 border-t border-border pt-3">
        <div className="flex items-center gap-3 px-3">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-accent text-sm font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-heading truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-muted truncate">{user?.email || ''}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-muted hover:text-alert rounded-lg hover:bg-alert/10 transition-colors"
            title="Logout"
          >
            <HiLogout className="text-lg" />
          </button>
        </div>
      </div>
    </aside>
  );
}
