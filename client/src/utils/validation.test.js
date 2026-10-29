import { describe, expect, test } from 'vitest';
import {
  formatCurrency,
  formatPercent,
  currencySymbol,
} from './format.js';
import {
  formatDateRangeLabel,
  formatDisplayDate,
  getPeriodRange,
} from './date.js';
import {
  apiFieldErrors,
  budgetSchema,
  loginSchema,
  profileSchema,
  recurringSchema,
  registerSchema,
  transactionSchema,
  zodErrors,
} from './validation.js';

describe('money formatting', () => {
  test('formats INR with Indian grouping and two decimals by default', () => {
    expect(formatCurrency(12_500_050, 'INR')).toBe('₹1,25,000.50');
    expect(formatCurrency(0, 'INR')).toBe('₹0.00');
    expect(formatCurrency(125_000, 'INR', { compact: true })).toBe('₹1.3K');
    expect(currencySymbol('INR')).toBe('₹');
    expect(currencySymbol('USD')).toBe('$');
  });

  test('formats percentages and handles absent values', () => {
    expect(formatPercent(62.5)).toBe('62.5%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(undefined, 'n/a')).toBe('n/a');
  });
});

describe('date helpers', () => {
  const now = new Date(2026, 9, 28, 12, 0, 0);

  test('builds the date ranges offered by the dashboard', () => {
    expect(getPeriodRange('today', {}, now)).toEqual({
      startDate: '2026-10-28',
      endDate: '2026-10-28',
    });
    expect(getPeriodRange('week', {}, now)).toEqual({
      startDate: '2026-10-26',
      endDate: '2026-10-28',
    });
    expect(getPeriodRange('month', {}, now)).toEqual({
      startDate: '2026-10-01',
      endDate: '2026-10-28',
    });
    expect(getPeriodRange('last_month', {}, now)).toEqual({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });
    expect(getPeriodRange('year', {}, now)).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-10-28',
    });
    expect(
      getPeriodRange('custom', { startDate: '2026-03-01', endDate: '2026-03-31' }, now),
    ).toEqual({ startDate: '2026-03-01', endDate: '2026-03-31' });
  });

  test('respects the selected numeric date format', () => {
    expect(formatDisplayDate('2026-10-28', 'DD/MM/YYYY')).toBe('28/10/2026');
    expect(formatDisplayDate('2026-10-28', 'MM/DD/YYYY')).toBe('10/28/2026');
    expect(formatDisplayDate('2026-10-28', 'YYYY-MM-DD')).toBe('2026-10-28');
    expect(formatDisplayDate(null)).toBe('—');
    expect(formatDateRangeLabel('2026-10-01', '2026-10-28')).toBe(
      '01/10/2026 – 28/10/2026',
    );
    expect(formatDateRangeLabel('2026-10-28', '2026-10-28')).toBe('28/10/2026');
  });
});

describe('client validation', () => {
  test('requires valid credentials at login and registration', () => {
    const login = loginSchema.safeParse({ email: 'bad', password: '' });
    expect(login.success).toBe(false);
    expect(zodErrors(login.error)).toMatchObject({
      email: expect.stringContaining('valid email'),
      password: expect.stringContaining('password'),
    });

    const register = registerSchema.safeParse({
      name: 'A',
      email: 'bad',
      password: 'weak',
      confirmPassword: 'different',
    });
    expect(register.success).toBe(false);
    expect(Object.keys(zodErrors(register.error))).toEqual(
      expect.arrayContaining(['name', 'email', 'password', 'confirmPassword']),
    );
  });

  test('validates transaction amounts, categories, dates, and strict budgets', () => {
    const transaction = transactionSchema.safeParse({
      type: 'expense',
      amount: '12.345',
      categoryId: '',
      description: '',
      paymentMethod: 'upi',
      date: '',
    });
    expect(transaction.success).toBe(false);
    expect(Object.keys(zodErrors(transaction.error))).toEqual(
      expect.arrayContaining(['amount', 'categoryId', 'description', 'date']),
    );

    expect(
      budgetSchema.safeParse({
        categoryId: '',
        period: '2026-10',
        monthlyLimit: '5000.50',
      }).success,
    ).toBe(true);
    expect(
      budgetSchema.safeParse({ categoryId: '', period: '2026-13', monthlyLimit: '0' }).success,
    ).toBe(false);
  });

  test('checks recurring date ordering and preference ranges', () => {
    const recurring = recurringSchema.safeParse({
      type: 'expense',
      amount: '99',
      categoryId: 'category-id',
      description: 'Gym',
      paymentMethod: 'card',
      frequency: 'monthly',
      nextOccurrence: '2026-10-20',
      endDate: '2026-10-01',
      active: true,
    });
    expect(recurring.success).toBe(false);
    expect(zodErrors(recurring.error).endDate).toContain('on or after');

    expect(
      profileSchema.safeParse({
        name: 'Demo User',
        preferredCurrency: 'INR',
        dateFormat: 'DD/MM/YYYY',
        theme: 'dark',
        warningThreshold: '101',
      }).success,
    ).toBe(false);
  });

  test('maps field errors from API responses', () => {
    const errors = apiFieldErrors({
      response: {
        data: {
          error: {
            details: [
              { field: 'amount', message: 'Invalid amount' },
              { field: 'amount', message: 'Duplicate detail' },
              { field: 'date', message: 'Invalid date' },
            ],
          },
        },
      },
    });
    expect(errors).toEqual({ amount: 'Invalid amount', date: 'Invalid date' });
    expect(apiFieldErrors(new Error('no response'))).toEqual({});
  });
});
