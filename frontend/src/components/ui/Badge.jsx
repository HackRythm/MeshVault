const variants = {
  success: 'bg-success/10 text-success border border-success/20',
  alert:   'bg-alert/10 text-alert border border-alert/20',
  warning: 'bg-warning/10 text-warning border border-warning/20',
  accent:  'bg-accent/10 text-accent border border-accent/20',
  muted:   'bg-border/30 text-muted border border-border',
};

export default function Badge({ children, variant = 'accent', icon, className = '', pulse = false }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        ${variants[variant] || variants.accent}
        ${pulse ? 'animate-pulse-soft' : ''}
        ${className}
      `}
    >
      {icon && <span className="text-[10px]">{icon}</span>}
      {children}
    </span>
  );
}
