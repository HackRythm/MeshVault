import React from 'react';

export function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-400">
      <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      {message && <span className="text-xs font-medium text-zinc-400">{message}</span>}
    </div>
  );
}

export default LoadingSpinner;
