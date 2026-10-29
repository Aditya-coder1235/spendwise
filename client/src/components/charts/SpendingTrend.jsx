import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { EmptyState } from '../ui/States.jsx';
import { formatCurrency } from '../../utils/format.js';
import { formatMonth } from '../../utils/date.js';
import { ChartTooltip } from './ChartTooltip.jsx';

export function SpendingTrend({ trends = [], currency = 'INR', height = 290, emptyAction }) {
  const hasData = trends.some((item) => item.expensePaise > 0);
  if (!hasData) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No spending trend yet"
        description="Your monthly expense trend will build up as you record transactions."
        action={emptyAction}
        className="py-10"
      />
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trends} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            content={
              <ChartTooltip
                currency={currency}
                labelFormatter={(value) => formatMonth(value, 'MMMM yyyy')}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="expensePaise"
            name="Expenses"
            stroke="#0f766e"
            strokeWidth={2.2}
            fill="#0f766e"
            fillOpacity={0.1}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
