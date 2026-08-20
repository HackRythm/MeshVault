import api from './api';

const searchService = {
  async searchProjects(query, userId, role) {
    const p = new URLSearchParams();
    p.append('q', query);
    if (userId) p.append('user_id', userId);
    if (role)   p.append('role', role);
    return api.get(`/api/search/projects?${p}`);
  },
};

export default searchService;
