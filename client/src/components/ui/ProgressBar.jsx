import clsx from 'clsx';
import { formatPercent } from '../../utils/format.js';

export function ProgressBar({ percentage = 0, status = 'ok', className, height = 'h-2' }) {
  const clamped = Math.min(100, Math.max(0, Number(percentage) || 0));
  const colour =
    status === 'exceeded'
      ? 'bg-expense'
      : status === 'warning'
        ? 'bg-warning'
        : 'bg-brand-500';

  return (
    <div
      className={clsx('w-full overflow-hidden rounded-full bg-surface-muted', height, className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={`${formatPercent(clamped)} used`}
    >
      <div
        className={clsx('h-full rounded-full transition-[width] duration-500', colour)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
