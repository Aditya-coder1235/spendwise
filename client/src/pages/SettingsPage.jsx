import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  BellRing,
  Check,
  KeyRound,
  LogOut,
  Palette,
  Pencil,
  Plus,
  ShieldCheck,
  Tag,
  Trash2,
  UserRound,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Field, FormError, Input, Select } from '../components/ui/FormControls.jsx';
import { ErrorState, EmptyState } from '../components/ui/States.jsx';
import { CategoryIcon } from '../components/ui/CategoryIcon.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { CategoryFormModal } from '../features/categories/CategoryFormModal.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  categoriesApi,
  getErrorMessage,
  authApi,
} from '../services/api.js';
import { CURRENCIES, DATE_FORMATS } from '../utils/constants.js';
import { formatCurrency } from '../utils/format.js';
import { formatDisplayDate } from '../utils/date.js';
import {
  apiFieldErrors,
  passwordSchema,
  profileSchema,
  zodErrors,
} from '../utils/validation.js';

const SECTIONS = [
  { href: '#profile', label: 'Profile', icon: UserRound },
  { href: '#preferences', label: 'Preferences', icon: Palette },
  { href: '#security', label: 'Password & security', icon: ShieldCheck },
  { href: '#categories', label: 'Categories', icon: Tag },
  { href: '#session', label: 'Session', icon: LogOut },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateProfile, logout, setUser } = useAuth();
  const { setTheme } = useTheme();
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    preferredCurrency: user?.preferredCurrency || 'INR',
    dateFormat: user?.dateFormat || 'DD/MM/YYYY',
    theme: user?.theme || 'light',
    warningThreshold: user?.warningThreshold || 80,
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [categoryModal, setCategoryModal] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const {
    data: categoryData,
    loading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useApi(() => categoriesApi.list(), []);

  useEffect(() => {
    if (!user) return;
    setProfileForm({
      name: user.name,
      preferredCurrency: user.preferredCurrency,
      dateFormat: user.dateFormat,
      theme: user.theme,
      warningThreshold: user.warningThreshold,
    });
  }, [user]);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    const result = profileSchema.safeParse(profileForm);
    if (!result.success) {
      setProfileErrors(zodErrors(result.error));
      return;
    }

    setSavingProfile(true);
    setProfileError('');
    try {
      await updateProfile(result.data);
      setTheme(result.data.theme);
      toast.success('Settings saved.');
      setProfileErrors({});
    } catch (error) {
      setProfileErrors(apiFieldErrors(error));
      setProfileError(getErrorMessage(error, 'Could not save your settings.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    const result = passwordSchema.safeParse(passwordForm);
    if (!result.success) {
      setPasswordErrors(zodErrors(result.error));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrors({ confirmPassword: 'New passwords do not match' });
      return;
    }

    setSavingPassword(true);
    setPasswordError('');
    try {
      await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setUser(null);
      toast.success('Password changed. Please sign in again.');
      navigate('/login', { replace: true });
    } catch (error) {
      setPasswordErrors(apiFieldErrors(error));
      setPasswordError(getErrorMessage(error, 'Could not change your password.'));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setDeleteLoading(true);
    try {
      await categoriesApi.remove(deletingCategory.id);
      toast.success('Category deleted.');
      setDeletingCategory(null);
      refetchCategories();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete this category.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogout = async () => {
    setSigningOut(true);
    await logout();
    toast.success('Signed out safely.');
    navigate('/login', { replace: true });
  };

  const categories = categoryData?.categories || [];
  const expenseCategories = categories.filter((category) => category.type === 'expense');
  const incomeCategories = categories.filter((category) => category.type === 'income');

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Your profile, currency and date preferences, warning threshold, and security."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[210px_minmax(0,1fr)] xl:gap-6">
        <aside className="hidden lg:block">
          <nav
            aria-label="Settings sections"
            className="sticky top-24 space-y-1 rounded-2xl border border-line bg-surface p-2"
          >
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <a
                  key={section.href}
                  href={section.href}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                >
                  <Icon size={15} className="text-ink-subtle" aria-hidden="true" />
                  {section.label}
                </a>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 space-y-5">
          <Card id="profile" className="scroll-mt-24 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={user?.name} id={user?.id} size="lg" />
                <div>
                  <h2 className="text-base font-semibold text-ink">{user?.name}</h2>
                  <p className="mt-0.5 text-xs text-ink-subtle">{user?.email}</p>
                </div>
              </div>
              <Badge variant="brand">
                <ShieldCheck size={11} aria-hidden="true" />
                Protected account
              </Badge>
            </div>
            <div className="my-5 h-px bg-line" />
            <CardHeader
              title="Profile information"
              description="This is the name shown across your SpendWise workspace."
            />
            <form onSubmit={handleProfileSubmit} className="mt-4 space-y-4" noValidate>
              <FormError message={profileError} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Full name" htmlFor="settings-name" error={profileErrors.name} required>
                  <Input
                    id="settings-name"
                    value={profileForm.name}
                    onChange={(event) => {
                      setProfileForm((previous) => ({ ...previous, name: event.target.value }));
                      setProfileErrors((previous) => ({ ...previous, name: undefined }));
                    }}
                    invalid={Boolean(profileErrors.name)}
                  />
                </Field>
                <Field label="Email address" htmlFor="settings-email" hint="Email changes are not supported yet.">
                  <Input id="settings-email" value={user?.email || ''} disabled />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" loading={savingProfile}>
                  <Check size={15} aria-hidden="true" />
                  Save profile
                </Button>
              </div>
            </form>
          </Card>

          <Card id="preferences" className="scroll-mt-24 p-5 sm:p-6">
            <CardHeader
              title="Preferences"
              description="Currency, date format, theme, and budget warning threshold."
            />
            <form onSubmit={handleProfileSubmit} className="mt-5 space-y-5" noValidate>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Preferred currency" htmlFor="settings-currency" error={profileErrors.preferredCurrency}>
                  <Select
                    id="settings-currency"
                    value={profileForm.preferredCurrency}
                    onChange={(event) =>
                      setProfileForm((previous) => ({
                        ...previous,
                        preferredCurrency: event.target.value,
                      }))
                    }
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency.value} value={currency.value}>
                        {currency.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Date format" htmlFor="settings-date-format" error={profileErrors.dateFormat}>
                  <Select
                    id="settings-date-format"
                    value={profileForm.dateFormat}
                    onChange={(event) =>
                      setProfileForm((previous) => ({ ...previous, dateFormat: event.target.value }))
                    }
                  >
                    {DATE_FORMATS.map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="rounded-xl border border-line bg-surface-soft p-3.5 text-[11px] text-ink-subtle">
                Preview:{' '}
                <span className="financial-number font-semibold text-ink">
                  {formatCurrency(12500050, profileForm.preferredCurrency)}
                </span>{' '}
                · {formatDisplayDate(new Date(), profileForm.dateFormat)}
              </div>

              <div>
                <span className="mb-2 block text-[13px] font-medium text-ink">Theme</span>
                <div className="grid max-w-sm grid-cols-2 gap-2">
                  {[
                    { value: 'light', label: 'Light', swatch: 'bg-[#f4f6f8] border-[#e2e8f0]' },
                    { value: 'dark', label: 'Dark', swatch: 'bg-[#101827] border-[#334155]' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setProfileForm((previous) => ({ ...previous, theme: option.value }));
                        setTheme(option.value);
                      }}
                      aria-pressed={profileForm.theme === option.value}
                      className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                        profileForm.theme === option.value
                          ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-300'
                          : 'border-line text-ink-muted hover:bg-surface-soft'
                      }`}
                    >
                      <span className={`size-7 rounded-md border ${option.swatch}`} aria-hidden="true" />
                      <span className="flex-1">{option.label}</span>
                      {profileForm.theme === option.value && <Check size={13} aria-hidden="true" />}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] text-ink-subtle">
                  Theme previews immediately; Save preferences stores it to your account.
                </p>
              </div>

              <div>
                <Field
                  label={`Budget warning threshold: ${profileForm.warningThreshold}%`}
                  htmlFor="settings-threshold"
                  error={profileErrors.warningThreshold}
                  hint="Show an amber warning once this share of a budget is spent. The 100% exceeded state is always shown."
                >
                  <div className="flex items-center gap-3">
                    <input
                      id="settings-threshold"
                      type="range"
                      min="50"
                      max="100"
                      step="5"
                      value={profileForm.warningThreshold}
                      onChange={(event) =>
                        setProfileForm((previous) => ({
                          ...previous,
                          warningThreshold: Number(event.target.value),
                        }))
                      }
                      className="h-1.5 flex-1 cursor-pointer accent-brand-600"
                    />
                    <input
                      type="number"
                      min="50"
                      max="100"
                      value={profileForm.warningThreshold}
                      onChange={(event) =>
                        setProfileForm((previous) => ({
                          ...previous,
                          warningThreshold: event.target.value,
                        }))
                      }
                      aria-label="Warning threshold percentage"
                      className="h-8 w-16 rounded-lg border border-line bg-surface px-2 text-center text-xs text-ink"
                    />
                  </div>
                </Field>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <p className="flex items-center gap-1.5 text-[11px] text-ink-subtle">
                  <BellRing size={13} aria-hidden="true" />
                  Budget warnings are calculated server-side.
                </p>
                <Button type="submit" loading={savingProfile}>
                  <Check size={15} aria-hidden="true" />
                  Save preferences
                </Button>
              </div>
            </form>
          </Card>

          <Card id="security" className="scroll-mt-24 p-5 sm:p-6">
            <CardHeader
              title="Password & security"
              description="Changing your password signs out every active session."
            />
            <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4" noValidate>
              <FormError message={passwordError} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field
                  label="Current password"
                  htmlFor="current-password"
                  error={passwordErrors.currentPassword}
                  required
                >
                  <Input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.currentPassword}
                    onChange={(event) => {
                      setPasswordForm((previous) => ({
                        ...previous,
                        currentPassword: event.target.value,
                      }));
                      setPasswordErrors((previous) => ({ ...previous, currentPassword: undefined }));
                    }}
                    invalid={Boolean(passwordErrors.currentPassword)}
                  />
                </Field>
                <Field
                  label="New password"
                  htmlFor="new-password"
                  error={passwordErrors.newPassword}
                  hint="8+ chars, upper, lower, number."
                  required
                >
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.newPassword}
                    onChange={(event) => {
                      setPasswordForm((previous) => ({
                        ...previous,
                        newPassword: event.target.value,
                      }));
                      setPasswordErrors((previous) => ({ ...previous, newPassword: undefined }));
                    }}
                    invalid={Boolean(passwordErrors.newPassword)}
                  />
                </Field>
                <Field
                  label="Confirm new password"
                  htmlFor="confirm-password"
                  error={passwordErrors.confirmPassword}
                  required
                >
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) => {
                      setPasswordForm((previous) => ({
                        ...previous,
                        confirmPassword: event.target.value,
                      }));
                      setPasswordErrors((previous) => ({ ...previous, confirmPassword: undefined }));
                    }}
                    invalid={Boolean(passwordErrors.confirmPassword)}
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="secondary" loading={savingPassword}>
                  <KeyRound size={14} aria-hidden="true" />
                  Update password
                </Button>
              </div>
            </form>
          </Card>

          <Card id="categories" className="scroll-mt-24 p-5 sm:p-6">
            <CardHeader
              title="Categories"
              description="Default categories are maintained by SpendWise. Add custom categories for your own habits."
              action={
                <Button size="sm" variant="secondary" onClick={() => setCategoryModal({ category: null })}>
                  <Plus size={14} aria-hidden="true" />
                  Add category
                </Button>
              }
            />

            {categoriesError ? (
              <ErrorState
                message={getErrorMessage(categoriesError)}
                onRetry={refetchCategories}
                className="py-8"
              />
            ) : categoriesLoading && !categoryData ? (
              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="skeleton h-14 rounded-xl" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <EmptyState
                icon={Tag}
                title="No categories available"
                description="Default categories are created when you register. Add a custom one to get started."
                className="py-8"
              />
            ) : (
              <div className="mt-5 space-y-6">
                {[
                  { label: 'Expense categories', items: expenseCategories },
                  { label: 'Income categories', items: incomeCategories },
                ].map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {group.items.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center gap-2.5 rounded-xl border border-line p-2.5"
                        >
                          <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-ink">{category.name}</p>
                            <p className="text-[10px] text-ink-subtle">
                              {category.isDefault ? 'Default' : 'Custom'}
                            </p>
                          </div>
                          {!category.isDefault && (
                            <>
                              <button
                                type="button"
                                onClick={() => setCategoryModal({ category })}
                                aria-label={`Edit ${category.name}`}
                                className="grid size-7 place-items-center rounded-lg text-ink-subtle hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                              >
                                <Pencil size={13} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingCategory(category)}
                                aria-label={`Delete ${category.name}`}
                                className="grid size-7 place-items-center rounded-lg text-ink-subtle hover:bg-rose-50 hover:text-expense focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-rose-500/10"
                              >
                                <Trash2 size={13} aria-hidden="true" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card id="session" className="scroll-mt-24 border-rose-200 p-5 dark:border-rose-500/20 sm:p-6">
            <CardHeader
              title="Session"
              description="Sign out of this browser. Your records remain securely stored."
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[11px] text-ink-subtle">
                <AlertTriangle size={13} aria-hidden="true" />
                You will need your email and password to sign back in.
              </p>
              <Button variant="dangerSoft" onClick={handleLogout} loading={signingOut}>
                <LogOut size={14} aria-hidden="true" />
                Sign out
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <CategoryFormModal
        open={Boolean(categoryModal)}
        category={categoryModal?.category}
        onClose={() => setCategoryModal(null)}
        onSaved={refetchCategories}
      />

      <ConfirmDialog
        open={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDeleteCategory}
        loading={deleteLoading}
        title="Delete category?"
        message={
          deletingCategory
            ? `“${deletingCategory.name}” will be removed. Categories already used by transactions, budgets, or recurring items cannot be deleted.`
            : ''
        }
        confirmLabel="Delete category"
      />
    </div>
  );
}
