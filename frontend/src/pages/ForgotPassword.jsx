import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppLogo, AuthFooter, Field, Spinner } from '../components/FormElements';
import client from '../api/client';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const e = {};
    if (!email) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Please enter a valid email.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    try {
      const response = await client.post('/auth/forgot-password/', { email });
      setSubmitted(true);
      toast.success('Check your email for password reset instructions.');
    } catch (error) {
      const detail = error.response?.data?.detail;
      const emailError = error.response?.data?.email?.[0];
      const msg = detail || emailError || 'Failed to send reset email. Please try again.';
      toast.error(msg);
      if (emailError) setErrors({ email: emailError });
    } finally {
      setLoading(false);
    }
  };

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
              {submitted ? 'Check your email' : 'Forgot your password?'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {submitted
                ? 'We sent password reset instructions to your email.'
                : 'Enter your email and we\'ll send you a link to reset your password.'}
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Field
                label="Email address" id="email" type="email" required
                value={email} onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                placeholder="you@dsgroup.com" error={errors.email} autoComplete="email"
              />

              <button type="submit" disabled={loading}
                className="btn-primary btn-lg w-full mt-2">
                {loading ? <Spinner size={4} /> : <Mail size={15} />}
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          ) : (
            <div className="text-center py-4">
              <div className="mb-4 text-4xl">📧</div>
              <p className="text-sm text-slate-600 mb-6">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="btn-secondary w-full h-10"
              >
                Try another email
              </button>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link to="/login" className="font-semibold text-vms-700 hover:underline
                                        inline-flex items-center gap-1">
              <ArrowLeft size={14} />
              Back to sign in
            </Link>
          </p>
        </div>
        <AuthFooter />
      </div>
    </div>
  );
}
