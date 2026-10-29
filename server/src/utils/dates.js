import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isValid,
  parse,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

const DATE_KEY = 'yyyy-MM-dd';
const PERIOD_KEY = 'yyyy-MM';

export function parseDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = parse(value, DATE_KEY, new Date());
  return isValid(date) && format(date, DATE_KEY) === value ? date : null;
}

export function parsePeriodKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) return null;
  const date = parse(`${value}-01`, DATE_KEY, new Date());
  return isValid(date) && format(date, PERIOD_KEY) === value ? date : null;
}

export function toDateKey(date) {
  return format(date, DATE_KEY);
}

export function toPeriodKey(date) {
  return format(date, PERIOD_KEY);
}

export function dayRange(startDateKey, endDateKey) {
  const start = parseDateKey(startDateKey);
  const end = parseDateKey(endDateKey);
  if (!start || !end || start > end) return null;
  return { start, end, endExclusive: addDays(end, 1) };
}

export function monthRange(periodKey) {
  const start = parsePeriodKey(periodKey);
  if (!start) return null;
  const year = start.getFullYear();
  const monthIndex = start.getMonth();
  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 0)),
    endExclusive: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
}

export function currentPeriodKey() {
  return toPeriodKey(new Date());
}

export function previousRange(start, end) {
  const daysInMonthUtc = (date) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  const previousMonth = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1),
  );

  // Calendar-month ranges compare like-for-like with the previous month:
  // 1–31 Oct vs 1–30 Sep, and a month-to-date range vs the same days last month.
  if (
    start.getUTCDate() === 1 &&
    end > start &&
    end.getUTCMonth() === start.getUTCMonth() &&
    end.getUTCFullYear() === start.getUTCFullYear()
  ) {
    const previousLastDay = daysInMonthUtc(previousMonth);
    const endWasLastDay = end.getUTCDate() === daysInMonthUtc(end);
    const previousEndDay = endWasLastDay
      ? previousLastDay
      : Math.min(end.getUTCDate(), previousLastDay);
    return {
      start: previousMonth,
      end: new Date(
        Date.UTC(previousMonth.getUTCFullYear(), previousMonth.getUTCMonth(), previousEndDay),
      ),
    };
  }

  const days = differenceInCalendarDays(end, start) + 1;
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(days - 1));
  return { start: previousStart, end: previousEnd };
}

export function frequencyNextDate(date, frequency) {
  if (frequency === 'weekly') return addWeeks(date, 1);
  if (frequency === 'monthly') return addMonths(date, 1);
  return addYears(date, 1);
}

export function buildMonthKeys(start, end) {
  const keys = [];
  let year = start.getUTCFullYear();
  let monthIndex = start.getUTCMonth();
  const lastYear = end.getUTCFullYear();
  const lastMonth = end.getUTCMonth();
  while (
    (year < lastYear || (year === lastYear && monthIndex <= lastMonth)) &&
    keys.length < 120
  ) {
    keys.push(`${year}-${String(monthIndex + 1).padStart(2, '0')}`);
    monthIndex += 1;
    if (monthIndex > 11) {
      monthIndex = 0;
      year += 1;
    }
  }
  return keys;
}

export function buildDayKeys(monthStart) {
  const year = monthStart.getUTCFullYear();
  const monthIndex = monthStart.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = String(index + 1).padStart(2, '0');
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day}`;
  });
}

/** Date filters use UTC midnight boundaries so calendar dates are consistent across clients. */
export function utcDateRangeFilter(startDateKey, endDateKey) {
  const range = dayRange(startDateKey, endDateKey);
  if (!range) return null;
  const start = new Date(`${startDateKey}T00:00:00.000Z`);
  const endExclusive = new Date(`${endDateKey}T00:00:00.000Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return { $gte: start, $lt: endExclusive };
}

export function weekRange(now = new Date()) {
  const start = startOfWeek(now, { weekStartsOn: 1 });
  return { start, end: now };
}

export { addDays, addMonths, startOfMonth, endOfMonth, parseISO, format };
