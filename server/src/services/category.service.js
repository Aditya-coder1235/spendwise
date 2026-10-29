import { Category } from '../models/Category.js';
import { Budget } from '../models/Budget.js';
import { RecurringTransaction } from '../models/RecurringTransaction.js';
import { Transaction } from '../models/Transaction.js';
import { DEFAULT_CATEGORIES } from '../utils/constants.js';
import { ApiError } from '../utils/api-error.js';

export async function ensureDefaultCategories(userId) {
  const existing = await Category.countDocuments({ userId });
  if (existing > 0) return;
  try {
    await Category.insertMany(
      DEFAULT_CATEGORIES.map((category) => ({
        ...category,
        userId,
        nameKey: category.name.toLowerCase(),
        isDefault: true,
      })),
      { ordered: false },
    );
  } catch (error) {
    // A concurrent login may have created them; duplicate-key is safe to ignore.
    if (error.code !== 11000) throw error;
  }
}

export async function listCategories(userId, { type } = {}) {
  const filter = { userId };
  if (type) filter.type = type;
  return Category.find(filter).sort({ type: 1, name: 1 });
}

export async function createCategory(userId, input) {
  const category = await Category.create({
    userId,
    name: input.name,
    type: input.type,
    color: input.color,
    icon: input.icon,
    isDefault: false,
  });
  return category;
}

export async function updateCategory(userId, categoryId, input) {
  const category = await Category.findOne({ _id: categoryId, userId });
  if (!category) throw new ApiError(404, 'Category not found.', 'CATEGORY_NOT_FOUND');
  if (category.isDefault) {
    throw new ApiError(409, 'Default categories cannot be renamed. Add a custom category instead.', 'DEFAULT_CATEGORY');
  }
  category.name = input.name;
  category.color = input.color;
  category.icon = input.icon;
  await category.save();
  return category;
}

export async function deleteCategory(userId, categoryId) {
  const category = await Category.findOne({ _id: categoryId, userId });
  if (!category) throw new ApiError(404, 'Category not found.', 'CATEGORY_NOT_FOUND');
  if (category.isDefault) {
    throw new ApiError(409, 'Default categories cannot be deleted.', 'DEFAULT_CATEGORY');
  }

  const [transactionCount, budgetCount, recurringCount] = await Promise.all([
    Transaction.countDocuments({ userId, category: categoryId }),
    Budget.countDocuments({ userId, category: categoryId }),
    RecurringTransaction.countDocuments({ userId, category: categoryId }),
  ]);

  if (transactionCount + budgetCount + recurringCount > 0) {
    throw new ApiError(
      409,
      'This category is in use. Reassign its transactions, budgets, and recurring items first.',
      'CATEGORY_IN_USE',
    );
  }

  await category.deleteOne();
}

export async function getOwnedCategory(userId, categoryId, expectedType) {
  const category = await Category.findOne({ _id: categoryId, userId });
  if (!category) throw new ApiError(422, 'Select a category that belongs to your account.', 'INVALID_CATEGORY');
  if (expectedType && category.type !== expectedType) {
    throw new ApiError(422, `Choose an ${expectedType} category for this entry.`, 'CATEGORY_TYPE_MISMATCH');
  }
  return category;
}
