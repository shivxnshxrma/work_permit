import { create } from 'zustand';
import { authAPI } from '../api/client';

const useAuthStore = create((set, get) => ({
  user:    JSON.parse(localStorage.getItem('user') || 'null'),
  access:  localStorage.getItem('access')  || null,
  refresh: localStorage.getItem('refresh') || null,
  loading: false,
  error:   null,

  // ── Helpers ─────────────────────────────────────────────────
  _persist(access, refresh, user) {
    localStorage.setItem('access',  access);
    localStorage.setItem('refresh', refresh);
    localStorage.setItem('user',    JSON.stringify(user));
    set({ access, refresh, user, error: null });
  },

  // ── Actions ──────────────────────────────────────────────────
  async register(payload) {
    set({ loading: true, error: null });
    try {
      await authAPI.register(payload);
      return { ok: true };
    } catch (e) {
      const error = e.response?.data || { detail: 'Registration failed.' };
      set({ error });
      return { ok: false, error };
    } finally {
      set({ loading: false });
    }
  },

  async login(email, password) {
    set({ loading: true, error: null });
    try {
      const { data } = await authAPI.login({ email, password });
      get()._persist(data.access, data.refresh, data.user);
      return { ok: true };
    } catch (e) {
      const error = e.response?.data || { detail: 'Login failed.' };
      set({ error });
      return { ok: false, error };
    } finally {
      set({ loading: false });
    }
  },

  async logout() {
    const refresh = get().refresh;
    try { await authAPI.logout(refresh); } catch { /* ignore */ }
    localStorage.clear();
    set({ user: null, access: null, refresh: null });
  },

  async refreshProfile() {
    try {
      const { data } = await authAPI.me();
      localStorage.setItem('user', JSON.stringify(data));
      set({ user: data });
    } catch { /* token invalid — leave state as-is */ }
  },

  isAuthenticated: () => !!get().access,
}));

export default useAuthStore;
