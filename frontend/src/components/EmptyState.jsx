import React from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No data available',
  description = '',
  action,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center border border-dashed border-zinc-800 rounded-lg bg-[#0c0c0e]/50 ${className}`}>
      <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-2.5">
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs font-medium text-zinc-300">{title}</p>
      {description && <p className="text-[11px] text-zinc-500 mt-0.5 max-w-sm">{description}</p>}
      {action && <div className="mt-3.5">{action}</div>}
    </div>
  );
}

export default EmptyState;
