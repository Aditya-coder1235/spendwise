import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LogIn } from 'lucide-react';
import { AuthFooterLink, AuthLayout, PasswordInput } from '../layouts/AuthLayout.jsx';
import { Field, FormError, Input } from '../components/ui/FormControls.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../services/api.js';
import { loginSchema, zodErrors, apiFieldErrors } from '../utils/validation.js';

export default function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleChange = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = loginSchema.safeParse(form);
    if (!result.success) {
      setErrors(zodErrors(result.error));
      return;
    }

    setLoading(true);
    setFormError('');
    try {
      await login(result.data);
      toast.success('Welcome back!');
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (error) {
      setErrors(apiFieldErrors(error));
      setFormError(getErrorMessage(error, 'Could not sign in. Please try again.'));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to see your latest spending, budgets, and savings."
      footer={
        <AuthFooterLink prompt="New to SpendWise?" linkText="Create an account" to="/register" />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />
        <Field label="Email address" htmlFor="email" error={errors.email} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange('email')}
            invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            required
          />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password} required>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={form.password}
            onChange={handleChange('password')}
            invalid={Boolean(errors.password)}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          <LogIn size={16} aria-hidden="true" />
          Sign in
        </Button>
      </form>

      {import.meta.env.DEV && (
        <div className="mt-6 rounded-xl border border-line bg-surface-soft p-3.5 text-xs leading-5 text-ink-subtle">
          <p className="font-semibold text-ink-muted">Exploring locally?</p>
          <p className="mt-0.5">
            Run <code className="rounded bg-surface-muted px-1 py-0.5 text-[11px]">npm run seed</code>{' '}
            then use <strong className="font-medium text-ink-muted">demo@spendwise.local</strong> /{' '}
            <strong className="font-medium text-ink-muted">DemoPass123!</strong>
          </p>
        </div>
      )}

      <p className="mt-5 text-center text-xs text-ink-subtle">
        <Link to="/register" className="hover:text-ink">
          Trouble signing in? Create a fresh account →
        </Link>
      </p>
    </AuthLayout>
  );
}
