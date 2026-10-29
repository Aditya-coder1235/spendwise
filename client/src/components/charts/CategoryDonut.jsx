import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { EmptyState } from '../ui/States.jsx';
import { formatCurrency, formatPercent } from '../../utils/format.js';
import { ChartTooltip } from './ChartTooltip.jsx';

export function CategoryDonut({ items = [], currency = 'INR', totalPaise = 0, emptyAction }) {
  const data = items.filter((item) => item.amountPaise > 0);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={PieIcon}
        title="No spending in this period"
        description="Add an expense or choose a different date range to see your category mix."
        action={emptyAction}
        className="py-10"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(170px,0.8fr)_minmax(180px,1.2fr)] sm:items-center">
      <div className="relative mx-auto h-[210px] w-full max-w-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amountPaise"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="66%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="var(--surface)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.categoryId || entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-medium uppercase tracking-wide text-ink-subtle">Spent</span>
          <span className="financial-number mt-0.5 text-lg font-bold text-ink">
            {formatCurrency(totalPaise, currency, { compact: true })}
          </span>
        </div>
      </div>

      <div className="thin-scrollbar max-h-[230px] space-y-2 overflow-y-auto pr-1">
        {data.map((item) => (
          <div
            key={item.categoryId || item.name}
            className="flex items-center justify-between gap-3 rounded-lg px-1 py-1"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="truncate text-xs text-ink-muted">{item.name}</span>
            </div>
            <div className="shrink-0 text-right">
              <span className="financial-number block text-xs font-semibold text-ink">
                {formatCurrency(item.amountPaise, currency)}
              </span>
              <span className="block text-[10px] text-ink-subtle">{formatPercent(item.percentage)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
