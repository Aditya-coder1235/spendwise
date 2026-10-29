import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  ChartPie,
  PiggyBank,
  Plus,
  ReceiptText,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { ErrorState, EmptyState } from '../components/ui/States.jsx';
import { PageSkeleton } from '../components/ui/Skeleton.jsx';
import { ProgressBar } from '../components/ui/ProgressBar.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { CategoryIcon } from '../components/ui/CategoryIcon.jsx';
import { PeriodFilter } from '../components/dashboard/PeriodFilter.jsx';
import { SummaryCard } from '../components/dashboard/SummaryCard.jsx';
import { IncomeExpenseBars } from '../components/charts/IncomeExpenseBars.jsx';
import { CategoryDonut } from '../components/charts/CategoryDonut.jsx';
import { SpendingTrend } from '../components/charts/SpendingTrend.jsx';
import { DailySpendingBars } from '../components/charts/DailySpendingBars.jsx';
import { useQuickAdd } from '../features/transactions/QuickAddContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { analyticsApi, budgetsApi, getErrorMessage } from '../services/api.js';
import {
  formatCurrency,
  formatPercent,
} from '../utils/format.js';
import {
  formatDateRangeLabel,
  formatMonth,
  getPeriodRange,
  toMonthKey,
} from '../utils/date.js';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { openQuickAdd, version } = useQuickAdd();
  const [period, setPeriod] = useState('month');
  const [customRange, setCustomRange] = useState(() => getPeriodRange('month'));
  const [dailyMonth, setDailyMonth] = useState(() => toMonthKey());
  const range = getPeriodRange(period, customRange);
  const currency = user?.preferredCurrency || 'INR';

  const { data, loading, error, refetch } = useApi(
    async () => {
      const [categoryData, trendData, dailyData, budgetData] = await Promise.all([
        analyticsApi.categories({ ...range, type: 'expense' }),
        analyticsApi.trends(range),
        analyticsApi.daily({ month: dailyMonth, type: 'expense' }),
        budgetsApi.list({ period: dailyMonth }),
      ]);
      return { categoryData, trendData, dailyData, budgetData };
    },
    [range.startDate, range.endDate, dailyMonth, version],
  );

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return (
      <ErrorState
        title="Analytics could not load"
        message={getErrorMessage(error)}
        onRetry={refetch}
        className="min-h-[55vh]"
      />
    );
  }

  const trends = data.trendData.trends;
  const totalIncome = trends.reduce((sum, item) => sum + item.incomePaise, 0);
  const totalExpense = trends.reduce((sum, item) => sum + item.expensePaise, 0);
  const netSavings = totalIncome - totalExpense;
  const averageSpend = trends.length ? Math.round(totalExpense / trends.length) : 0;
  const topCategory = data.categoryData.items[0];
  const budgetCategories = data.budgetData.categories || [];
  const overallBudget = data.budgetData.overall;

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="See the shape of your spending: categories, comparisons, daily patterns, and budget use."
        actions={
          <Button onClick={() => openQuickAdd('expense')}>
            <Plus size={16} aria-hidden="true" />
            Add expense
          </Button>
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
          {formatDateRangeLabel(range.startDate, range.endDate)}
        </p>
      </div>

      <section className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-4 xl:grid-cols-4" aria-label="Analytics summary">
        <SummaryCard
          label="Income in range"
          value={formatCurrency(totalIncome, currency)}
          icon={TrendingUp}
          accent="income"
          hint={formatDateRangeLabel(range.startDate, range.endDate)}
        />
        <SummaryCard
          label="Expenses in range"
          value={formatCurrency(totalExpense, currency)}
          icon={TrendingDown}
          accent="expense"
          hint={`${data.categoryData.items.length} categories used`}
        />
        <SummaryCard
          label="Net savings"
          value={formatCurrency(netSavings, currency)}
          icon={PiggyBank}
          accent={netSavings >= 0 ? 'savings' : 'expense'}
          hint={totalIncome > 0 ? `${formatPercent((netSavings / totalIncome) * 100)} of income` : 'No income recorded'}
        />
        <SummaryCard
          label="Average monthly spend"
          value={formatCurrency(averageSpend, currency)}
          icon={BarChart3}
          accent="warning"
          hint={`Across ${trends.length} ${trends.length === 1 ? 'month' : 'months'}`}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-12">
        <Card className="p-5 xl:col-span-7">
          <CardHeader
            title="Income vs expenses"
            description="Monthly totals across the selected range"
            action={<Badge variant="neutral">{formatDateRangeLabel(range.startDate, range.endDate)}</Badge>}
          />
          <div className="mt-4">
            <IncomeExpenseBars trends={trends} currency={currency} height={300} />
          </div>
        </Card>

        <Card className="p-5 xl:col-span-5">
          <CardHeader title="Expense categories" description="Share of spending in this range" />
          <div className="mt-5">
            <CategoryDonut
              items={data.categoryData.items}
              totalPaise={data.categoryData.totalPaise}
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
            title="Monthly spending trend"
            description="How expenses move across the selected months"
          />
          <div className="mt-4">
            <SpendingTrend trends={trends} currency={currency} height={280} />
          </div>
        </Card>

        <Card className="p-5 xl:col-span-5">
          <CardHeader
            title="Daily spending"
            description={`Expenses for ${formatMonth(dailyMonth, 'MMMM yyyy')}`}
            action={
              <div className="relative">
                <CalendarDays
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle"
                  aria-hidden="true"
                />
                <label htmlFor="daily-month" className="sr-only">
                  Month for daily spending
                </label>
                <input
                  id="daily-month"
                  type="month"
                  value={dailyMonth}
                  onChange={(event) => event.target.value && setDailyMonth(event.target.value)}
                  className="h-8 rounded-lg border border-line bg-surface pl-8 pr-2 text-[11px] text-ink-muted"
                />
              </div>
            }
          />
          <div className="mt-4">
            <DailySpendingBars
              days={data.dailyData.days}
              currency={currency}
              height={280}
            />
          </div>
        </Card>

        <Card className="p-5 xl:col-span-6">
          <CardHeader
            title="Top spending categories"
            description={`Ranked for ${formatDateRangeLabel(range.startDate, range.endDate)}`}
          />
          {data.categoryData.items.length === 0 ? (
            <EmptyState icon={ChartPie} title="No spending to rank" className="py-10" />
          ) : (
            <div className="mt-4 space-y-4">
              {data.categoryData.items.slice(0, 6).map((item, index) => (
                <div key={item.categoryId} className="flex items-center gap-3">
                  <span className="w-4 shrink-0 text-[11px] font-semibold text-ink-subtle">
                    {index + 1}
                  </span>
                  <CategoryIcon icon={item.icon} color={item.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-xs font-medium text-ink">{item.name}</span>
                      <span className="financial-number shrink-0 text-xs font-semibold text-ink">
                        {formatCurrency(item.amountPaise, currency)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                        />
                      </div>
                      <span className="w-10 text-right text-[10px] text-ink-subtle">
                        {formatPercent(item.percentage, '0%')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 xl:col-span-6">
          <CardHeader
            title="Budget utilization"
            description={`Limits and spending for ${formatMonth(dailyMonth, 'MMMM yyyy')}`}
            action={
              <Link
                to="/budgets"
                className="text-[11px] font-semibold text-brand-700 hover:underline dark:text-brand-400"
              >
                Manage
              </Link>
            }
          />
          {!overallBudget && budgetCategories.length === 0 ? (
            <EmptyState
              icon={PiggyBank}
              title="No budgets for this month"
              description="Add an overall or category budget to compare spending against your plan."
              action={
                <Link
                  to="/budgets"
                  className="inline-flex h-9 items-center rounded-xl border border-line bg-surface px-3 text-[13px] font-semibold text-ink shadow-sm hover:bg-surface-muted"
                >
                  Set budgets
                </Link>
              }
              className="py-10"
            />
          ) : (
            <div className="mt-4 space-y-4">
              {overallBudget && (
                <div className="rounded-xl border border-line bg-surface-soft p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-xs font-semibold text-ink">
                      <ReceiptText size={14} className="text-brand-600" aria-hidden="true" />
                      Overall budget
                    </span>
                    <Badge
                      variant={
                        overallBudget.status === 'exceeded'
                          ? 'expense'
                          : overallBudget.status === 'warning'
                            ? 'warning'
                            : 'brand'
                      }
                    >
                      {formatPercent(overallBudget.percentage)} used
                    </Badge>
                  </div>
                  <ProgressBar
                    percentage={overallBudget.percentage}
                    status={overallBudget.status}
                    className="mt-2.5"
                  />
                  <div className="mt-2 flex justify-between text-[10px] text-ink-subtle">
                    <span>{formatCurrency(overallBudget.spentPaise, currency)} spent</span>
                    <span>{formatCurrency(overallBudget.monthlyLimitPaise, currency)} limit</span>
                  </div>
                </div>
              )}
              {budgetCategories.slice(0, 5).map((item) => (
                <div key={item.id}>
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="flex min-w-0 items-center gap-2">
                      <CategoryIcon
                        icon={item.category.icon}
                        color={item.category.color}
                        size="sm"
                        className="size-6"
                      />
                      <span className="truncate text-ink-muted">{item.category.name}</span>
                    </span>
                    <span className="financial-number shrink-0 font-medium text-ink">
                      {formatCurrency(item.spentPaise, currency)} /{' '}
                      {formatCurrency(item.monthlyLimitPaise, currency)}
                    </span>
                  </div>
                  <ProgressBar
                    percentage={item.percentage}
                    status={item.status}
                    height="h-1.5"
                    className="mt-1.5"
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {topCategory && (
        <p className="text-center text-[10px] text-ink-subtle">
          Largest category: {topCategory.name} at {formatPercent(topCategory.percentage)} of spending.
          Totals reconcile with {data.categoryData.items.reduce((sum, item) => sum + item.count, 0)}{' '}
          expense entries.
        </p>
      )}
    </div>
  );
}
