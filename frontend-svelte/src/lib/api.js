const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/** FastAPI 422: detail may be string or [{ msg, loc, type }] */
export function formatApiError(body) {
  if (body == null) return 'Ошибка запроса';
  const d = body.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) {
    return d
      .map((x) => (typeof x === 'string' ? x : x.msg || JSON.stringify(x)))
      .join(' ');
  }
  if (typeof d === 'object' && d !== null) return JSON.stringify(d);
  return String(d);
}

export function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/#/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(formatApiError(err));
  }
  if (res.status === 204) return null;
  return res.json();
}

export const auth = {
  login: (email, password) => {
    const form = new FormData();
    form.append('username', email);
    form.append('password', password);
    return fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      body: form,
    }).then((r) =>
      r.ok ? r.json() : r.json().then((e) => Promise.reject(new Error(formatApiError(e))))
    );
  },
  register: (email, password) => request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),
};

export const projects = {
  list: () => request('/projects/'),
  get: (id) => request(`/projects/${id}`),
  create: (data) => request('/projects/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  getChat: (id, skip = 0, limit = 50) => request(`/projects/${id}/chat/messages?skip=${skip}&limit=${limit}`),
  sendMessage: (id, text) => request(`/projects/${id}/chat/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
  addMember: (projectId, body) =>
    request(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify(body) }),
};

export const tasks = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/tasks${q ? '?' + q : ''}`);
  },
  get: (id) => request(`/tasks/${id}`),
  create: (data) => request('/tasks/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  getComments: (id, skip = 0, limit = 50) => request(`/tasks/${id}/comments?skip=${skip}&limit=${limit}`),
  addComment: (id, text) => request(`/tasks/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
};

export const categories = {
  list: () => request('/categories/'),
  get: (id) => request(`/categories/${id}`),
  create: (data) => request('/categories/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
};

export const stats = {
  get: (period = 'all') => request(`/stats/?period=${period}`),
  dashboard: () => request('/stats/dashboard'),
};

export const chat = {
  globalMessages: (skip = 0, limit = 50) => request(`/chat/global/messages?skip=${skip}&limit=${limit}`),
  sendGlobalMessage: (text) =>
    request('/chat/global/messages', { method: 'POST', body: JSON.stringify({ text }) }),
};

export function getWsUrl(path) {
  const base = API_URL.replace(/^http/, 'ws');
  return `${base}${path}`;
}
