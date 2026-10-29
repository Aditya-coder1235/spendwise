import { ApiError } from '../utils/api-error.js';
import { toDateKey } from '../utils/dates.js';
import { parseDateKey } from '../utils/dates.js';

/**
 * The client sends YYYY-MM-DD calendar dates. If omitted, the API defaults to
 * the current calendar month up to today. Either both bounds are sent or neither.
 */
export function resolveDateRange(query) {
  if (query.startDate && query.endDate) {
    return { startDate: query.startDate, endDate: query.endDate };
  }
  if (query.startDate || query.endDate) {
    throw new ApiError(422, 'Provide both a start date and an end date.', 'INVALID_DATE_RANGE');
  }

  const today = new Date();
  const todayKey = toDateKey(today);
  const monthStart = parseDateKey(`${todayKey.slice(0, 7)}-01`);
  return { startDate: toDateKey(monthStart), endDate: todayKey };
}
