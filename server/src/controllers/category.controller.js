import { asyncHandler } from '../utils/api-error.js';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../services/category.service.js';

export const list = asyncHandler(async (req, res) => {
  const categories = await listCategories(req.user.id, req.validated.query);
  res.json({ success: true, data: { categories } });
});

export const create = asyncHandler(async (req, res) => {
  const category = await createCategory(req.user.id, req.validated.body);
  res.status(201).json({ success: true, data: { category } });
});

export const update = asyncHandler(async (req, res) => {
  const category = await updateCategory(req.user.id, req.validated.params.id, req.validated.body);
  res.json({ success: true, data: { category } });
});

export const remove = asyncHandler(async (req, res) => {
  await deleteCategory(req.user.id, req.validated.params.id);
  res.json({ success: true, data: { id: req.validated.params.id } });
});
