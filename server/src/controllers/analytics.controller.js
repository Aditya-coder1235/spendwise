import { asyncHandler } from '../utils/api-error.js';
import { resolveDateRange } from '../utils/date-range.js';
import {
  getCategoryBreakdown,
  getDailySpending,
  getIncomeExpenseComparison,
  getMonthlyTrends,
  getTopCategories,
} from '../services/analytics.service.js';

export const categories = asyncHandler(async (req, res) => {
  const { startDate, endDate } = resolveDateRange(req.validated.query);
  const data = await getCategoryBreakdown(
    req.user.id,
    startDate,
    endDate,
    req.validated.query.type,
  );
  res.json({ success: true, data: { ...data, range: { startDate, endDate } } });
});

export const trends = asyncHandler(async (req, res) => {
  const { startDate, endDate } = resolveDateRange(req.validated.query);
  const trends = await getMonthlyTrends(req.user.id, startDate, endDate);
  res.json({ success: true, data: { trends, range: { startDate, endDate } } });
});

export const incomeExpenses = asyncHandler(async (req, res) => {
  const { startDate, endDate } = resolveDateRange(req.validated.query);
  const trends = await getIncomeExpenseComparison(req.user.id, startDate, endDate);
  res.json({ success: true, data: { trends, range: { startDate, endDate } } });
});

export const daily = asyncHandler(async (req, res) => {
  const data = await getDailySpending(
    req.user.id,
    req.validated.query.month,
    req.validated.query.type,
  );
  res.json({ success: true, data });
});

export const topCategories = asyncHandler(async (req, res) => {
  const { startDate, endDate } = resolveDateRange(req.validated.query);
  const data = await getTopCategories(
    req.user.id,
    startDate,
    endDate,
    req.validated.query.type,
    5,
  );
  res.json({ success: true, data: { ...data, range: { startDate, endDate } } });
});
