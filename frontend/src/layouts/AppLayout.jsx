import React from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

export default function AppLayout({ title, children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-layout__content">
        <Navbar title={title} />
        <main className="app-layout__main">
          {children}
        </main>
      </div>
    </div>
  );
}
