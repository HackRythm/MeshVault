import api from './api';

const groupService = {
  async getGroups(workspaceId, userId, role) {
    const p = new URLSearchParams();
    if (workspaceId) p.append('workspace_id', workspaceId);
    if (userId)      p.append('user_id', userId);
    if (role)        p.append('role', role);
    return api.get(`/api/groups?${p}`);
  },

  async getGroup(id) {
    return api.get(`/api/groups/${id}`);
  },

  async createGroup(name, code, description) {
    return api.post('/api/groups', { name, code, description });
  },

  async joinGroup(code) {
    return api.post('/api/groups/join', { code });
  },

  async promoteToLeader(groupId, userId) {
    return api.post(`/api/groups/${groupId}/promote`, { user_id: userId });
  },

  async removeMember(groupId, userId) {
    return api.delete(`/api/groups/${groupId}/members/${userId}`);
  },

  async deleteGroup(groupId) {
    return api.delete(`/api/groups/${groupId}`);
  }
};

export default groupService;
