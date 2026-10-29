import { asyncHandler } from '../utils/api-error.js';
import { getDashboardSummary } from '../services/dashboard.service.js';
import { resolveDateRange } from '../utils/date-range.js';

export const summary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = resolveDateRange(req.validated.query);
  const data = await getDashboardSummary(req.user, startDate, endDate);
  res.json({ success: true, data });
});
