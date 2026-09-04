const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  let token = '';
  try {
    const saved = localStorage.getItem('meshvault_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      token = parsed.token || '';
    }
  } catch {}

  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    headers,
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body.detail) {
        if (typeof body.detail === 'string') {
          message = body.detail;
        } else if (Array.isArray(body.detail)) {
          message = body.detail.map(e => e.msg || e.message || JSON.stringify(e)).join(' | ');
        } else if (typeof body.detail === 'object') {
          message = body.detail.msg || body.detail.message || JSON.stringify(body.detail);
        }
      } else if (body.message) {
        message = body.message;
      }
    } catch { /* ignore parse errors */ }
    throw new Error(message);
  }

  return response.json();
}

const api = {
  get:    (ep)       => request(ep),
  post:   (ep, data) => request(ep, { method: 'POST',   body: JSON.stringify(data) }),
  put:    (ep, data) => request(ep, { method: 'PUT',    body: JSON.stringify(data) }),
  delete: (ep)       => request(ep, { method: 'DELETE' }),
};

export default api;
