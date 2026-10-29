import { asyncHandler } from '../utils/api-error.js';
import {
  createRecurring,
  deleteRecurring,
  listRecurring,
  processDueRecurring,
  updateRecurring,
} from '../services/recurring.service.js';

export const list = asyncHandler(async (req, res) => {
  const items = await listRecurring(req.user.id);
  res.json({ success: true, data: { items } });
});

export const create = asyncHandler(async (req, res) => {
  const recurring = await createRecurring(req.user.id, req.validated.body);
  res.status(201).json({ success: true, data: { recurring } });
});

export const update = asyncHandler(async (req, res) => {
  const recurring = await updateRecurring(
    req.user.id,
    req.validated.params.id,
    req.validated.body,
  );
  res.json({ success: true, data: { recurring } });
});

export const remove = asyncHandler(async (req, res) => {
  await deleteRecurring(req.user.id, req.validated.params.id);
  res.json({ success: true, data: { id: req.validated.params.id } });
});

export const process = asyncHandler(async (req, res) => {
  const result = await processDueRecurring({ userId: req.user.id });
  res.json({ success: true, data: result });
});
