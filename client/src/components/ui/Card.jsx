import clsx from 'clsx';

export function Card({ children, className, padded = false, ...props }) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.035)]',
        padded && 'p-5 sm:p-6',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={clsx('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 text-xs leading-5 text-ink-subtle">{description}</p>}
      </div>
      {action}
    </div>
  );
}
