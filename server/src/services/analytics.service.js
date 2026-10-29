import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { utcDateRangeFilter, buildMonthKeys, buildDayKeys, monthRange } from '../utils/dates.js';

const USER_ID = (userId) => new mongoose.Types.ObjectId(userId);

export async function getCategoryBreakdown(userId, startDate, endDate, type = 'expense') {
  const rows = await Transaction.aggregate([
    {
      $match: {
        userId: USER_ID(userId),
        type,
        date: utcDateRangeFilter(startDate, endDate),
      },
    },
    {
      $group: {
        _id: '$category',
        amountPaise: { $sum: '$amountPaise' },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        categoryId: '$_id',
        name: { $ifNull: ['$category.name', 'Uncategorised'] },
        color: { $ifNull: ['$category.color', '#64748b'] },
        icon: { $ifNull: ['$category.icon', 'tag'] },
        type: { $ifNull: ['$category.type', type] },
        amountPaise: 1,
        count: 1,
      },
    },
    { $sort: { amountPaise: -1 } },
  ]);

  const totalPaise = rows.reduce((sum, row) => sum + row.amountPaise, 0);
  return {
    type,
    totalPaise,
    items: rows.map((row) => ({
      ...row,
      percentage: totalPaise ? Number(((row.amountPaise / totalPaise) * 100).toFixed(1)) : 0,
    })),
  };
}

export async function getMonthlyTrends(userId, startDate, endDate) {
  const filter = utcDateRangeFilter(startDate, endDate);
  const rows = await Transaction.aggregate([
    { $match: { userId: USER_ID(userId), date: filter } },
    {
      $group: {
        _id: {
          period: { $dateToString: { format: '%Y-%m', date: '$date' } },
          type: '$type',
        },
        totalPaise: { $sum: '$amountPaise' },
      },
    },
  ]);

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const periods = buildMonthKeys(start, end);

  return periods.map((period) => {
    const income = rows.find((row) => row._id.period === period && row._id.type === 'income');
    const expense = rows.find((row) => row._id.period === period && row._id.type === 'expense');
    const incomePaise = income?.totalPaise || 0;
    const expensePaise = expense?.totalPaise || 0;
    return {
      period,
      incomePaise,
      expensePaise,
      netPaise: incomePaise - expensePaise,
    };
  });
}

export async function getDailySpending(userId, month, type = 'expense') {
  const range = monthRange(month);
  const rows = await Transaction.aggregate([
    {
      $match: {
        userId: USER_ID(userId),
        type,
        date: { $gte: range.start, $lt: range.endExclusive },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        amountPaise: { $sum: '$amountPaise' },
        count: { $sum: 1 },
      },
    },
  ]);

  const days = buildDayKeys(range.start);
  return {
    month,
    type,
    days: days.map((date) => {
      const row = rows.find((item) => item._id === date);
      return { date, amountPaise: row?.amountPaise || 0, count: row?.count || 0 };
    }),
  };
}

export async function getIncomeExpenseComparison(userId, startDate, endDate) {
  return getMonthlyTrends(userId, startDate, endDate);
}

export async function getTopCategories(userId, startDate, endDate, type = 'expense', limit = 5) {
  const breakdown = await getCategoryBreakdown(userId, startDate, endDate, type);
  return { ...breakdown, items: breakdown.items.slice(0, limit) };
}
