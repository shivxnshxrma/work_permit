import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: BASE_URL,
});

// ── Attach access token to every request ─────────────────────────────────
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  // Set Content-Type to application/json only for non-FormData requests
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }
  
  return config;
});

// ── On 401 — try to refresh, else logout ─────────────────────────────────
client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
          localStorage.setItem('access', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return client(original);
        } catch {
          // Refresh expired — force logout
          const redirectPath = localStorage.getItem('admin_id') ? '/admin/login' : '/login';
          localStorage.clear();
          window.location.href = redirectPath;
        }
      }
    }
    return Promise.reject(err);
  },
);

// ── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data)  => client.post('/auth/register/', data),
  login:    (data)  => client.post('/auth/login/',    data),
  logout:   (refresh) => client.post('/auth/logout/', { refresh }),
  me:       ()      => client.get('/auth/me/'),
  updateMe: (data)  => client.patch('/auth/me/', data),
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
