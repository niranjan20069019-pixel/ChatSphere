import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || '';

// NEXT_PUBLIC_* values are baked in at build time. If a build (CI, Docker, Render)
// happened to bake a localhost URL, using it from a deployed page would break every
// API call. When the page is served from a non-local host, fall back to the
// same-origin /api path instead.
const API_URL =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1' &&
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(rawApiUrl)
    ? '/api'
    : rawApiUrl || '/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let refreshPromise: Promise<boolean> | null = null;

// Clear any legacy token storage from earlier versions
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('cs_access');
  } catch {
    // ignore
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      if (original.url?.includes('/auth/refresh') || original.url?.includes('/auth/login')) {
        return Promise.reject(error);
      }
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = api
          .post('/auth/refresh')
          .then(() => true)
          .catch(() => {
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
              window.location.href = '/login';
            }
            return false;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }
      const ok = await refreshPromise;
      if (ok) return api(original);
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  register: (data: { username: string; email: string; password: string; displayName?: string }) =>
    api.post('/auth/register', data),
  login: (data: { emailOrUsername: string; password: string }) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
  resendVerification: (email: string) => api.post('/auth/resend-verification', { email }),
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (id: string) => api.delete(`/auth/sessions/${id}`),
};

// Users
export const usersApi = {
  search: (q: string, page = 1) => api.get('/users/search', { params: { q, page } }),
  getProfile: (username: string) => api.get(`/users/${username}`),
  updateProfile: (data: Record<string, unknown>) => api.patch('/users/me', data),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post('/users/me/avatar', form);
  },
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/users/me/password', { currentPassword, newPassword }),
};

// Friends
export const friendsApi = {
  list: () => api.get('/friends'),
  requests: () => api.get('/friends/requests'),
  blocked: () => api.get('/friends/blocked'),
  sendRequest: (userId: string) => api.post('/friends/request', { userId }),
  accept: (id: string) => api.post(`/friends/request/${id}/accept`),
  reject: (id: string) => api.post(`/friends/request/${id}/reject`),
  cancel: (id: string) => api.post(`/friends/request/${id}/cancel`),
  remove: (userId: string) => api.delete(`/friends/${userId}`),
  block: (userId: string) => api.post('/friends/block', { userId }),
  unblock: (userId: string) => api.delete(`/friends/block/${userId}`),
  report: (data: { reportedId: string; reason: string; description?: string }) =>
    api.post('/friends/report', data),
};

// Messages
export const messagesApi = {
  conversations: (archived = false) =>
    api.get('/messages/conversations', { params: { archived } }),
  get: (userId: string, cursor?: string) =>
    api.get(`/messages/${userId}`, { params: { cursor } }),
  send: (data: Record<string, unknown>) => api.post('/messages', data),
  edit: (id: string, content: string) => api.patch(`/messages/${id}`, { content }),
  delete: (id: string, forEveryone = false) =>
    api.delete(`/messages/${id}`, { params: { forEveryone } }),
  react: (id: string, emoji: string) => api.post(`/messages/${id}/react`, { emoji }),
  star: (id: string) => api.post(`/messages/${id}/star`),
  pin: (id: string) => api.post(`/messages/${id}/pin`),
  search: (q: string, peerId?: string) =>
    api.get('/messages/search', { params: { q, peerId } }),
  starred: () => api.get('/messages/starred'),
  updateSetting: (peerId: string, data: Record<string, unknown>) =>
    api.patch(`/messages/settings/${peerId}`, data),
};

// Groups
export const groupsApi = {
  list: () => api.get('/groups'),
  get: (id: string) => api.get(`/groups/${id}`),
  create: (data: { name: string; description?: string; memberIds?: string[] }) =>
    api.post('/groups', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/groups/${id}`, data),
  delete: (id: string) => api.delete(`/groups/${id}`),
  uploadAvatar: (id: string, file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post(`/groups/${id}/avatar`, form);
  },
  addMembers: (id: string, memberIds: string[]) =>
    api.post(`/groups/${id}/members`, { memberIds }),
  removeMember: (id: string, userId: string) => api.delete(`/groups/${id}/members/${userId}`),
  updateRole: (id: string, userId: string, role: string) =>
    api.patch(`/groups/${id}/members/${userId}/role`, { role }),
  leave: (id: string) => api.post(`/groups/${id}/leave`),
  messages: (id: string, cursor?: string) =>
    api.get(`/groups/${id}/messages`, { params: { cursor } }),
  sendMessage: (id: string, data: Record<string, unknown>) =>
    api.post(`/groups/${id}/messages`, data),
};

// Notifications
export const notificationsApi = {
  list: (page = 1) => api.get('/notifications', { params: { page } }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};

// Upload
export const uploadApi = {
  file: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/upload', form);
  },
};

// Admin
export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: (params?: Record<string, unknown>) => api.get('/admin/users', { params }),
  updateUser: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/users/${id}`, data),
  reports: (params?: Record<string, unknown>) => api.get('/admin/reports', { params }),
  updateReport: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/reports/${id}`, data),
  messageStats: () => api.get('/admin/messages/stats'),
};
