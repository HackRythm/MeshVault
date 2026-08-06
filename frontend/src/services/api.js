import axios from 'axios';

// ─── Node.js Gateway (Auth, CRUD, MongoDB) ───────────────────────────

export const nodeApi = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Attach JWT token to every request
nodeApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('meshvault_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (token expired)
nodeApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('meshvault_token');
      localStorage.removeItem('meshvault_user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// ─── Python FastAPI (DSA Engine) ─────────────────────────────────────

export const pythonApi = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // DSA operations may take longer
});

// ─── Auth API ────────────────────────────────────────────────────────

export const authApi = {
  register: (data) => nodeApi.post('/auth/register', data),
  login: (data) => nodeApi.post('/auth/login', data),
  getMe: () => nodeApi.get('/auth/me'),
};

// ─── Workspace API ───────────────────────────────────────────────────

export const workspaceApi = {
  getAll: () => nodeApi.get('/workspaces'),
  getById: (id) => nodeApi.get(`/workspaces/${id}`),
  create: (data) => nodeApi.post('/workspaces', data),
  update: (id, data) => nodeApi.put(`/workspaces/${id}`, data),
  delete: (id) => nodeApi.delete(`/workspaces/${id}`),
};

// ─── Project API ─────────────────────────────────────────────────────

export const projectApi = {
  getAll: (params) => nodeApi.get('/projects', { params }),
  getById: (id) => nodeApi.get(`/projects/${id}`),
  create: (data) => nodeApi.post('/projects', data),
  update: (id, data) => nodeApi.put(`/projects/${id}`, data),
  delete: (id) => nodeApi.delete(`/projects/${id}`),
  addTasks: (id, tasks) => nodeApi.post(`/projects/${id}/tasks`, { tasks }),
};

// ─── Update Log API ──────────────────────────────────────────────────

export const logApi = {
  getAll: (limit) => nodeApi.get('/logs', { params: { limit } }),
  getByProject: (projectId) => nodeApi.get(`/logs/project/${projectId}`),
  create: (data) => nodeApi.post('/logs', data),
  verify: (id, data) => nodeApi.put(`/logs/${id}/verify`, data),
};

// ─── DSA Engine API (Python FastAPI) ─────────────────────────────────

export const dsaApi = {
  // Phase & Architecture Info
  getPhaseInfo: () => pythonApi.get('/dsa/phase-info'),

  // Phase 1: Mid-Sem Light DSAs
  stackPush: (action, details) => pythonApi.post('/dsa/midsem/stack/push', { action, details }),
  stackPop: () => pythonApi.post('/dsa/midsem/stack/pop'),
  stackGet: () => pythonApi.get('/dsa/midsem/stack'),
  
  queueEnqueue: (items) => pythonApi.post('/dsa/midsem/queue/enqueue', { items }),
  queueGet: () => pythonApi.get('/dsa/midsem/queue'),
  sprintGreedy: (tasks, capacity) => pythonApi.post('/dsa/midsem/sprint/greedy', { tasks, capacity }),

  linkedListAppend: (log) => pythonApi.post('/dsa/midsem/linkedlist/append', log),
  linkedListGet: (reverse = false) => pythonApi.get('/dsa/midsem/linkedlist', { params: { reverse } }),

  bstIndexLogs: (entries) => pythonApi.post('/dsa/midsem/bst/index', { entries }),
  bstGetLogs: () => pythonApi.get('/dsa/midsem/bst'),
  bstQueryRange: (start, end) => pythonApi.post('/dsa/midsem/bst/range', { start, end }),

  // Deadlines (MinHeap Priority Queue)
  addDeadlines: (items) => pythonApi.post('/dsa/deadlines', { items }),
  getDeadlines: () => pythonApi.get('/dsa/deadlines'),
  getNextDeadline: () => pythonApi.get('/dsa/deadlines/next'),
  extractNextDeadline: () => pythonApi.post('/dsa/deadlines/extract'),
  clearDeadlines: () => pythonApi.delete('/dsa/deadlines'),

  // Phase 2: End-Sem Advanced DSAs (Roadmap Preview)
  indexLogs: (entries) => pythonApi.post('/dsa/logs/index', { entries }),
  getIndexedLogs: () => pythonApi.get('/dsa/logs/index'),
  queryLogRange: (start, end) => pythonApi.post('/dsa/logs/range', { start, end }),

  buildMerkle: (logs) => pythonApi.post('/dsa/merkle/build', { logs }),
  verifyMerkle: (logs) => pythonApi.post('/dsa/merkle/verify', { logs }),

  optimizeSprint: (tasks, capacity) => pythonApi.post('/dsa/sprint/optimize', { tasks, capacity }),

  autocomplete: (prefix, limit = 10) => pythonApi.get('/dsa/search/autocomplete', { params: { prefix, limit } }),
};
