import React from 'react';

// Semantic muted color mapping for status, priority, roles, etc.
const badgeStyles = {
  // Statuses
  COMPLETED: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
  RELEASED: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
  APPROVED: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
  SUCCESS: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
  
  IN_PROGRESS: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
  PENDING: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
  WAITING: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
  
  NOT_STARTED: 'bg-zinc-900 text-zinc-400 border-zinc-800',
  DRAFT: 'bg-zinc-900 text-zinc-400 border-zinc-800',
  
  REJECTED: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
  ERROR: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
  FAILED: 'bg-rose-950/40 text-rose-300 border-rose-800/40',

  // Priorities
  CRITICAL: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
  HIGH: 'bg-orange-950/40 text-orange-300 border-orange-800/40',
  MEDIUM: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
  LOW: 'bg-zinc-900 text-zinc-400 border-zinc-800',

  // Roles
  STAFF: 'bg-blue-950/40 text-blue-300 border-blue-800/40',
  STUDENT: 'bg-zinc-900 text-zinc-300 border-zinc-700/60',
  LEADER: 'bg-sky-950/40 text-sky-300 border-sky-800/40',
  MEMBER: 'bg-zinc-900 text-zinc-400 border-zinc-800',

  // Default / Neutral
  default: 'bg-zinc-900 text-zinc-300 border-zinc-800',
  neutral: 'bg-zinc-900 text-zinc-400 border-zinc-800',
  accent: 'bg-blue-950/40 text-blue-300 border-blue-800/40',
};

export function Badge({
  children,
  variant,
  type, // alias for variant
  size = 'sm',
  className = '',
  dot = false,
  ...props
}) {
  const key = (variant || type || (typeof children === 'string' ? children.toUpperCase().replace(/\s+/g, '_') : 'default'));
  const style = badgeStyles[key] || badgeStyles[key?.toUpperCase()] || badgeStyles.default;
  const sizeCls = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded border tracking-wide uppercase select-none ${sizeCls} ${style} ${className}`}
      {...props}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

export default Badge;
