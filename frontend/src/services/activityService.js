import api from './api';

const activityService = {
  async getActivities(userId, role) {
    const p = new URLSearchParams();
    if (userId) p.append('user_id', userId);
    if (role)   p.append('role', role);
    return api.get(`/api/activities?${p}`);
  },
};

export default activityService;
