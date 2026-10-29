import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { ApiError } from '../utils/api-error.js';
import { utcDateRangeFilter } from '../utils/dates.js';
import { escapeRegex } from '../utils/sanitize.js';
import { getOwnedCategory } from './category.service.js';

const CATEGORY_FIELDS = 'name type color icon';

const SORTS = {
  date_desc: { date: -1, _id: -1 },
  date_asc: { date: 1, _id: 1 },
  amount_desc: { amountPaise: -1, date: -1 },
  amount_asc: { amountPaise: 1, date: -1 },
};

export function buildTransactionFilter(userId, query = {}) {
  const filter = { userId };
  if (query.type) filter.type = query.type;
  if (query.categoryId) filter.category = query.categoryId;
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
  if (query.startDate && query.endDate) {
    filter.date = utcDateRangeFilter(query.startDate, query.endDate);
  }
  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ description: search }, { merchant: search }];
  }
  return filter;
}

export async function createTransaction(userId, input) {
  await getOwnedCategory(userId, input.categoryId, input.type);
  const transaction = await Transaction.create({
    userId,
    type: input.type,
    amountPaise: input.amount,
    category: input.categoryId,
    description: input.description,
    merchant: input.merchant,
    paymentMethod: input.paymentMethod,
    date: input.date,
    tags: input.tags,
    notes: input.notes,
  });
  return transaction.populate('category', CATEGORY_FIELDS);
}

export async function listTransactions(userId, query) {
  const filter = buildTransactionFilter(userId, query);
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Transaction.find(filter)
      .sort(SORTS[query.sort])
      .skip(skip)
      .limit(query.limit)
      .populate('category', CATEGORY_FIELDS),
    Transaction.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getTransaction(userId, transactionId) {
  const transaction = await Transaction.findOne({ _id: transactionId, userId }).populate(
    'category',
    CATEGORY_FIELDS,
  );
  if (!transaction) throw new ApiError(404, 'Transaction not found.', 'TRANSACTION_NOT_FOUND');
  return transaction;
}

export async function updateTransaction(userId, transactionId, input) {
  const transaction = await Transaction.findOne({ _id: transactionId, userId });
  if (!transaction) throw new ApiError(404, 'Transaction not found.', 'TRANSACTION_NOT_FOUND');
  await getOwnedCategory(userId, input.categoryId, input.type);

  transaction.set({
    type: input.type,
    amountPaise: input.amount,
    category: input.categoryId,
    description: input.description,
    merchant: input.merchant,
    paymentMethod: input.paymentMethod,
    date: input.date,
    tags: input.tags,
    notes: input.notes,
  });
  await transaction.save();
  return transaction.populate('category', CATEGORY_FIELDS);
}

export async function deleteTransaction(userId, transactionId) {
  const result = await Transaction.deleteOne({ _id: transactionId, userId });
  if (result.deletedCount === 0) {
    throw new ApiError(404, 'Transaction not found.', 'TRANSACTION_NOT_FOUND');
  }
}

export async function getPeriodTotals(userId, startDate, endDate) {
  const rows = await Transaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), ...(utcDateRangeFilter(startDate, endDate) ? { date: utcDateRangeFilter(startDate, endDate) } : {}) } },
    { $group: { _id: '$type', totalPaise: { $sum: '$amountPaise' }, count: { $sum: 1 } } },
  ]);

  const income = rows.find((row) => row._id === 'income') || { totalPaise: 0, count: 0 };
  const expense = rows.find((row) => row._id === 'expense') || { totalPaise: 0, count: 0 };
  return {
    incomePaise: income.totalPaise,
    expensePaise: expense.totalPaise,
    incomeCount: income.count,
    expenseCount: expense.count,
    transactionCount: income.count + expense.count,
  };
}

export async function getAllTimeBalance(userId) {
  const rows = await Transaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: '$type', totalPaise: { $sum: '$amountPaise' } } },
  ]);
  const income = rows.find((row) => row._id === 'income')?.totalPaise || 0;
  const expense = rows.find((row) => row._id === 'expense')?.totalPaise || 0;
  return { totalBalancePaise: income - expense, allTimeIncomePaise: income, allTimeExpensePaise: expense };
}

export async function getRecentTransactions(userId, startDate, endDate, limit = 5) {
  const filter = buildTransactionFilter(userId, { startDate, endDate });
  return Transaction.find(filter)
    .sort({ date: -1, _id: -1 })
    .limit(limit)
    .populate('category', CATEGORY_FIELDS);
}

export async function findTransactionsForExport(userId, query) {
  return Transaction.find(buildTransactionFilter(userId, query))
    .sort(SORTS[query.sort] || SORTS.date_desc)
    .limit(10_000)
    .populate('category', CATEGORY_FIELDS)
    .lean();
}
