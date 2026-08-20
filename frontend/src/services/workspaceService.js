import api from './api';

const workspaceService = {
  async getWorkspaces(userId, role) {
    const p = new URLSearchParams();
    if (userId) p.append('user_id', userId);
    if (role)   p.append('role', role);
    return api.get(`/api/workspaces?${p}`);
  },

  async getWorkspace(id, userId, role) {
    const p = new URLSearchParams();
    if (userId) p.append('user_id', userId);
    if (role)   p.append('role', role);
    return api.get(`/api/workspaces/${id}?${p}`);
  },

  async createWorkspace(userId, data) {
    return api.post(`/api/workspaces?user_id=${userId}`, data);
  },
};

export default workspaceService;
