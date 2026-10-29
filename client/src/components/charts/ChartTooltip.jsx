import { formatCurrency } from '../../utils/format.js';

export function ChartTooltip({ active, payload, label, currency = 'INR', labelFormatter }) {
  if (!active || !payload?.length) return null;
  const title = labelFormatter ? labelFormatter(label, payload) : label;

  return (
    <div className="min-w-[150px] rounded-xl border border-line bg-surface px-3 py-2.5 shadow-xl">
      {title && <p className="mb-1.5 text-[11px] font-semibold text-ink">{title}</p>}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div
            key={`${entry.dataKey}-${entry.name}`}
            className="flex items-center justify-between gap-4 text-[11px]"
          >
            <span className="flex items-center gap-1.5 text-ink-subtle">
              {entry.color && (
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                  aria-hidden="true"
                />
              )}
              {entry.name}
            </span>
            <span className="financial-number font-semibold text-ink">
              {formatCurrency(entry.value, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
