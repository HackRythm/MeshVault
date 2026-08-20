import React from 'react';

export default function EmptyState({ icon = '📭', title = 'No data available', text = 'There is nothing to display here yet.' }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <h4 className="empty-state__title">{title}</h4>
      <p className="empty-state__text">{text}</p>
    </div>
  );
}
