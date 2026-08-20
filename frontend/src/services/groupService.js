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
};

export default groupService;
