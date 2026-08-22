import api from './api';

const projectService = {
  async getProjects(workspaceId, groupId, userId, role) {
    const p = new URLSearchParams();
    if (workspaceId) p.append('workspace_id', workspaceId);
    if (groupId)     p.append('group_id', groupId);
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
    return api.get(`/api/dashboard`);
  },

  async getProgressRange(min, max, userId, role) {
    const p = new URLSearchParams();
    p.append('min', min);
    p.append('max', max);
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

  async getReviewComments(projectId) {
    return api.get(`/api/projects/${projectId}/comments`);
  },

  async addReviewComment(projectId, commentText) {
    return api.post(`/api/projects/${projectId}/comments`, { comment: commentText });
  },
};

export default projectService;
