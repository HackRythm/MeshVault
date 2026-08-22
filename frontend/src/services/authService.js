import api from './api';

const SESSION_KEY = 'meshvault_session';

const authService = {
  async login(email, password) {
    const res = await api.post('/api/auth/login', { email, password });
    if (res.success && res.user) {
      const sessionData = { ...res.user, token: res.token };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    }
    return res;
  },

  async getStudents() {
    return api.get('/api/students');
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!this.getCurrentUser();
  },

  getRole() {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  },
};

export default authService;
