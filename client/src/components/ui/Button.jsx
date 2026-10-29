import clsx from 'clsx';
import { LoaderCircle } from 'lucide-react';

const VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 dark:bg-brand-500 dark:text-slate-950 dark:hover:bg-brand-400',
  secondary:
    'border border-line bg-surface text-ink shadow-sm hover:bg-surface-muted active:bg-surface-soft',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/15',
  ghost: 'text-ink-muted hover:bg-surface-muted hover:text-ink',
  danger: 'bg-expense text-white shadow-sm hover:bg-rose-700 active:bg-rose-800',
  dangerSoft:
    'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15',
};

const SIZES = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
  icon: 'size-9 p-0',
  iconSm: 'size-8 p-0',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  loading = false,
  disabled,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'disabled:pointer-events-none disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Spinner({ size = 20, className = '' }) {
  return (
    <LoaderCircle
      size={size}
      className={clsx('animate-spin text-brand-600 dark:text-brand-400', className)}
      aria-hidden="true"
    />
  );
}
