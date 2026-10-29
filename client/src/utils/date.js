import {
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from 'date-fns';

export const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

export function toDateKey(date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}

export function toMonthKey(date = new Date()) {
  return format(date, 'yyyy-MM');
}

export function parseDateKey(value) {
  if (!value) return null;
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getPeriodRange(period, custom = {}, now = new Date()) {
  if (period === 'today') {
    return { startDate: toDateKey(now), endDate: toDateKey(now) };
  }
  if (period === 'week') {
    return {
      startDate: toDateKey(startOfWeek(now, { weekStartsOn: 1 })),
      endDate: toDateKey(now),
    };
  }
  if (period === 'last_month') {
    const previous = subMonths(now, 1);
    return {
      startDate: toDateKey(startOfMonth(previous)),
      endDate: toDateKey(endOfMonth(previous)),
    };
  }
  if (period === 'year') {
    return { startDate: toDateKey(startOfYear(now)), endDate: toDateKey(now) };
  }
  if (period === 'custom' && custom.startDate && custom.endDate) {
    return { startDate: custom.startDate, endDate: custom.endDate };
  }
  if (period === 'month') {
    return { startDate: toDateKey(startOfMonth(now)), endDate: toDateKey(now) };
  }
  return {
    startDate: toDateKey(startOfMonth(now)),
    endDate: toDateKey(now),
  };
}

export function getLastMonthsRange(months = 6, now = new Date()) {
  return {
    startDate: toDateKey(startOfMonth(subMonths(now, months - 1))),
    endDate: toDateKey(endOfMonth(now)),
  };
}

export function previousDateRange(startDate, endDate) {
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  if (!start || !end) return null;
  const days = Math.round((end - start) / 86_400_000) + 1;
  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (days - 1));
  return { startDate: toDateKey(previousStart), endDate: toDateKey(previousEnd) };
}

export function periodLabel(period, range) {
  const option = PERIOD_OPTIONS.find((item) => item.value === period);
  if (period === 'custom' && range?.startDate && range?.endDate) {
    return `${formatDisplayDate(range.startDate, 'DD/MM/YYYY')} – ${formatDisplayDate(
      range.endDate,
      'DD/MM/YYYY',
    )}`;
  }
  return option?.label || 'This month';
}

const FORMAT_PATTERNS = {
  'DD/MM/YYYY': 'dd/MM/yyyy',
  'MM/DD/YYYY': 'MM/dd/yyyy',
  'YYYY-MM-DD': 'yyyy-MM-dd',
};

export function formatDisplayDate(value, dateFormat = 'DD/MM/YYYY') {
  if (!value) return '—';
  const date = value instanceof Date ? value : parseISO(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, FORMAT_PATTERNS[dateFormat] || 'dd MMM yyyy');
}

export function formatMonth(period, formatToken = 'MMM yyyy') {
  if (!period) return '—';
  const date = parseISO(`${period}-01`);
  return Number.isNaN(date.getTime()) ? '—' : format(date, formatToken);
}

export function formatDateRangeLabel(startDate, endDate) {
  if (!startDate || !endDate) return '—';
  if (startDate === endDate) return formatDisplayDate(startDate, 'DD/MM/YYYY');
  return `${formatDisplayDate(startDate, 'DD/MM/YYYY')} – ${formatDisplayDate(
    endDate,
    'DD/MM/YYYY',
  )}`;
}

export function currentMonthDays(month) {
  const start = parseISO(`${month}-01`);
  return { start: startOfWeek(start, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(start)) };
}

export function isFutureDate(value) {
  return value > toDateKey(new Date());
}
