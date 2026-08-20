import React from 'react';

export default function BuildingScreen({ title }) {
  return (
    <div className="building-screen">
      <div className="building-screen__icon">🏗️</div>
      <h3 className="building-screen__title">{title}</h3>
      <p className="building-screen__text">
        This module is currently being developed. The underlying Data Structure or Algorithm engine will be integrated in the next release.
      </p>
    </div>
  );
}
