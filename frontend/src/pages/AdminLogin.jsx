import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { Field, Spinner } from '../components/FormElements';
import client from '../api/client';
import useAuthStore from '../store/authStore';

export default function AdminLogin() {
  const navigate = useNavigate();
  const persistSession = useAuthStore((state) => state._persist);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required.';
    if (!form.password) e.password = 'Password is required.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await client.post('/permits/admin/login/', {
        email: form.email,
        password: form.password,
      });
      persistSession(response.data.access, response.data.refresh, response.data.user);
      localStorage.setItem('admin_id', response.data.user_id);
      localStorage.setItem('admin_email', response.data.email);
      toast.success('Admin access granted!');
      navigate('/admin/dashboard');
    } catch (error) {
      const msg = error.response?.data?.detail || 'Invalid credentials.';
      toast.error(msg);
      setErrors({ password: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black bg-opacity-50 backdrop-blur-sm
                    flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="w-10 h-10 bg-white rounded-lg flex items-center justify-center
                           font-bold text-red-600 text-sm">DS</span>
          <div>
            <p className="text-white font-semibold text-sm">DS Group</p>
            <p className="text-red-100 text-xs">Admin Dashboard</p>
          </div>
        </div>

        {/* Card */}
        <div className="auth-card">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">Admin Access</h1>
            <p className="text-sm text-slate-500 mt-1">Enter admin credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field
              label="Email" id="email" type="email" required
              value={form.email} onChange={(e) => set('email', e.target.value)}
              placeholder="admin@dsgroup.com" error={errors.email} autoComplete="email"
            />

            <Field label="Password" id="password" required error={errors.password}>
              <input
                id="password" type="password"
                value={form.password} onChange={(e) => set('password', e.target.value)}
                className={`field-input ${errors.password ? 'error' : ''}`}
                placeholder="••••••••" autoComplete="current-password"
              />
              {errors.password && <p className="field-error">{errors.password}</p>}
            </Field>

            <button type="submit" disabled={loading}
              className="btn-primary btn-lg w-full mt-2">
              {loading ? <Spinner size={4} /> : <LogIn size={15} />}
              {loading ? 'Authenticating…' : 'Sign in as Admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
