import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// ── Request Interceptor ──────────────────────────────────────────────────
client.interceptors.request.use((config) => {
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

// ── Refresh Queue Logic ──────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// ── Response Interceptor ─────────────────────────────────────────────────
client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const requestUrl = original?.url || '';
    const shouldSkipRefresh = requestUrl.includes('/auth/login/') || requestUrl.includes('/auth/refresh/');

    if (err.response?.status === 401 && !original._retry && !shouldSkipRefresh) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return client(original);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        await axios.post(`${BASE_URL}/auth/refresh/`, {}, { withCredentials: true });
        processQueue(null);
        return client(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        // Dispatch event instead of hard reload
        window.dispatchEvent(new Event('auth-error'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  },
);

// ── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  register:   (data) => client.post('/auth/register/', data),
  login:      (data) => client.post('/auth/login/', data),
  logout:     ()     => client.post('/auth/logout/'),
  me:         ()     => client.get('/auth/me/'),
  updateMe:   (data) => client.patch('/auth/me/', data),
};

// ── Permits ───────────────────────────────────────────────────────────────
export const permitsAPI = {
  nextSerial: ()         => client.get('/permits/next-serial/'),
  list:     ()         => client.get('/permits/'),
  detail:   (id)       => client.get(`/permits/${id}/`),
  download: (id)       => client.get(`/permits/${id}/download/`, { responseType: 'blob' }),
  create:   (payload) => client.post('/permits/create/', payload),
  update:   (id, data) => client.patch(`/permits/${id}/`, data),
  cancel:   (id)       => client.delete(`/permits/${id}/`),
  approverDetail: (id) => client.get(`/permits/approvals/${id}/`),
};

export default client;
