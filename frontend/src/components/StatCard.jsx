import React from 'react';

export default function StatCard({ label, value, icon, color }) {
  const getBgColor = () => {
    switch (color) {
      case 'success': return 'rgba(0, 206, 201, 0.1)';
      case 'warning': return 'rgba(253, 203, 110, 0.1)';
      case 'error': return 'rgba(255, 107, 107, 0.1)';
      case 'info': return 'rgba(116, 185, 255, 0.1)';
      default: return 'var(--accent-glow)';
    }
  };

  const getTextColor = () => {
    switch (color) {
      case 'success': return 'var(--clr-success)';
      case 'warning': return 'var(--clr-warning)';
      case 'error': return 'var(--clr-error)';
      case 'info': return 'var(--clr-info)';
      default: return 'var(--accent-light)';
    }
  };

  return (
    <div className="stat-card">
      <div className="stat-card__icon" style={{ backgroundColor: getBgColor(), color: getTextColor() }}>
        {icon}
      </div>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}
