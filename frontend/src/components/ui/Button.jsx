import React from 'react';

const variants = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-none border border-blue-500/50 focus-visible:ring-2 focus-visible:ring-blue-500/30',
  secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium border border-zinc-700/60 focus-visible:ring-2 focus-visible:ring-zinc-600',
  ghost: 'bg-transparent hover:bg-zinc-800/80 text-zinc-300 hover:text-zinc-100 font-normal focus-visible:ring-2 focus-visible:ring-zinc-700',
  outline: 'bg-transparent hover:bg-zinc-800/50 text-zinc-200 border border-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-600',
  destructive: 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 focus-visible:ring-2 focus-visible:ring-rose-500/40',
};

const sizes = {
  xs: 'px-2 py-1 text-[11px] gap-1 rounded',
  sm: 'px-2.5 py-1.5 text-xs gap-1.5 rounded-md',
  md: 'px-3.5 py-2 text-xs gap-2 rounded-md',
  lg: 'px-4 py-2.5 text-sm gap-2 rounded-md',
};

export function Button({
  children,
  variant = 'secondary',
  size = 'sm',
  className = '',
  disabled = false,
  loading = false,
  icon: Icon,
  type = 'button',
  onClick,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center transition-colors select-none outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variants[variant] || variants.secondary} ${sizes[size] || sizes.sm} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : Icon ? (
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      ) : null}
      {children}
    </button>
  );
}

export default Button;
