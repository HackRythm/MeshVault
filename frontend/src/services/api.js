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
  // Deadlines (MinHeap)
  addDeadlines: (items) => pythonApi.post('/dsa/deadlines', { items }),
  getDeadlines: () => pythonApi.get('/dsa/deadlines'),
  getNextDeadline: () => pythonApi.get('/dsa/deadlines/next'),
  extractNextDeadline: () => pythonApi.post('/dsa/deadlines/extract'),
  clearDeadlines: () => pythonApi.delete('/dsa/deadlines'),

  // Logs (AVL Tree)
  indexLogs: (entries) => pythonApi.post('/dsa/logs/index', { entries }),
  getIndexedLogs: () => pythonApi.get('/dsa/logs/index'),
  queryLogRange: (start, end) => pythonApi.post('/dsa/logs/range', { start, end }),
  searchLog: (timestamp) => pythonApi.get(`/dsa/logs/search/${timestamp}`),
  clearIndexedLogs: () => pythonApi.delete('/dsa/logs'),

  // Merkle Tree (SHA-256)
  buildMerkle: (logs) => pythonApi.post('/dsa/merkle/build', { logs }),
  verifyMerkle: (logs) => pythonApi.post('/dsa/merkle/verify', { logs }),
  getMerkleRoot: () => pythonApi.get('/dsa/merkle/root'),
  getMerkleProof: (index) => pythonApi.get(`/dsa/merkle/proof/${index}`),
  getMerkleTree: () => pythonApi.get('/dsa/merkle/tree'),

  // Sprint Optimizer (Knapsack DP)
  optimizeSprint: (tasks, capacity) =>
    pythonApi.post('/dsa/sprint/optimize', { tasks, capacity }),

  // Autocomplete (Trie)
  autocomplete: (prefix, limit = 10) =>
    pythonApi.get('/dsa/search/autocomplete', { params: { prefix, limit } }),
  insertTerms: (terms) => pythonApi.post('/dsa/search/insert', { terms }),
  searchExact: (word) => pythonApi.get('/dsa/search/exists', { params: { word } }),
  clearTrie: () => pythonApi.delete('/dsa/search'),
};
