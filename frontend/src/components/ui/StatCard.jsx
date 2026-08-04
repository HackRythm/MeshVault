export default function StatCard({ icon, label, value, trend, trendUp, color = 'accent' }) {
  const colorClasses = {
    accent:  'text-accent bg-accent/10',
    success: 'text-success bg-success/10',
    alert:   'text-alert bg-alert/10',
    warning: 'text-warning bg-warning/10',
  };

  return (
    <div className="glass-card p-5 flex items-start gap-4 animate-fade-in">
      <div className={`p-3 rounded-xl ${colorClasses[color] || colorClasses.accent}`}>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-muted text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-heading mt-0.5">{value}</p>
        {trend && (
          <p className={`text-xs mt-1 ${trendUp ? 'text-success' : 'text-alert'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </p>
        )}
      </div>
    </div>
  );
}
