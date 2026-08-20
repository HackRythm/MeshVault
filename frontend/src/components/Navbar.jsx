import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ title }) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <header className="navbar">
      <h2 className="navbar__title">{title}</h2>
      <div className="navbar__right">
        <div className="navbar__user">
          <div className="navbar__avatar">
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
          </div>
          <div>
            <div className="navbar__name">{user.name}</div>
            <div className="navbar__role">{user.role} • {user.user_id}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
