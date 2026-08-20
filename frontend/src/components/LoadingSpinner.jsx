import React from 'react';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="loading">
      <div className="spinner"></div>
      <span>{message}</span>
    </div>
  );
}
