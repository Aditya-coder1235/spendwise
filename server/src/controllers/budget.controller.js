import { asyncHandler } from '../utils/api-error.js';
import {
  createBudget,
  deleteBudget,
  listBudgets,
  updateBudget,
} from '../services/budget.service.js';
import { currentPeriodKey } from '../utils/dates.js';

export const list = asyncHandler(async (req, res) => {
  const period = req.validated.query.period || currentPeriodKey();
  const overview = await listBudgets(req.user.id, period, req.user.warningThreshold);
  res.json({ success: true, data: overview });
});

export const create = asyncHandler(async (req, res) => {
  const budget = await createBudget(req.user.id, req.validated.body);
  res.status(201).json({ success: true, data: { budget } });
});

export const update = asyncHandler(async (req, res) => {
  const budget = await updateBudget(
    req.user.id,
    req.validated.params.id,
    req.validated.body.monthlyLimit,
  );
  res.json({ success: true, data: { budget } });
});

export const remove = asyncHandler(async (req, res) => {
  await deleteBudget(req.user.id, req.validated.params.id);
  res.json({ success: true, data: { id: req.validated.params.id } });
});
