import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';
import { AuthFooterLink, AuthLayout, PasswordInput } from '../layouts/AuthLayout.jsx';
import { Field, FormError, Input } from '../components/ui/FormControls.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../services/api.js';
import { apiFieldErrors, registerSchema, zodErrors } from '../utils/validation.js';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
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
    const result = registerSchema.safeParse(form);
    if (!result.success) {
      setErrors(zodErrors(result.error));
      return;
    }

    setLoading(true);
    setFormError('');
    try {
      await register(result.data);
      toast.success('Your SpendWise account is ready.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrors(apiFieldErrors(error));
      setFormError(getErrorMessage(error, 'Could not create your account.'));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      description="A clear view of your money starts with one simple step."
      footer={<AuthFooterLink prompt="Already have an account?" linkText="Sign in" to="/login" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />
        <Field label="Full name" htmlFor="name" error={errors.name} required>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Aditya Sharma"
            value={form.name}
            onChange={handleChange('name')}
            invalid={Boolean(errors.name)}
            required
          />
        </Field>
        <Field label="Email address" htmlFor="email" error={errors.email} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange('email')}
            invalid={Boolean(errors.email)}
            required
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={errors.password}
          hint="At least 8 characters with upper case, lower case, and a number."
          required
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Create a strong password"
            value={form.password}
            onChange={handleChange('password')}
            invalid={Boolean(errors.password)}
          />
        </Field>
        <Field
          label="Confirm password"
          htmlFor="confirmPassword"
          error={errors.confirmPassword}
          required
        >
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            invalid={Boolean(errors.confirmPassword)}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          <UserPlus size={16} aria-hidden="true" />
          Create account
        </Button>
        <p className="text-center text-[11px] leading-5 text-ink-subtle">
          By creating an account, you agree to keep your login details private. SpendWise never
          stores plain-text passwords.
        </p>
      </form>
    </AuthLayout>
  );
}
