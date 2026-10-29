import clsx from 'clsx';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from './Button.jsx';

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center px-5 py-12 text-center', className)}>
      <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-surface-muted text-ink-subtle">
        <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-xs leading-5 text-ink-subtle">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Could not load this data',
  message = 'Check your connection and try again.',
  onRetry,
  className,
}) {
  return (
    <div className={clsx('flex flex-col items-center justify-center px-5 py-12 text-center', className)} role="alert">
      <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-rose-50 text-expense dark:bg-rose-500/10">
        <AlertCircle size={22} aria-hidden="true" />
      </span>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-5 text-ink-subtle">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw size={14} aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  );
}
