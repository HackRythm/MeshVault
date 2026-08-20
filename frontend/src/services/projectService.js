import api from './api';

const projectService = {
  async getProjects(workspaceId, groupId, userId, role) {
    const p = new URLSearchParams();
    if (workspaceId) p.append('workspace_id', workspaceId);
    if (groupId)     p.append('group_id', groupId);
    if (userId)      p.append('user_id', userId);
    if (role)        p.append('role', role);
    return api.get(`/api/projects?${p}`);
  },

  async getProject(projectId) {
    return api.get(`/api/projects/${projectId}`);
  },

  async createProject(data) {
    return api.post('/api/projects', data);
  },

  async updateProject(projectId, data) {
    return api.put(`/api/projects/${projectId}`, data);
  },

  async deleteProject(projectId) {
    return api.delete(`/api/projects/${projectId}`);
  },

  async addMilestone(projectId, data) {
    return api.post(`/api/projects/${projectId}/milestones`, data);
  },

  async getDashboard(userId, role) {
    const p = new URLSearchParams();
    if (userId) p.append('user_id', userId);
    if (role)   p.append('role', role);
    return api.get(`/api/dashboard?${p}`);
  },

  async getProgressRange(min, max, userId, role) {
    const p = new URLSearchParams();
    p.append('min', min);
    p.append('max', max);
    if (userId) p.append('user_id', userId);
    if (role)   p.append('role', role);
    return api.get(`/api/progress/range?${p}`);
  },

  async getReviewQueue(workspaceId) {
    const p = new URLSearchParams();
    if (workspaceId) p.append('workspace_id', workspaceId);
    return api.get(`/api/review-queue?${p}`);
  },

  async getReviewQueueNext(workspaceId) {
    const p = new URLSearchParams();
    if (workspaceId) p.append('workspace_id', workspaceId);
    return api.get(`/api/review-queue/next?${p}`);
  },

  async submitReviewRequest(data) {
    return api.post('/api/review-queue', data);
  },

  async processReviewRequest() {
    return api.post('/api/review-queue/process');
  },
};

export default projectService;
