const variants = {
  primary:   'bg-accent text-white hover:bg-accent-hover shadow-glow hover:shadow-glow-lg',
  secondary: 'bg-surface border border-border text-body hover:bg-surface-hover hover:border-accent/30',
  danger:    'bg-alert/10 text-alert border border-alert/20 hover:bg-alert/20',
  success:   'bg-success/10 text-success border border-success/20 hover:bg-success/20',
  ghost:     'text-muted hover:text-body hover:bg-surface-hover',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg
        font-medium transition-all duration-200 cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-[0.97]
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="text-base">{icon}</span>
      ) : null}
      {children}
      {iconRight && <span className="text-base">{iconRight}</span>}
    </button>
  );
}
