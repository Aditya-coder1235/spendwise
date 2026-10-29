import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { getCategoryBreakdown, getMonthlyTrends } from './analytics.service.js';
import { getBudgetOverview } from './budget.service.js';
import {
  getAllTimeBalance,
  getPeriodTotals,
  getRecentTransactions,
} from './transaction.service.js';
import { previousRange } from '../utils/dates.js';

function percentChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export async function getDashboardSummary(user, startDate, endDate) {
  const previous = previousRange(
    new Date(`${startDate}T00:00:00.000Z`),
    new Date(`${endDate}T00:00:00.000Z`),
  );
  const previousStart = previous.start.toISOString().slice(0, 10);
  const previousEnd = previous.end.toISOString().slice(0, 10);
  const budgetPeriod = endDate.slice(0, 7);

  const [period, previousPeriod, balance, budget, categoryBreakdown, recentTransactions] =
    await Promise.all([
      getPeriodTotals(user.id, startDate, endDate),
      getPeriodTotals(user.id, previousStart, previousEnd),
      getAllTimeBalance(user.id),
      getBudgetOverview(user.id, budgetPeriod, user.warningThreshold),
      getCategoryBreakdown(user.id, startDate, endDate, 'expense'),
      getRecentTransactions(user.id, startDate, endDate, 5),
    ]);

  const netSavingsPaise = period.incomePaise - period.expensePaise;
  const previousNetSavingsPaise = previousPeriod.incomePaise - previousPeriod.expensePaise;

  return {
    currency: user.preferredCurrency,
    range: { startDate, endDate },
    previousRange: { startDate: previousStart, endDate: previousEnd },
    totalBalancePaise: balance.totalBalancePaise,
    allTimeIncomePaise: balance.allTimeIncomePaise,
    allTimeExpensePaise: balance.allTimeExpensePaise,
    incomePaise: period.incomePaise,
    expensePaise: period.expensePaise,
    netSavingsPaise,
    transactionCount: period.transactionCount,
    savingsRate:
      period.incomePaise > 0
        ? Number(((netSavingsPaise / period.incomePaise) * 100).toFixed(1))
        : null,
    comparison: {
      previousIncomePaise: previousPeriod.incomePaise,
      previousExpensePaise: previousPeriod.expensePaise,
      previousNetSavingsPaise,
      incomeChangePercent: percentChange(period.incomePaise, previousPeriod.incomePaise),
      expenseChangePercent: percentChange(period.expensePaise, previousPeriod.expensePaise),
      savingsChangePercent: percentChange(netSavingsPaise, previousNetSavingsPaise),
    },
    budget,
    categoryBreakdown,
    recentTransactions,
  };
}

const USER_ID = (userId) => new mongoose.Types.ObjectId(userId);

export async function getMonthlySummaries(userId, startDate, endDate) {
  const rows = await Transaction.aggregate([
    {
      $match: {
        userId: USER_ID(userId),
        date: {
          $gte: new Date(`${startDate}T00:00:00.000Z`),
          $lt: new Date(new Date(`${endDate}T00:00:00.000Z`).getTime() + 86_400_000),
        },
      },
    },
    {
      $group: {
        _id: {
          period: { $dateToString: { format: '%Y-%m', date: '$date' } },
          type: '$type',
        },
        totalPaise: { $sum: '$amountPaise' },
        count: { $sum: 1 },
      },
    },
  ]);

  return getMonthlyTrends(userId, startDate, endDate).then((trends) =>
    trends.map((trend) => {
      const income = rows.find(
        (row) => row._id.period === trend.period && row._id.type === 'income',
      );
      const expense = rows.find(
        (row) => row._id.period === trend.period && row._id.type === 'expense',
      );
      return {
        ...trend,
        incomeCount: income?.count || 0,
        expenseCount: expense?.count || 0,
        transactionCount: (income?.count || 0) + (expense?.count || 0),
      };
    }),
  );
}

export async function getReportSummary(user, startDate, endDate) {
  const previous = previousRange(
    new Date(`${startDate}T00:00:00.000Z`),
    new Date(`${endDate}T00:00:00.000Z`),
  );
  const previousStart = previous.start.toISOString().slice(0, 10);
  const previousEnd = previous.end.toISOString().slice(0, 10);

  const [totals, previousTotals, expenseBreakdown, incomeBreakdown, monthlySummaries] =
    await Promise.all([
      getPeriodTotals(user.id, startDate, endDate),
      getPeriodTotals(user.id, previousStart, previousEnd),
      getCategoryBreakdown(user.id, startDate, endDate, 'expense'),
      getCategoryBreakdown(user.id, startDate, endDate, 'income'),
      getMonthlySummaries(user.id, startDate, endDate),
    ]);

  const netSavingsPaise = totals.incomePaise - totals.expensePaise;
  const previousNetSavingsPaise =
    previousTotals.incomePaise - previousTotals.expensePaise;

  return {
    currency: user.preferredCurrency,
    range: { startDate, endDate },
    previousRange: { startDate: previousStart, endDate: previousEnd },
    totals,
    netSavingsPaise,
    savingsRate:
      totals.incomePaise > 0
        ? Number(((netSavingsPaise / totals.incomePaise) * 100).toFixed(1))
        : null,
    comparison: {
      previousIncomePaise: previousTotals.incomePaise,
      previousExpensePaise: previousTotals.expensePaise,
      previousNetSavingsPaise,
      incomeChangePercent: percentChange(totals.incomePaise, previousTotals.incomePaise),
      expenseChangePercent: percentChange(totals.expensePaise, previousTotals.expensePaise),
      savingsChangePercent: percentChange(netSavingsPaise, previousNetSavingsPaise),
    },
    categoryBreakdown: expenseBreakdown,
    incomeBreakdown,
    monthlySummaries,
  };
}
