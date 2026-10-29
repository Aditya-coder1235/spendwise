import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  ArrowRight,
  PiggyBank,
  Plus,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { ErrorState, EmptyState } from '../components/ui/States.jsx';
import { PageSkeleton } from '../components/ui/Skeleton.jsx';
import { SummaryCard } from '../components/dashboard/SummaryCard.jsx';
import { PeriodFilter } from '../components/dashboard/PeriodFilter.jsx';
import { CategoryDonut } from '../components/charts/CategoryDonut.jsx';
import { IncomeExpenseBars } from '../components/charts/IncomeExpenseBars.jsx';
import { SpendingTrend } from '../components/charts/SpendingTrend.jsx';
import { BudgetOverviewCard } from '../features/budgets/BudgetOverviewCard.jsx';
import { TransactionItem } from '../features/transactions/TransactionItem.jsx';
import { useQuickAdd } from '../features/transactions/QuickAddContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { analyticsApi, dashboardApi, getErrorMessage } from '../services/api.js';
import { formatCurrency, formatPercent } from '../utils/format.js';
import { formatDateRangeLabel, formatMonth, getPeriodRange, periodLabel } from '../utils/date.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const { openQuickAdd, version } = useQuickAdd();
  const [period, setPeriod] = useState('month');
  const [customRange, setCustomRange] = useState(() => getPeriodRange('month'));
  const range = getPeriodRange(period, customRange);

  const {
    data,
    loading,
    error,
    refetch,
  } = useApi(
    () => dashboardApi.summary(range),
    [range.startDate, range.endDate, version],
  );

  const {
    data: trendData,
    loading: trendsLoading,
    error: trendsError,
    refetch: refetchTrends,
  } = useApi(
    () => analyticsApi.incomeExpenses(range),
    [range.startDate, range.endDate, version],
  );

  const currency = user?.preferredCurrency || 'INR';
  const trends = trendData?.trends || [];
  const summary = data;

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return (
      <ErrorState
        title="Your dashboard could not load"
        message={getErrorMessage(error)}
        onRetry={refetch}
        className="min-h-[55vh]"
      />
    );
  }

  const budgetWarning =
    summary?.budget?.overall &&
    ['warning', 'exceeded'].includes(summary.budget.overall.status);
  const topCategory = summary?.categoryBreakdown?.items?.[0];

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Overview"
        title={`Good to see you, ${user?.name?.split(' ')[0] || 'there'}`}
        description="Your income, spending, and budget health for the period you choose — calculated from your recorded transactions."
        actions={
          <>
            <Button variant="secondary" onClick={() => openQuickAdd('income')}>
              <TrendingUp size={15} aria-hidden="true" />
              Add income
            </Button>
            <Button onClick={() => openQuickAdd('expense')}>
              <Plus size={16} aria-hidden="true" />
              Add expense
            </Button>
          </>
        }
      />

      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <PeriodFilter
          period={period}
          onPeriodChange={setPeriod}
          range={range}
          onRangeChange={setCustomRange}
        />
        <p className="text-[11px] text-ink-subtle lg:text-right">
          Showing {formatDateRangeLabel(range.startDate, range.endDate)}
        </p>
      </div>

      {budgetWarning && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-start gap-2">
            <Wallet size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <strong className="font-semibold">
                {summary.budget.overall.status === 'exceeded'
                  ? 'Monthly budget exceeded.'
                  : `You've used ${formatPercent(summary.budget.overall.percentage)} of your monthly budget.`}
              </strong>{' '}
              {formatMonth(summary.budget.period)} spending is{' '}
              {formatCurrency(summary.budget.totalSpentPaise, currency)} of{' '}
              {formatCurrency(summary.budget.overall.monthlyLimitPaise, currency)}.
            </span>
          </span>
          <Link
            to="/budgets"
            className="shrink-0 font-semibold underline underline-offset-4 hover:no-underline"
          >
            Review budgets →
          </Link>
        </div>
      )}

      <section
        className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-4 xl:grid-cols-4"
        aria-label="Financial summary"
      >
        <SummaryCard
          label="Total balance"
          value={formatCurrency(summary.totalBalancePaise, currency)}
          icon={Wallet}
          accent="brand"
          hint="Across all recorded activity"
        />
        <SummaryCard
          label={`Income · ${periodLabel(period, range)}`}
          value={formatCurrency(summary.incomePaise, currency)}
          icon={TrendingUp}
          accent="income"
          trend={{
            value: summary.comparison.incomeChangePercent,
            label: 'vs previous period',
          }}
          hint="No previous income to compare"
        />
        <SummaryCard
          label="Expenses"
          value={formatCurrency(summary.expensePaise, currency)}
          icon={TrendingDown}
          accent="expense"
          trend={{
            value: summary.comparison.expenseChangePercent,
            label: 'vs previous period',
            tone: 'inverse',
          }}
          hint="No previous spending to compare"
        />
        <SummaryCard
          label="Net savings"
          value={formatCurrency(summary.netSavingsPaise, currency)}
          icon={PiggyBank}
          accent={summary.netSavingsPaise >= 0 ? 'savings' : 'expense'}
          trend={{
            value: summary.comparison.savingsChangePercent,
            label: 'vs previous period',
          }}
          hint={
            summary.savingsRate !== null
              ? `${formatPercent(summary.savingsRate)} of income saved`
              : 'Income minus expenses'
          }
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-12">
        <Card className="p-5 xl:col-span-8">
          <CardHeader
            title="Monthly spending trend"
            description={`Expense trend for ${formatDateRangeLabel(range.startDate, range.endDate)}`}
          />
          <div className="mt-4">
            {trendsError ? (
              <ErrorState message={getErrorMessage(trendsError)} onRetry={refetchTrends} className="py-10" />
            ) : trendsLoading && !trendData ? (
              <div className="skeleton h-[290px] rounded-xl" aria-label="Loading chart" />
            ) : (
              <SpendingTrend trends={trends} currency={currency} height={290} />
            )}
          </div>
        </Card>

        <div className="xl:col-span-4">
          <BudgetOverviewCard
            budget={summary.budget}
            currency={currency}
            warningThreshold={user?.warningThreshold || 80}
          />
        </div>

        <Card className="p-5 xl:col-span-5">
          <CardHeader
            title="Spending by category"
            description="Where your expenses went in this period"
            action={
              summary.expensePaise > 0 ? (
                <Link
                  to="/analytics"
                  className="text-[11px] font-semibold text-brand-700 hover:underline dark:text-brand-400"
                >
                  Details
                </Link>
              ) : null
            }
          />
          <div className="mt-5">
            <CategoryDonut
              items={summary.categoryBreakdown.items}
              totalPaise={summary.categoryBreakdown.totalPaise}
              currency={currency}
              emptyAction={
                <Button size="sm" variant="secondary" onClick={() => openQuickAdd('expense')}>
                  Add an expense
                </Button>
              }
            />
          </div>
        </Card>

        <Card className="p-5 xl:col-span-7">
          <CardHeader
            title="Income vs expenses"
            description={`Monthly comparison for ${periodLabel(period, range)}`}
          />
          <div className="mt-4">
            {trendsError ? (
              <ErrorState message={getErrorMessage(trendsError)} onRetry={refetchTrends} className="py-10" />
            ) : trendsLoading && !trendData ? (
              <div className="skeleton h-[290px] rounded-xl" aria-label="Loading chart" />
            ) : (
              <IncomeExpenseBars trends={trends} currency={currency} height={290} />
            )}
          </div>
        </Card>

        <Card className="p-5 xl:col-span-8">
          <CardHeader
            title="Recent transactions"
            description="The latest activity in this period"
            action={
              <Link
                to="/transactions"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline dark:text-brand-400"
              >
                View all
                <ArrowRight size={12} aria-hidden="true" />
              </Link>
            }
          />
          {summary.recentTransactions.length > 0 ? (
            <div className="mt-3 divide-y divide-line">
              {summary.recentTransactions.map((transaction) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ReceiptText}
              title="No transactions in this period"
              description="Try another date range or record your first entry."
              action={
                <Button size="sm" onClick={() => openQuickAdd('expense')}>
                  <Plus size={14} aria-hidden="true" />
                  Add transaction
                </Button>
              }
            />
          )}
        </Card>

        <Card className="flex flex-col p-5 xl:col-span-4">
          <CardHeader title="Period insights" description="A quick read on selected dates" />
          <div className="mt-5 flex flex-1 flex-col gap-4">
            <div className="rounded-xl bg-surface-soft p-3.5">
              <p className="text-[11px] text-ink-subtle">Transactions recorded</p>
              <p className="financial-number mt-1 text-xl font-bold text-ink">
                {summary.transactionCount}
              </p>
              <p className="mt-1 text-[10px] text-ink-subtle">
                {summary.incomePaise > 0 ? `${formatPercent(summary.savingsRate ?? 0)} savings rate` : 'No income recorded yet'}
              </p>
            </div>
            <div className="rounded-xl bg-surface-soft p-3.5">
              <p className="text-[11px] text-ink-subtle">Largest spending category</p>
              {topCategory ? (
                <>
                  <p className="mt-1 truncate text-sm font-semibold text-ink">{topCategory.name}</p>
                  <p className="financial-number mt-1 text-[11px] text-ink-subtle">
                    {formatCurrency(topCategory.amountPaise, currency)} ·{' '}
                    {formatPercent(topCategory.percentage)} of expenses
                  </p>
                </>
              ) : (
                <p className="mt-1 text-xs text-ink-muted">No expenses yet</p>
              )}
            </div>
            <div className="rounded-xl bg-surface-soft p-3.5">
              <p className="text-[11px] text-ink-subtle">Income vs expense difference</p>
              <p
                className={`financial-number mt-1 text-sm font-semibold ${
                  summary.netSavingsPaise >= 0 ? 'text-income' : 'text-expense'
                }`}
              >
                {summary.netSavingsPaise >= 0 ? 'Saved ' : 'Spent more than income '}
                {formatCurrency(Math.abs(summary.netSavingsPaise), currency)}
              </p>
            </div>
            <Link
              to="/reports"
              className="mt-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-700 hover:underline dark:text-brand-400"
            >
              <ArrowLeftRight size={12} aria-hidden="true" />
              Build a detailed report
            </Link>
          </div>
        </Card>
      </section>

      <p className="text-center text-[10px] text-ink-subtle">
        All figures are calculated live from your records. Savings = income − expenses.
      </p>
    </div>
  );
}
