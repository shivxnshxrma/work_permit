import { create } from 'zustand';
import { authAPI } from '../api/client';
import { STORAGE_KEYS } from '../utils/constants';

const safeGetUser = () => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

const useAuthStore = create((set, get) => ({
  user: safeGetUser(),
  loading: false,
  error:   null,

  // ── Helpers ─────────────────────────────────────────────────
  _persist(user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    set({ user, error: null });
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
      get()._persist(data.user);
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
    try { await authAPI.logout(); } catch { /* ignore */ }
    localStorage.removeItem(STORAGE_KEYS.USER);
    set({ user: null });
  },

  async refreshProfile() {
    try {
      const { data } = await authAPI.me();
      localStorage.setItem('user', JSON.stringify(data));
      set({ user: data });
    } catch { /* token invalid — leave state as-is */ }
  },

  isAuthenticated: () => !!get().user,
}));

export default useAuthStore;
