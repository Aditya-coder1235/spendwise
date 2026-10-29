import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

export const controlClass =
  'h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink shadow-[0_1px_1px_rgba(15,23,42,0.02)] transition placeholder:text-ink-subtle hover:border-line-strong focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-subtle aria-[invalid=true]:border-expense aria-[invalid=true]:ring-expense/15 dark:bg-surface-soft';

export function Field({ label, htmlFor, error, hint, required, children, className }) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink">
          {label}
          {required && (
            <span className="ml-0.5 text-expense" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} className="text-xs leading-5 text-expense" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs leading-5 text-ink-subtle">{hint}</p>
      )}
    </div>
  );
}

export function Input({ className, invalid, ...props }) {
  return <input className={clsx(controlClass, className)} aria-invalid={invalid || undefined} {...props} />;
}

export function Select({ className, invalid, children, ...props }) {
  return (
    <div className="relative">
      <select
        className={clsx(controlClass, 'appearance-none pr-9', className)}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle"
        aria-hidden="true"
      />
    </div>
  );
}

export function Textarea({ className, invalid, rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      className={clsx(controlClass, 'h-auto min-h-20 resize-y py-2.5 leading-6', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
    >
      {message}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled = false }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-5 text-ink-subtle">{description}</span>}
      </span>
      <span className="relative inline-flex shrink-0 pt-0.5">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        <span className="h-6 w-11 rounded-full bg-line-strong transition-colors peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 peer-disabled:opacity-50" />
        <span className="pointer-events-none absolute left-0.5 top-1 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
