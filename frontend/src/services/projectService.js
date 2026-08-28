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

  /** Get project detail scoped to a specific workspace (faculty evaluation view) */
  async getWorkspaceProject(workspaceId, projectId) {
    return api.get(`/api/workspaces/${workspaceId}/projects/${projectId}`);
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

  /** Legacy: global comments (no workspace scope). Kept for backward compat. */
  async getReviewComments(projectId) {
    return api.get(`/api/projects/${projectId}/comments`);
  },

  // ─── Workspace-scoped comment methods ───────────────────────────────────────

  /** Get workspace-scoped comments for a project.
   *  Visible only to: workspace host + members of that project's group.
   */
  async getWorkspaceComments(workspaceId, projectId) {
    return api.get(`/api/workspaces/${workspaceId}/projects/${projectId}/comments`);
  },

  /** Post a review comment (Faculty only). */
  async addWorkspaceComment(workspaceId, projectId, commentText) {
    return api.post(
      `/api/workspaces/${workspaceId}/projects/${projectId}/comments`,
      { comment: commentText }
    );
  },

  /** Reply to a review comment (Faculty and group-member students). */
  async replyToComment(workspaceId, projectId, commentId, replyText) {
    return api.post(
      `/api/workspaces/${workspaceId}/projects/${projectId}/comments/${commentId}/reply`,
      { comment: replyText }
    );
  },

  // ─── Evaluation (grading history) methods ────────────────────────────────────

  /** List all grading history for a project in a workspace. Faculty only. */
  async getEvaluations(workspaceId, projectId) {
    return api.get(`/api/workspaces/${workspaceId}/projects/${projectId}/evaluations`);
  },

  /** Get the most recent evaluation. Faculty only. */
  async getLatestEvaluation(workspaceId, projectId) {
    return api.get(`/api/workspaces/${workspaceId}/projects/${projectId}/evaluations/latest`);
  },

  /** Submit a new grading evaluation (appends to history). Faculty only. */
  async submitEvaluation(workspaceId, projectId, data) {
    return api.post(
      `/api/workspaces/${workspaceId}/projects/${projectId}/evaluations`,
      data
    );
  },

  // ─── Per-Student Grading Methods ─────────────────────────────────────────────

  /** List all student grades (full history, all students). Faculty only. */
  async getStudentGrades(workspaceId, projectId) {
    return api.get(`/api/workspaces/${workspaceId}/projects/${projectId}/student-grades`);
  },

  /** Submit an append-only grade for one student. Faculty only. */
  async submitStudentGrade(workspaceId, projectId, data) {
    return api.post(
      `/api/workspaces/${workspaceId}/projects/${projectId}/student-grades`,
      data
    );
  },

  /** Release a specific student grade record. Faculty only. */
  async releaseStudentGrade(workspaceId, projectId, gradeId) {
    return api.post(
      `/api/workspaces/${workspaceId}/projects/${projectId}/student-grades/${gradeId}/release`
    );
  },

  /** Get current student's own released grades. Student only. */
  async getMyGrade(workspaceId, projectId) {
    return api.get(`/api/workspaces/${workspaceId}/projects/${projectId}/my-grade`);
  },
};

export default projectService;
