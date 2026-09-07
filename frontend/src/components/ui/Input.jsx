import React from 'react';

export function Input({
  label,
  error,
  helper,
  className = '',
  mono = false,
  ...props
}) {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-[#121215] text-zinc-100 placeholder-zinc-500 text-xs px-3 py-2 rounded-md border border-zinc-800 transition-colors focus:border-blue-500/60 focus:outline-none focus:ring-1 focus:ring-blue-500/30 disabled:opacity-50 disabled:bg-zinc-900 disabled:cursor-not-allowed ${mono ? 'font-mono' : ''} ${error ? 'border-rose-500/60 focus:border-rose-500' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-[11px] text-rose-400 font-medium">{error}</span>}
      {helper && !error && <span className="text-[11px] text-zinc-500">{helper}</span>}
    </div>
  );
}

export function Select({
  label,
  error,
  helper,
  children,
  className = '',
  ...props
}) {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        className={`w-full bg-[#121215] text-zinc-100 text-xs px-3 py-2 rounded-md border border-zinc-800 transition-colors focus:border-blue-500/60 focus:outline-none focus:ring-1 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-rose-500/60 focus:border-rose-500' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-[11px] text-rose-400 font-medium">{error}</span>}
      {helper && !error && <span className="text-[11px] text-zinc-500">{helper}</span>}
    </div>
  );
}

export function Textarea({
  label,
  error,
  helper,
  className = '',
  rows = 3,
  ...props
}) {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={`w-full bg-[#121215] text-zinc-100 placeholder-zinc-500 text-xs px-3 py-2 rounded-md border border-zinc-800 transition-colors focus:border-blue-500/60 focus:outline-none focus:ring-1 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-rose-500/60 focus:border-rose-500' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-[11px] text-rose-400 font-medium">{error}</span>}
      {helper && !error && <span className="text-[11px] text-zinc-500">{helper}</span>}
    </div>
  );
}
