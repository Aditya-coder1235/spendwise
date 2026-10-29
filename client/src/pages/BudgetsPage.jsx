import { useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Pencil,
  PiggyBank,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { EmptyState, ErrorState } from '../components/ui/States.jsx';
import { PageSkeleton } from '../components/ui/Skeleton.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { ProgressBar } from '../components/ui/ProgressBar.jsx';
import { CategoryIcon } from '../components/ui/CategoryIcon.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { BudgetFormModal } from '../features/budgets/BudgetFormModal.jsx';
import { useQuickAdd } from '../features/transactions/QuickAddContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { budgetsApi, categoriesApi, getErrorMessage } from '../services/api.js';
import { formatCurrency, formatPercent } from '../utils/format.js';
import { formatMonth, toMonthKey } from '../utils/date.js';

export default function BudgetsPage() {
  const { user } = useAuth();
  const { version } = useQuickAdd();
  const [month, setMonth] = useState(() => toMonthKey());
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const currency = user?.preferredCurrency || 'INR';
  const threshold = user?.warningThreshold || 80;

  const { data, loading, error, refetch } = useApi(
    async () => {
      const [budgetData, categoryData] = await Promise.all([
        budgetsApi.list({ period: month }),
        categoriesApi.list({ type: 'expense' }),
      ]);
      return { budgetData, categoryData };
    },
    [month, version],
  );

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return (
      <ErrorState
        title="Budgets could not load"
        message={getErrorMessage(error)}
        onRetry={refetch}
        className="min-h-[55vh]"
      />
    );
  }

  const budget = data.budgetData;
  const categories = data.categoryData.categories;
  const overall = budget.overall;
  const categoryBudgetIds = budget.categories.map((item) => item.category.id);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await budgetsApi.remove(deleting.id);
      toast.success('Budget removed.');
      setDeleting(null);
      refetch();
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, 'Could not remove this budget.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Planning"
        title="Budgets"
        description="Set monthly limits by category, see what is left, and get warned before you overspend."
        actions={
          <>
            <div className="relative">
              <CalendarDays
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
                aria-hidden="true"
              />
              <label htmlFor="budget-month" className="sr-only">
                Budget month
              </label>
              <input
                id="budget-month"
                type="month"
                value={month}
                onChange={(event) => event.target.value && setMonth(event.target.value)}
                className="h-10 rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-ink shadow-sm"
              />
            </div>
            <Button onClick={() => setModal({ kind: 'category' })}>
              <Plus size={16} aria-hidden="true" />
              Add category budget
            </Button>
          </>
        }
      />

      <section
        className={`grid gap-4 lg:grid-cols-12 ${overall ? '' : 'lg:grid-cols-1'}`}
        aria-label="Overall budget"
      >
        <Card className={`p-5 sm:p-6 ${overall ? 'lg:col-span-8' : ''}`}>
          <CardHeader
            title="Overall monthly budget"
            description={`All expenses in ${formatMonth(month, 'MMMM yyyy')}`}
            action={
              overall && (
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
                  {overall.status === 'exceeded'
                    ? 'Exceeded'
                    : overall.status === 'warning'
                      ? 'Approaching limit'
                      : 'On track'}
                </Badge>
              )
            }
          />
          {overall ? (
            <div className="mt-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] text-ink-subtle">Spent of limit</p>
                  <p className="financial-number mt-1 text-[28px] font-bold leading-none text-ink">
                    {formatCurrency(overall.spentPaise, currency)}
                  </p>
                  <p className="mt-1.5 text-xs text-ink-subtle">
                    of {formatCurrency(overall.monthlyLimitPaise, currency)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className={`financial-number text-sm font-semibold ${overall.remainingPaise < 0 ? 'text-expense' : 'text-income'}`}>
                    {overall.remainingPaise < 0 ? 'Over by ' : 'Remaining '}
                    {formatCurrency(Math.abs(overall.remainingPaise), currency)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-subtle">
                    {formatPercent(overall.percentage)} used
                  </p>
                </div>
              </div>
              <ProgressBar
                percentage={overall.percentage}
                status={overall.status}
                height="h-2.5"
                className="mt-5"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setModal({ kind: 'overall', budget: overall })}
                >
                  <Pencil size={13} aria-hidden="true" />
                  Edit limit
                </Button>
                <Button
                  variant="dangerSoft"
                  size="sm"
                  onClick={() =>
                    setDeleting({
                      id: overall.id,
                      description: `Overall budget for ${formatMonth(month, 'MMMM yyyy')}`,
                    })
                  }
                >
                  <Trash2 size={13} aria-hidden="true" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Wallet}
              title="No overall budget for this month"
              description="Set one limit to track total spending and spot overspending early."
              action={
                <Button size="sm" onClick={() => setModal({ kind: 'overall' })}>
                  <Plus size={14} aria-hidden="true" />
                  Set overall budget
                </Button>
              }
              className="py-8"
            />
          )}
        </Card>

        {overall && (
          <Card className="p-5 lg:col-span-4">
            <CardHeader title="How it works" description="A simple monthly guardrail" />
            <div className="mt-4 space-y-3 text-[11px] leading-5 text-ink-subtle">
              <div className="flex justify-between gap-3">
                <span>Warning threshold</span>
                <Badge variant="warning">{threshold}%</Badge>
              </div>
              <p>
                Category budgets are independent limits. Their total can be higher or lower than
                the overall budget.
              </p>
              <p>Income is never counted as spending. Only expenses affect budget progress.</p>
              <button
                type="button"
                onClick={() => setModal({ kind: 'overall', budget: overall })}
                className="font-semibold text-brand-700 hover:underline dark:text-brand-400"
              >
                Adjust your limit
              </button>
            </div>
          </Card>
        )}
      </section>

      {(budget.warningCount > 0 || budget.exceededCount > 0) && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {budget.exceededCount > 0 && (
              <strong className="font-semibold">
                {budget.exceededCount} category {budget.exceededCount === 1 ? 'budget is' : 'budgets are'} over limit.
              </strong>
            )}{' '}
            {budget.warningCount > 0 &&
              `${budget.warningCount} ${budget.warningCount === 1 ? 'is' : 'are'} approaching the warning threshold.`}{' '}
            Review the categories below.
          </span>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-line p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-ink">Category budgets</h2>
            <p className="mt-1 text-xs text-ink-subtle">
              {budget.categories.length} {budget.categories.length === 1 ? 'limit' : 'limits'} for{' '}
              {formatMonth(month, 'MMMM yyyy')}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setModal({ kind: 'category' })}>
            <Plus size={14} aria-hidden="true" />
            Add category
          </Button>
        </div>

        {budget.categories.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="No category budgets yet"
            description="Put smaller guardrails around the categories where you want more control."
            action={
              <Button size="sm" onClick={() => setModal({ kind: 'category' })}>
                <Plus size={14} aria-hidden="true" />
                Add category budget
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {budget.categories.map((item) => (
              <div
                key={item.id}
                className="group rounded-xl border border-line bg-surface-soft p-4 transition-colors hover:border-line-strong"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <CategoryIcon icon={item.category.icon} color={item.category.color} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-ink">
                        {item.category.name}
                      </p>
                      <p className="mt-0.5 text-[10px] text-ink-subtle">
                        {formatCurrency(item.monthlyLimitPaise, currency)} limit
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      item.status === 'exceeded'
                        ? 'expense'
                        : item.status === 'warning'
                          ? 'warning'
                          : 'brand'
                    }
                  >
                    {formatPercent(item.percentage)}
                  </Badge>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="financial-number text-base font-bold text-ink">
                      {formatCurrency(item.spentPaise, currency)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-subtle">spent</p>
                  </div>
                  <p
                    className={`financial-number text-[11px] font-semibold ${
                      item.remainingPaise < 0 ? 'text-expense' : 'text-ink-muted'
                    }`}
                  >
                    {item.remainingPaise < 0 ? 'Over by ' : ''}
                    {formatCurrency(Math.abs(item.remainingPaise), currency)}
                    {item.remainingPaise >= 0 ? ' left' : ''}
                  </p>
                </div>

                <ProgressBar
                  percentage={item.percentage}
                  status={item.status}
                  className="mt-3"
                />

                <div className="mt-3 flex justify-end gap-1 border-t border-line pt-2.5">
                  <button
                    type="button"
                    onClick={() => setModal({ kind: 'category', budget: item })}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-ink-subtle hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <Pencil size={12} aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleting({
                        id: item.id,
                        description: `${item.category.name} budget for ${formatMonth(month, 'MMMM yyyy')}`,
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-ink-subtle hover:bg-rose-50 hover:text-expense focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-rose-500/10"
                  >
                    <Trash2 size={12} aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <BudgetFormModal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        budget={modal?.budget}
        kind={modal?.kind || 'category'}
        period={month}
        categories={categories}
        existingCategoryIds={categoryBudgetIds}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Remove budget?"
        message={
          deleting
            ? `${deleting.description} will be removed. Your transactions will not be changed.`
            : ''
        }
        confirmLabel="Remove budget"
      />
    </div>
  );
}
