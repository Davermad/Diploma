const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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
  register: (email, password, display_name) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name }),
    }),
  me: () => request('/auth/me'),
  patchMe: (display_name) =>
    request('/auth/me', { method: 'PATCH', body: JSON.stringify({ display_name }) }),
};

export const projects = {
  list: () => request('/projects/'),
  get: (id) => request(`/projects/${id}`),
  create: (data) => request('/projects/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  members: (projectId) => request(`/projects/${projectId}/members`),
  getChat: (id, skip = 0, limit = 50) =>
    request(`/projects/${id}/chat/messages?skip=${skip}&limit=${limit}`),
  sendMessage: (id, text) =>
    request(`/projects/${id}/chat/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
  addMember: (projectId, body) =>
    request(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify(body) }),
  listSprints: (projectId) => request(`/projects/${projectId}/sprints`),
  createSprint: (projectId, data) =>
    request(`/projects/${projectId}/sprints`, { method: 'POST', body: JSON.stringify(data) }),
};

export const tasks = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    });
    const qs = q.toString();
    return request(`/tasks${qs ? '?' + qs : ''}`);
  },
  get: (id) => request(`/tasks/${id}`),
  create: (data) => request('/tasks/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  getComments: (id, skip = 0, limit = 50) =>
    request(`/tasks/${id}/comments?skip=${skip}&limit=${limit}`),
  addComment: (id, text) =>
    request(`/tasks/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
  listWorkLogs: (id, skip = 0, limit = 50) =>
    request(`/tasks/${id}/work-logs?skip=${skip}&limit=${limit}`),
  addWorkLog: (id, body) =>
    request(`/tasks/${id}/work-logs`, { method: 'POST', body: JSON.stringify(body) }),
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
  globalMessages: (skip = 0, limit = 50) =>
    request(`/chat/global/messages?skip=${skip}&limit=${limit}`),
  sendGlobalMessage: (text) =>
    request('/chat/global/messages', { method: 'POST', body: JSON.stringify({ text }) }),
};

export const notifications = {
  list: (unreadOnly = false, limit = 40) =>
    request(`/notifications/?unread_only=${unreadOnly}&limit=${limit}`),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => request('/notifications/read-all', { method: 'POST' }),
};

export const activity = {
  feed: ({ limit = 40, task_id, project_id } = {}) => {
    const q = new URLSearchParams({ limit: String(limit) });
    if (task_id) q.set('task_id', task_id);
    if (project_id) q.set('project_id', project_id);
    return request(`/activity/?${q}`);
  },
};

export const searchApi = {
  query: (q) => request(`/search/?q=${encodeURIComponent(q)}`),
};

export function getWsUrl(path) {
  const base = API_URL.replace(/^http/, 'ws');
  return `${base}${path}`;
}
