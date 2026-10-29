import { useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  FileSpreadsheet,
  PiggyBank,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { ErrorState, EmptyState } from '../components/ui/States.jsx';
import { PageSkeleton } from '../components/ui/Skeleton.jsx';
import { CategoryIcon } from '../components/ui/CategoryIcon.jsx';
import { SummaryCard } from '../components/dashboard/SummaryCard.jsx';
import { PeriodFilter } from '../components/dashboard/PeriodFilter.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useQuickAdd } from '../features/transactions/QuickAddContext.jsx';
import { getErrorMessage, reportsApi } from '../services/api.js';
import {
  formatCurrency,
  formatPercent,
} from '../utils/format.js';
import {
  formatDateRangeLabel,
  formatMonth,
  getPeriodRange,
} from '../utils/date.js';

function Change({ value, inverse = false }) {
  if (value === null || value === undefined) {
    return <span className="text-[11px] text-ink-subtle">No prior data</span>;
  }
  const positive = value >= 0;
  const good = inverse ? !positive : positive;
  return (
    <span className={`text-[11px] font-semibold ${good ? 'text-income' : 'text-expense'}`}>
      {positive ? '↑' : '↓'} {formatPercent(Math.abs(value))}
    </span>
  );
}

function CategoryTable({ title, description, breakdown, currency }) {
  return (
    <Card className="p-5">
      <CardHeader title={title} description={description} />
      {breakdown.items.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No entries"
          description="Nothing in this category group for the selected period."
          className="py-9"
        />
      ) : (
        <div className="mt-4 space-y-3.5">
          {breakdown.items.map((item) => (
            <div key={item.categoryId} className="flex items-center gap-3">
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
                  <span className="w-12 text-right text-[10px] text-ink-subtle">
                    {item.count} {item.count === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const { version } = useQuickAdd();
  const [period, setPeriod] = useState('month');
  const [customRange, setCustomRange] = useState(() => getPeriodRange('month'));
  const [exporting, setExporting] = useState(false);
  const range = getPeriodRange(period, customRange);
  const currency = user?.preferredCurrency || 'INR';

  const { data, loading, error, refetch } = useApi(
    () => reportsApi.summary(range),
    [range.startDate, range.endDate, version],
  );

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return (
      <ErrorState
        title="Report could not load"
        message={getErrorMessage(error)}
        onRetry={refetch}
        className="min-h-[55vh]"
      />
    );
  }

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await reportsApi.exportCsv(range);
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `spendwise-${range.startDate}-to-${range.endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV export downloaded.');
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, 'Could not export transactions.'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="Reports"
        description="A clean summary of income, spending, savings, and category performance for any period."
        actions={
          <Button onClick={handleExport} loading={exporting} disabled={data.totals.transactionCount === 0}>
            <ArrowDownToLine size={15} aria-hidden="true" />
            Export CSV
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
          Report period: {formatDateRangeLabel(range.startDate, range.endDate)}
        </p>
      </div>

      <section className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-4 xl:grid-cols-4" aria-label="Report totals">
        <SummaryCard
          label="Total income"
          value={formatCurrency(data.totals.incomePaise, currency)}
          icon={TrendingUp}
          accent="income"
          hint={`${data.totals.incomeCount} entries`}
        />
        <SummaryCard
          label="Total expenses"
          value={formatCurrency(data.totals.expensePaise, currency)}
          icon={TrendingDown}
          accent="expense"
          hint={`${data.totals.expenseCount} entries`}
        />
        <SummaryCard
          label="Net savings"
          value={formatCurrency(data.netSavingsPaise, currency)}
          icon={PiggyBank}
          accent={data.netSavingsPaise >= 0 ? 'savings' : 'expense'}
          hint="Income minus expenses"
        />
        <SummaryCard
          label="Savings rate"
          value={data.savingsRate === null ? '—' : formatPercent(data.savingsRate)}
          icon={FileSpreadsheet}
          accent="brand"
          hint={data.savingsRate === null ? 'No income in range' : 'Share of income saved'}
        />
      </section>

      {data.totals.transactionCount === 0 ? (
        <Card>
          <EmptyState
            icon={FileSpreadsheet}
            title="No transactions in this report period"
            description="Choose another date range or record transactions to build a report."
            className="py-16"
          />
        </Card>
      ) : (
        <>
          <Card className="p-5">
            <CardHeader
              title="Period comparison"
              description={`Compared with ${formatDateRangeLabel(
                data.previousRange.startDate,
                data.previousRange.endDate,
              )}`}
            />
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  label: 'Income',
                  current: data.totals.incomePaise,
                  previous: data.comparison.previousIncomePaise,
                  change: data.comparison.incomeChangePercent,
                },
                {
                  label: 'Expenses',
                  current: data.totals.expensePaise,
                  previous: data.comparison.previousExpensePaise,
                  change: data.comparison.expenseChangePercent,
                  inverse: true,
                },
                {
                  label: 'Net savings',
                  current: data.netSavingsPaise,
                  previous: data.comparison.previousNetSavingsPaise,
                  change: data.comparison.savingsChangePercent,
                },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-line bg-surface-soft p-4">
                  <p className="text-[11px] text-ink-subtle">{item.label}</p>
                  <p className="financial-number mt-1 text-lg font-bold text-ink">
                    {formatCurrency(item.current, currency)}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-ink-subtle">
                      prev. {formatCurrency(item.previous, currency)}
                    </span>
                    <Change value={item.change} inverse={item.inverse} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-5">
              <CardHeader
                title="Monthly summaries"
                description="Income, expenses, and net savings by calendar month"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead>
                  <tr className="border-y border-line bg-surface-soft">
                    <th scope="col" className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">Month</th>
                    <th scope="col" className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">Income</th>
                    <th scope="col" className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">Expenses</th>
                    <th scope="col" className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">Net</th>
                    <th scope="col" className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">Entries</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.monthlySummaries.map((month) => (
                    <tr key={month.period} className="hover:bg-surface-soft/60">
                      <td className="px-5 py-3 text-xs font-medium text-ink">
                        {formatMonth(month.period, 'MMMM yyyy')}
                      </td>
                      <td className="financial-number px-3 py-3 text-right text-xs text-income">
                        {formatCurrency(month.incomePaise, currency)}
                      </td>
                      <td className="financial-number px-3 py-3 text-right text-xs text-expense">
                        {formatCurrency(month.expensePaise, currency)}
                      </td>
                      <td
                        className={`financial-number px-3 py-3 text-right text-xs font-semibold ${
                          month.netPaise >= 0 ? 'text-ink' : 'text-expense'
                        }`}
                      >
                        {formatCurrency(month.netPaise, currency)}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-ink-subtle">
                        {month.transactionCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CategoryTable
              title="Expense categories"
              description="Where money went in this period"
              breakdown={data.categoryBreakdown}
              currency={currency}
            />
            <CategoryTable
              title="Income sources"
              description="Where money came from in this period"
              breakdown={data.incomeBreakdown}
              currency={currency}
            />
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-soft px-4 py-3 text-[11px] text-ink-subtle">
        <span>
          Export includes the selected dates only. Transactions page export respects search, type,
          category, payment method, and date filters.
        </span>
        <ArrowRight size={14} className="hidden shrink-0 sm:block" aria-hidden="true" />
      </div>
    </div>
  );
}
