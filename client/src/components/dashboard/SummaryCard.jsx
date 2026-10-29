import clsx from 'clsx';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { formatPercent } from '../../utils/format.js';

const ACCENTS = {
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300',
  income: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  expense: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  savings: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
};

export function SummaryCard({ label, value, icon: Icon, accent = 'brand', trend, hint, className }) {
  const hasTrend = trend && trend.value !== null && trend.value !== undefined;
  const TrendIcon = trend?.value >= 0 ? TrendingUp : TrendingDown;
  const trendTone =
    trend?.tone === 'inverse'
      ? trend.value <= 0
        ? 'text-income'
        : 'text-expense'
      : trend?.value >= 0
        ? 'text-income'
        : 'text-expense';

  return (
    <Card className={clsx('relative min-w-0 overflow-hidden p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="pt-0.5 text-[12px] font-medium text-ink-muted">{label}</p>
        {Icon && (
          <span className={clsx('grid size-9 shrink-0 place-items-center rounded-xl', ACCENTS[accent])}>
            <Icon size={17} strokeWidth={2} aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="financial-number mt-3 text-xl font-bold text-ink min-[360px]:text-[clamp(1rem,3.2vw,1.75rem)]">
        {value}
      </p>
      <div className="mt-2.5 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1">
        {hasTrend ? (
          <>
            <span className={clsx('inline-flex items-center gap-1 text-[11px] font-semibold', trendTone)}>
              <TrendIcon size={12} aria-hidden="true" />
              {formatPercent(Math.abs(trend.value))}
            </span>
            <span className="text-[10px] text-ink-subtle">{trend.label || 'vs previous period'}</span>
          </>
        ) : (
          <span className="text-[10px] text-ink-subtle">{hint || 'No previous data to compare'}</span>
        )}
      </div>
    </Card>
  );
}
