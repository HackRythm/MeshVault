import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('meshvault_token');
    const savedUser = localStorage.getItem('meshvault_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('meshvault_token');
        localStorage.removeItem('meshvault_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await authApi.login({ email, password });
      localStorage.setItem('meshvault_token', data.token);
      localStorage.setItem('meshvault_user', JSON.stringify(data.user));
      setUser(data.user);
      return data;
    } catch (err) {
      // If server is unreachable or fails, fallback to demo mode if desired
      throw err;
    }
  };

  const loginDemo = () => {
    const demoUser = {
      _id: 'demo-user-123',
      name: 'Hashwin M (Demo)',
      email: 'hashwin@university.edu',
      workspaces: []
    };
    localStorage.setItem('meshvault_token', 'demo-token-xyz');
    localStorage.setItem('meshvault_user', JSON.stringify(demoUser));
    setUser(demoUser);
  };

  const register = async (name, email, password) => {
    try {
      const { data } = await authApi.register({ name, email, password });
      localStorage.setItem('meshvault_token', data.token);
      localStorage.setItem('meshvault_user', JSON.stringify(data.user));
      setUser(data.user);
      return data;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('meshvault_token');
    localStorage.removeItem('meshvault_user');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    loginDemo,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
