import React from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

export default function AppLayout({ title, children }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-zinc-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar title={title} />
        <main className="flex-1 overflow-y-auto px-6 py-5 bg-[#09090b]">
          <div className="max-w-7xl mx-auto space-y-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
