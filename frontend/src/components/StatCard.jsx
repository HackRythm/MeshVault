import React from 'react';

export function StatCard({ label, value, subtext, badge, className = '' }) {
  return (
    <div className={`p-3.5 bg-[#0c0c0e] border border-zinc-800 rounded-lg flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
          {label}
        </span>
        {badge && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-zinc-100 tabular-nums">
          {value}
        </span>
        {subtext && (
          <span className="text-[11px] text-zinc-500 truncate">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}

export default StatCard;
