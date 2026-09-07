import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Badge } from './ui/Badge';

export default function Navbar({ title }) {
  const { user } = useAuth();

  if (!user) return null;

  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
    : 'U';

  return (
    <header className="h-12 px-6 bg-[#0c0c0e] border-b border-zinc-800/80 flex items-center justify-between select-none flex-shrink-0">
      <div className="flex items-center gap-3">
        <h2 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 pl-3 border-l border-zinc-800">
          <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-[10px] font-mono font-medium text-zinc-200">
            {initials}
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-xs font-medium text-zinc-200">{user.name}</span>
              <Badge variant={user.role} size="xs">{user.role}</Badge>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 mt-0.5 leading-none">{user.user_id}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
