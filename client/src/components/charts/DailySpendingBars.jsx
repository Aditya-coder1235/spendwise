import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from '../ui/States.jsx';
import { formatCurrency } from '../../utils/format.js';
import { formatDisplayDate } from '../../utils/date.js';
import { ChartTooltip } from './ChartTooltip.jsx';

export function DailySpendingBars({ days = [], currency = 'INR', height = 280, emptyAction }) {
  const hasData = days.some((day) => day.amountPaise > 0);
  if (!hasData) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No daily spending this month"
        description="Pick another month or add an expense to see the daily pattern."
        action={emptyAction}
        className="py-10"
      />
    );
  }

  const data = days.map((day) => ({
    ...day,
    day: Number(day.date.slice(-2)),
  }));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--ink-subtle)', fontSize: 10 }}
            interval={2}
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
                labelFormatter={(_value, payload) =>
                  payload?.[0]?.payload?.date
                    ? formatDisplayDate(payload[0].payload.date, 'DD/MM/YYYY')
                    : ''
                }
              />
            }
          />
          <Bar
            dataKey="amountPaise"
            name="Spent"
            fill="#0f766e"
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
