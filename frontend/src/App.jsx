import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import CreateProject from './pages/CreateProject';
import EditProject from './pages/EditProject';
import SmartSearch from './pages/SmartSearch';
import Profile from './pages/Profile';
import Building from './pages/Building';
import ProgressAnalytics from './pages/ProgressAnalytics';
import ReviewQueue from './pages/ReviewQueue';

// Protected Route Wrapper
function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/workspace" element={<PrivateRoute><Workspace /></PrivateRoute>} />
      <Route path="/groups" element={<PrivateRoute><Groups /></PrivateRoute>} />
      <Route path="/groups/:id" element={<PrivateRoute><GroupDetail /></PrivateRoute>} />
      <Route path="/projects" element={<PrivateRoute><Projects /></PrivateRoute>} />
      <Route path="/projects/new" element={<PrivateRoute><CreateProject /></PrivateRoute>} />
      <Route path="/projects/:projectId" element={<PrivateRoute><ProjectDetail /></PrivateRoute>} />
      <Route path="/projects/:projectId/edit" element={<PrivateRoute><EditProject /></PrivateRoute>} />
      <Route path="/search" element={<PrivateRoute><SmartSearch /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

      {/* Unimplemented modules showing Building page */}
      <Route path="/priority-engine" element={<PrivateRoute><Building title="Priority Engine" /></PrivateRoute>} />
      <Route path="/progress-analytics" element={<PrivateRoute><ProgressAnalytics /></PrivateRoute>} />
      <Route path="/sprint-optimizer" element={<PrivateRoute><Building title="Sprint Optimizer" /></PrivateRoute>} />
      <Route path="/audit-trail" element={
        <PrivateRoute>
          {user && user.role === 'STAFF' ? <ReviewQueue /> : <Building title="Audit Trail" />}
        </PrivateRoute>
      } />
      <Route path="/algorithm-lab" element={<PrivateRoute><Building title="Algorithm Lab" /></PrivateRoute>} />

      {/* Redirect fallbacks */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
