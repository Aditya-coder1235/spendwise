import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from '../ui/States.jsx';
import { formatCurrency } from '../../utils/format.js';
import { formatMonth } from '../../utils/date.js';
import { ChartTooltip } from './ChartTooltip.jsx';

export function IncomeExpenseBars({ trends = [], currency = 'INR', height = 290, emptyAction }) {
  const hasData = trends.some((item) => item.incomePaise > 0 || item.expensePaise > 0);
  if (!hasData) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Nothing to compare yet"
        description="Income and expense bars will appear once there are transactions in this range."
        action={emptyAction}
        className="py-10"
      />
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={trends} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={3}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="period"
            tickFormatter={(value) => formatMonth(value, 'MMM')}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--ink-subtle)', fontSize: 11 }}
            dy={8}
          />
          <YAxis
            tickFormatter={(value) => formatCurrency(value, currency, { compact: true })}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--ink-subtle)', fontSize: 10 }}
            width={56}
          />
          <Tooltip
            cursor={{ fill: 'var(--surface-muted)', opacity: 0.7 }}
            content={
              <ChartTooltip
                currency={currency}
                labelFormatter={(value) => formatMonth(value, 'MMMM yyyy')}
              />
            }
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={30}
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ fontSize: 11, color: 'var(--ink-muted)' }}
          />
          <Bar
            dataKey="incomePaise"
            name="Income"
            fill="#059669"
            radius={[5, 5, 0, 0]}
            maxBarSize={30}
            isAnimationActive={false}
          />
          <Bar
            dataKey="expensePaise"
            name="Expenses"
            fill="#e11d48"
            radius={[5, 5, 0, 0]}
            maxBarSize={30}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
