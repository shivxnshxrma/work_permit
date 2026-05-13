import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { AppLogo, AuthFooter, Field, FieldGrid, Spinner } from '../components/FormElements';

const INITIAL = {
  first_name: '', last_name: '', email: '', username: '',
  department: '', employee_id: '', phone: '',
  password: '', password2: '',
};

export default function Register() {
  const navigate = useNavigate();
  const { register, loading } = useAuthStore();

  const [form, setForm]         = useState(INITIAL);
  const [showPwd, setShowPwd]   = useState(false);
  const [errors, setErrors]     = useState({});

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.first_name) e.first_name = 'Required.';
    if (!form.last_name)  e.last_name  = 'Required.';
    if (!form.email)      e.email      = 'Required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email.';
    if (!form.username)   e.username   = 'Required.';
    if (!form.password)   e.password   = 'Required.';
    else if (form.password.length < 8) e.password = 'Minimum 8 characters.';
    if (form.password !== form.password2) e.password2 = 'Passwords do not match.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const result = await register(form);
    if (result.ok) {
      toast.success('Account created — please sign in!');
      navigate('/login');
    } else {
      // Map Django field errors back to the form
      const apiErrors = {};
      if (result.error && typeof result.error === 'object') {
        Object.entries(result.error).forEach(([k, v]) => {
          apiErrors[k] = Array.isArray(v) ? v[0] : v;
        });
      }
      setErrors(apiErrors);
      toast.error(apiErrors.detail || 'Please fix the highlighted fields.');
    }
  };

  const F = (id, label, opts = {}) => (
    <Field key={id} id={id} label={label} error={errors[id]}
      required={opts.required} className={opts.span ? 'sm:col-span-2' : ''}>
      <input
        id={id} type={opts.type || 'text'}
        value={form[id]} onChange={(e) => set(id, e.target.value)}
        placeholder={opts.placeholder || ''}
        className={`field-input ${errors[id] ? 'error' : ''}`}
        autoComplete={opts.auto || 'off'}
      />
    </Field>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-vms-text via-vms-deep to-vms-primary
                    flex items-center justify-center px-4 py-12">
      <div className=" flex flex-col w-full max-w-lg justify-center items-center">

        {/* Brand */}
        <div className="mb-8 flex items-center justify-center gap-3 text-center">
          <AppLogo className="h-12 w-12 rounded-xl bg-white/10 p-1.5" />
          <p className="text-2xl font-bold text-white">Work Permit System</p>
        </div>

        {/* Card */}
        <div className="auth-card">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
            <p className="mt-2 text-sm text-slate-500">Fill in your details to get started</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Name row */}
            <FieldGrid cols={2} className="mb-4">
              {F('first_name', 'First name', { required: true })}
              {F('last_name',  'Last name',  { required: true })}
            </FieldGrid>

            {/* Contact */}
            <FieldGrid cols={2} className="mb-4">
              {F('email',    'Email',    { required: true, type: 'email', auto: 'email' })}
              {F('username', 'Username', { required: true, placeholder: 'john.doe' })}
            </FieldGrid>

            {/* Work info */}
            <FieldGrid cols={2} className="mb-4">
              {F('department',   'Department',   { placeholder: 'Safety & EHS' })}
              {F('employee_id',  'Employee ID',  { placeholder: 'EMP-0001' })}
              {F('phone',        'Phone',        { placeholder: '+91-XXXXXXXXXX', span: false })}
            </FieldGrid>

            {/* Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <Field label="Password" id="password" required error={errors.password}>
                <div className="relative">
                  <input id="password" type={showPwd ? 'text' : 'password'}
                    value={form.password} onChange={(e) => set('password', e.target.value)}
                    className={`field-input pr-10 ${errors.password ? 'error' : ''}`}
                    placeholder="Min 8 characters" autoComplete="new-password" />
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && <p className="field-error">{errors.password}</p>}
              </Field>

              <Field label="Confirm password" id="password2" required error={errors.password2}>
                <div className="relative">
                <input id="password2" type={showPwd ? 'text' : 'password'}
                  value={form.password2} onChange={(e) => set('password2', e.target.value)}
                  className={`field-input ${errors.password2 ? 'error' : ''}`}
                  placeholder="Repeat password" autoComplete="new-password" />
                </div>
                {errors.password2 && <p className="field-error">{errors.password2}</p>}
              </Field>
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
              {loading ? <Spinner size={4} /> : <UserPlus size={15} />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-vms-700 hover:underline">Sign in</Link>
          </p>
        </div>
        <AuthFooter />
      </div>
    </div>
  );
}
