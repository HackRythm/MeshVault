import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import Dashboard from './components/Dashboard';
import ProjectHub from './components/ProjectHub';
import SprintOptimizer from './components/SprintOptimizer';
import AuditTrail from './components/AuditTrail';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl accent-gradient flex items-center justify-center mx-auto mb-4 animate-pulse-soft shadow-glow-lg">
            <span className="text-white font-bold text-2xl">MV</span>
          </div>
          <p className="text-muted text-sm animate-pulse">Loading MeshVault...</p>
        </div>
      </div>
    );
  }

  // Show auth modal if not logged in
  if (!isAuthenticated) {
    return <AuthModal />;
  }

  // Main authenticated layout
  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard onNavigate={setActiveView} />;
      case 'projects':  return <ProjectHub />;
      case 'sprint':    return <SprintOptimizer />;
      case 'audit':     return <AuditTrail />;
      default:          return <Dashboard onNavigate={setActiveView} />;
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <div className="ml-64">
        <Navbar activeView={activeView} />
        <main className="p-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
