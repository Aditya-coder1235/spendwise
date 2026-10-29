import { CalendarDays } from 'lucide-react';
import { Input } from '../ui/FormControls.jsx';
import { formatDateRangeLabel, PERIOD_OPTIONS } from '../../utils/date.js';

export function PeriodFilter({
  period,
  onPeriodChange,
  range,
  onRangeChange,
  className = '',
}) {
  const updateCustom = (field, value) => {
    const next = { ...range, [field]: value };
    if (!next.startDate || !next.endDate) return;
    if (next.startDate <= next.endDate) onRangeChange(next);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="thin-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1"
          role="group"
          aria-label="Date range presets"
        >
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onPeriodChange(option.value)}
              aria-pressed={period === option.value}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                period === option.value
                  ? 'bg-surface-muted text-ink shadow-sm'
                  : 'text-ink-subtle hover:text-ink'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="hidden items-center gap-1.5 text-[11px] text-ink-subtle md:flex">
          <CalendarDays size={13} aria-hidden="true" />
          {formatDateRangeLabel(range.startDate, range.endDate)}
        </span>
      </div>

      {period === 'custom' && (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-1 block text-[11px] font-medium text-ink-muted">Start date</span>
            <Input
              type="date"
              value={range.startDate}
              max={range.endDate}
              onChange={(event) => updateCustom('startDate', event.target.value)}
              className="h-9 text-xs"
            />
          </label>
          <span className="hidden pb-2 text-xs text-ink-subtle sm:block">to</span>
          <label className="block flex-1">
            <span className="mb-1 block text-[11px] font-medium text-ink-muted">End date</span>
            <Input
              type="date"
              value={range.endDate}
              min={range.startDate}
              onChange={(event) => updateCustom('endDate', event.target.value)}
              className="h-9 text-xs"
            />
          </label>
        </div>
      )}
    </div>
  );
}
