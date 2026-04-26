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
      persistSession(response.data.user);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy-900 to-black
                    flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center justify-center gap-2 mb-10">
          <div className="w-14 h-14 bg-gradient-to-tr from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/30">
            <Lock className="text-white" size={24} />
          </div>
          <div className="text-center mt-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">Admin Portal</h2>
            <p className="text-slate-400 text-sm mt-1">Secure Dashboard Access</p>
          </div>
        </div>

        {/* Card */}
        <div className="auth-card">
          <div className="mb-6 text-center">
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
