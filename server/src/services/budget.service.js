import mongoose from 'mongoose';
import { Budget } from '../models/Budget.js';
import { Transaction } from '../models/Transaction.js';
import { ApiError } from '../utils/api-error.js';
import { monthRange } from '../utils/dates.js';
import { getOwnedCategory } from './category.service.js';

const USER_ID = (userId) => new mongoose.Types.ObjectId(userId);

async function getExpenseTotals(userId, period) {
  const range = monthRange(period);
  const [totalRow] = await Transaction.aggregate([
    {
      $match: {
        userId: USER_ID(userId),
        type: 'expense',
        date: { $gte: range.start, $lt: range.endExclusive },
      },
    },
    { $group: { _id: null, totalPaise: { $sum: '$amountPaise' } } },
  ]);

  const categoryRows = await Transaction.aggregate([
    {
      $match: {
        userId: USER_ID(userId),
        type: 'expense',
        date: { $gte: range.start, $lt: range.endExclusive },
      },
    },
    { $group: { _id: '$category', totalPaise: { $sum: '$amountPaise' } } },
  ]);

  return {
    totalSpentPaise: totalRow?.totalPaise || 0,
    byCategory: new Map(categoryRows.map((row) => [row._id.toString(), row.totalPaise])),
  };
}

function budgetProgress(budget, spentPaise, warningThreshold) {
  const percentage = budget.monthlyLimitPaise
    ? Number(((spentPaise / budget.monthlyLimitPaise) * 100).toFixed(1))
    : 0;
  let status = 'ok';
  if (percentage >= 100) status = 'exceeded';
  else if (percentage >= warningThreshold) status = 'warning';

  return {
    id: budget.id,
    period: budget.period,
    monthlyLimitPaise: budget.monthlyLimitPaise,
    spentPaise,
    remainingPaise: budget.monthlyLimitPaise - spentPaise,
    percentage,
    status,
  };
}

export async function getBudgetOverview(userId, period, warningThreshold = 80) {
  const [budgets, totals] = await Promise.all([
    Budget.find({ userId, period }).populate('category', 'name type color icon'),
    getExpenseTotals(userId, period),
  ]);

  const overallBudget = budgets.find((budget) => !budget.category);
  const categoryBudgets = budgets.filter((budget) => budget.category);

  const overall = overallBudget
    ? {
        ...budgetProgress(overallBudget, totals.totalSpentPaise, warningThreshold),
        spentPaise: totals.totalSpentPaise,
      }
    : null;

  const categories = categoryBudgets
    .map((budget) => ({
      ...budgetProgress(
        budget,
        totals.byCategory.get(budget.category.id) || 0,
        warningThreshold,
      ),
      category: budget.category.toJSON(),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  return {
    period,
    totalSpentPaise: totals.totalSpentPaise,
    overall,
    categories,
    exceededCount: categories.filter((item) => item.status === 'exceeded').length,
    warningCount: categories.filter((item) => item.status === 'warning').length,
  };
}

export async function listBudgets(userId, period, warningThreshold) {
  return getBudgetOverview(userId, period, warningThreshold);
}

export async function createBudget(userId, input) {
  if (input.categoryId) {
    await getOwnedCategory(userId, input.categoryId, 'expense');
  }

  try {
    const budget = await Budget.create({
      userId,
      category: input.categoryId,
      period: input.period,
      monthlyLimitPaise: input.monthlyLimit,
    });
    return budget.populate('category', 'name type color icon');
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(
        409,
        'A budget already exists for this month and category. Edit it instead.',
        'BUDGET_EXISTS',
      );
    }
    throw error;
  }
}

export async function updateBudget(userId, budgetId, monthlyLimit) {
  const budget = await Budget.findOne({ _id: budgetId, userId });
  if (!budget) throw new ApiError(404, 'Budget not found.', 'BUDGET_NOT_FOUND');
  budget.monthlyLimitPaise = monthlyLimit;
  await budget.save();
  return budget.populate('category', 'name type color icon');
}

export async function deleteBudget(userId, budgetId) {
  const result = await Budget.deleteOne({ _id: budgetId, userId });
  if (result.deletedCount === 0) {
    throw new ApiError(404, 'Budget not found.', 'BUDGET_NOT_FOUND');
  }
}
