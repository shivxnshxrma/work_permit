import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { AppLogo, AuthFooter, Field, Spinner } from '../components/FormElements';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuthStore();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors]   = useState({});

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.email)    e.email    = 'Email is required.';
    if (!form.password) e.password = 'Password is required.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const result = await login(form.email, form.password);
    if (result.ok) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      const msg = result.error?.detail || 'Invalid credentials.';
      toast.error(msg);
      setErrors({ password: msg });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-vms-text via-vms-deep to-vms-primary
                    flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Brand strip */}
        <div className="mb-8 flex items-center justify-center gap-3 text-center">
          <AppLogo className="h-12 w-12 rounded-xl bg-white/10 p-1.5" />
          <p className="text-2xl font-bold tracking-tight text-white">Work Permit System</p>
        </div>

        {/* Card */}
        <div className="auth-card">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to your account</h1>
            <p className="mt-2 text-sm text-slate-500">Enter your credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field
              label="Email address" id="email" type="email" required
              value={form.email} onChange={(e) => set('email', e.target.value)}
              placeholder="you@dsgroup.com" error={errors.email} autoComplete="email"
            />

            <Field label="Password" id="password" required error={errors.password}>
              <div className="relative">
                <input
                  id="password" type={showPwd ? 'text' : 'password'}
                  value={form.password} onChange={(e) => set('password', e.target.value)}
                  className={`field-input pr-10 ${errors.password ? 'error' : ''}`}
                  placeholder="••••••••" autoComplete="current-password"
                />
                <button
                  type="button" tabIndex={-1}
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                             hover:text-slate-600 transition-colors"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* {errors.password && <p className="field-error">{errors.password}</p>} */}
            </Field>

            <button type="submit" disabled={loading}
              className="btn-primary btn-lg w-full mt-2">
              {loading ? <Spinner size={4} /> : <LogIn size={15} />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="text-center text-sm text-slate-500">
              Forgot password?{' '}
              <Link to="/forgot-password" className="font-semibold text-vms-700 hover:underline">
                Reset here
              </Link>
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-vms-700 hover:underline">
              Create one
            </Link>
          </p>
        </div>
        <AuthFooter />
      </div>
    </div>
  );
}
