import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = authService.getCurrentUser();
    if (saved) setUser(saved);
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res.success) setUser(res.user);
    return res;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
