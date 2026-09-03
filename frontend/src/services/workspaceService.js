import api from './api';

const workspaceService = {
  async getWorkspaces(userId, role) {
    return api.get(`/api/workspaces`);
  },

  async getWorkspace(id, userId, role) {
    return api.get(`/api/workspaces/${id}`);
  },

  async createWorkspace(userId, data) {
    return api.post(`/api/workspaces`, data);
  },

  async getWorkspaceAccess(id) {
    return api.get(`/api/workspaces/${id}/access`);
  },

  async updateWorkspaceAccess(id, data) {
    return api.post(`/api/workspaces/${id}/access`, data);
  },

  async getGradingScheme(id) {
    return api.get(`/api/workspaces/${id}/grading-scheme`);
  },

  async saveGradingScheme(id, data) {
    return api.post(`/api/workspaces/${id}/grading-scheme`, data);
  },

  async getWorkspaceStudentGrades(id) {
    return api.get(`/api/workspaces/${id}/student-grades`);
  },

  async joinWorkspace(workspaceCode) {
    return api.post(`/api/workspaces/join`, { workspace_code: workspaceCode });
  },

  async getJoinRequests(workspaceId) {
    return api.get(`/api/workspaces/${workspaceId}/join-requests`);
  },

  async approveJoinRequest(workspaceId, requestId) {
    return api.post(`/api/workspaces/${workspaceId}/join-requests/${requestId}/approve`);
  },

  async rejectJoinRequest(workspaceId, requestId, reason) {
    return api.post(`/api/workspaces/${workspaceId}/join-requests/${requestId}/reject`, { reason });
  },
};

export default workspaceService;
