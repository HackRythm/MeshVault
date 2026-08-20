const API_BASE_URL = '';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      message = body.detail || message;
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
