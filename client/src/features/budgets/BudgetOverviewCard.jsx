import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Wallet } from 'lucide-react';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { ProgressBar } from '../../components/ui/ProgressBar.jsx';
import { EmptyState } from '../../components/ui/States.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { CategoryIcon } from '../../components/ui/CategoryIcon.jsx';
import { formatCurrency, formatPercent } from '../../utils/format.js';
import { formatMonth } from '../../utils/date.js';

export function BudgetOverviewCard({ budget, currency, warningThreshold }) {
  const overall = budget?.overall;

  return (
    <Card className="flex h-full flex-col p-5">
      <CardHeader
        title="Monthly budget"
        description={budget?.period ? formatMonth(budget.period) : 'This month'}
        action={
          <Link
            to="/budgets"
            className="text-[11px] font-semibold text-brand-700 hover:underline dark:text-brand-400"
          >
            Manage
          </Link>
        }
      />

      {!overall ? (
        <EmptyState
          icon={Wallet}
          title="No monthly budget yet"
          description="Set an overall limit to track how much is left this month."
          action={
            <Link
              to="/budgets"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-line bg-surface px-3 text-[13px] font-semibold text-ink shadow-sm transition-colors hover:bg-surface-muted"
            >
              Set a budget
            </Link>
          }
          className="flex-1 py-7"
        />
      ) : (
        <div className="mt-5 flex flex-1 flex-col">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] text-ink-subtle">Spent</p>
              <p className="financial-number mt-0.5 text-xl font-bold text-ink">
                {formatCurrency(overall.spentPaise, currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-ink-subtle">Limit</p>
              <p className="financial-number mt-0.5 text-sm font-semibold text-ink-muted">
                {formatCurrency(overall.monthlyLimitPaise, currency)}
              </p>
            </div>
          </div>

          <ProgressBar percentage={overall.percentage} status={overall.status} className="mt-4" />

          <div className="mt-2.5 flex items-center justify-between gap-3">
            <Badge
              variant={
                overall.status === 'exceeded'
                  ? 'expense'
                  : overall.status === 'warning'
                    ? 'warning'
                    : 'brand'
              }
              dot
            >
              {formatPercent(overall.percentage)} used
            </Badge>
            <p
              className={`financial-number text-xs font-semibold ${
                overall.remainingPaise < 0 ? 'text-expense' : 'text-ink'
              }`}
            >
              {overall.remainingPaise < 0 ? 'Over by ' : ''}
              {formatCurrency(Math.abs(overall.remainingPaise), currency)}
              {overall.remainingPaise >= 0 ? ' left' : ''}
            </p>
          </div>

          {overall.status === 'exceeded' && (
            <div className="mt-4 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] leading-5 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              You are over your monthly limit by{' '}
              <strong>{formatCurrency(Math.abs(overall.remainingPaise), currency)}</strong>.
            </div>
          )}

          {overall.status === 'warning' && (
            <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              You&apos;ve reached your {warningThreshold}% warning threshold. Slow down to stay
              within budget.
            </div>
          )}

          {budget.categories.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-2.5 text-[11px] font-semibold text-ink">Category watchlist</p>
              <div className="space-y-2.5">
                {budget.categories.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center gap-2.5">
                    <CategoryIcon
                      icon={item.category.icon}
                      color={item.category.color}
                      size="sm"
                      className="size-7"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2 text-[11px]">
                        <span className="truncate text-ink-muted">{item.category.name}</span>
                        <span
                          className={`font-semibold ${
                            item.status === 'exceeded'
                              ? 'text-expense'
                              : item.status === 'warning'
                                ? 'text-warning'
                                : 'text-ink-subtle'
                          }`}
                        >
                          {formatPercent(item.percentage)}
                        </span>
                      </div>
                      <ProgressBar
                        percentage={item.percentage}
                        status={item.status}
                        height="h-1.5"
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to="/budgets"
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline dark:text-brand-400"
              >
                All category budgets
                <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
