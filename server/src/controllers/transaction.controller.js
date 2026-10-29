import { asyncHandler } from '../utils/api-error.js';
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
} from '../services/transaction.service.js';

export const create = asyncHandler(async (req, res) => {
  const transaction = await createTransaction(req.user.id, req.validated.body);
  res.status(201).json({ success: true, data: { transaction } });
});

export const list = asyncHandler(async (req, res) => {
  const result = await listTransactions(req.user.id, req.validated.query);
  res.json({ success: true, data: result });
});

export const getOne = asyncHandler(async (req, res) => {
  const transaction = await getTransaction(req.user.id, req.validated.params.id);
  res.json({ success: true, data: { transaction } });
});

export const update = asyncHandler(async (req, res) => {
  const transaction = await updateTransaction(
    req.user.id,
    req.validated.params.id,
    req.validated.body,
  );
  res.json({ success: true, data: { transaction } });
});

export const remove = asyncHandler(async (req, res) => {
  await deleteTransaction(req.user.id, req.validated.params.id);
  res.json({ success: true, data: { id: req.validated.params.id } });
});
