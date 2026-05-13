import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppLogo, AuthFooter, Field, Spinner } from '../components/FormElements';
import client from '../api/client';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [form, setForm] = useState({ password: '', password2: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k, v) => { 
    setForm((f) => ({ ...f, [k]: v })); 
    setErrors((e) => ({ ...e, [k]: '' })); 
  };

  const validate = () => {
    const e = {};
    if (!form.password) e.password = 'Password is required.';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (!form.password2) e.password2 = 'Please confirm your password.';
    else if (form.password !== form.password2) e.password2 = 'Passwords do not match.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!token) {
      toast.error('Invalid or missing reset token.');
      navigate('/login');
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      await client.post('/auth/reset-password/', {
        token,
        password: form.password,
        password2: form.password2,
      });
      setSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      const msg = error.response?.data?.detail || error.response?.data?.password?.[0] || 'Failed to reset password.';
      toast.error(msg);
      setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-vms-text via-vms-deep to-vms-primary
                      flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="auth-card">
            <div className="text-center">
              <p className="text-slate-600 mb-4">Invalid or missing reset token.</p>
              <Link to="/login" className="btn-primary btn-lg inline-block">
                Back to sign in
              </Link>
            </div>
          </div>
          <AuthFooter />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-vms-text via-vms-deep to-vms-primary
                    flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Brand strip */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <AppLogo className="h-12 w-12 rounded-xl bg-white/10 p-1.5" />
          <p className="text-2xl font-bold tracking-tight text-white">Work Permit System</p>
        </div>

        {/* Card */}
        <div className="auth-card">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">
              {success ? 'Password reset!' : 'Create new password'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {success
                ? 'Your password has been reset successfully. Redirecting to login…'
                : 'Enter a new password for your account.'}
            </p>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Field label="New password" id="password" required error={errors.password}>
                <div className="relative">
                  <input
                    id="password" type={showPwd ? 'text' : 'password'}
                    value={form.password} onChange={(e) => set('password', e.target.value)}
                    className={`field-input pr-10 ${errors.password ? 'error' : ''}`}
                    placeholder="••••••••" autoComplete="new-password"
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
                {errors.password && <p className="field-error">{errors.password}</p>}
              </Field>

              <Field label="Confirm password" id="password2" required error={errors.password2}>
                <div className="relative">
                  <input
                    id="password2" type={showPwd2 ? 'text' : 'password'}
                    value={form.password2} onChange={(e) => set('password2', e.target.value)}
                    className={`field-input pr-10 ${errors.password2 ? 'error' : ''}`}
                    placeholder="••••••••" autoComplete="new-password"
                  />
                  <button
                    type="button" tabIndex={-1}
                    onClick={() => setShowPwd2((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                               hover:text-slate-600 transition-colors"
                  >
                    {showPwd2 ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password2 && <p className="field-error">{errors.password2}</p>}
              </Field>

              {errors.form && <p className="text-red-500 text-sm">{errors.form}</p>}

              <button type="submit" disabled={loading}
                className="btn-primary btn-lg w-full mt-2">
                {loading ? <Spinner size={4} /> : <Lock size={15} />}
                {loading ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
          ) : (
            <div className="text-center py-4">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
            </div>
          )}

          {!success && (
            <p className="mt-6 text-center text-sm text-slate-500">
              <Link to="/login" className="font-semibold text-vms-700 hover:underline">
                Back to sign in
              </Link>
            </p>
          )}
        </div>
        <AuthFooter />
      </div>
    </div>
  );
}
