import React from 'react';

export function MetricsStrip({ metrics = [], className = '' }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800 border border-zinc-800 rounded-lg overflow-hidden ${className}`}>
      {metrics.map((m, idx) => (
        <div key={m.label || idx} className="bg-[#0c0c0e] p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
              {m.label}
            </span>
            {m.badge && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                {m.badge}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-100 tabular-nums">
              {m.value}
            </span>
            {m.subtext && (
              <span className="text-[11px] text-zinc-500 truncate">
                {m.subtext}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MetricsStrip;
