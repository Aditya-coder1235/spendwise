import { z } from 'zod';
import { toPaise } from '../utils/money.js';
import { parseDateKey } from '../utils/dates.js';
import {
  CURRENCIES,
  DATE_FORMATS,
  FREQUENCIES,
  PAYMENT_METHODS,
  THEMES,
  TRANSACTION_TYPES,
} from '../utils/constants.js';

export const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Select a valid record');

export const dateKey = z
  .string()
  .refine((value) => Boolean(parseDateKey(value)), 'Use a valid date (YYYY-MM-DD)');

export const periodKey = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use a valid month (YYYY-MM)');

export const amount = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => {
    try {
      return toPaise(value);
    } catch (error) {
      ctx.addIssue({ code: 'custom', message: error.message });
      return z.NEVER;
    }
  });

const password = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Password is too long')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/\d/, 'Include a number');

const name = z.string().trim().min(2, 'Name must be at least 2 characters').max(80);
const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

export const registerSchema = z
  .object({
    name,
    email,
    password,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z
  .object({
    email,
    password: z.string().min(1, 'Enter your password'),
  })
  .strict();

export const profileSchema = z
  .object({
    name: name.optional(),
    preferredCurrency: z.enum(CURRENCIES).optional(),
    dateFormat: z.enum(DATE_FORMATS).optional(),
    theme: z.enum(THEMES).optional(),
    warningThreshold: z.coerce.number().int().min(50).max(100).optional(),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: password,
  })
  .strict();

const tags = z
  .array(z.string().trim().min(1).max(30))
  .max(10, 'Use at most 10 tags')
  .transform((values) => [...new Set(values.map((tag) => tag.trim()))]);

const transactionFields = {
  type: z.enum(TRANSACTION_TYPES),
  amount,
  categoryId: objectId,
  description: z.string().trim().min(1, 'Add a description').max(200),
  merchant: z.string().trim().max(120).optional().default(''),
  paymentMethod: z.enum(PAYMENT_METHODS),
  date: dateKey,
  tags: tags.optional().default([]),
  notes: z.string().trim().max(1000).optional().default(''),
};

export const createTransactionSchema = z.object(transactionFields).strict();
export const updateTransactionSchema = z.object(transactionFields).strict();

const dateRangeFields = {
  startDate: dateKey.optional(),
  endDate: dateKey.optional(),
};

function validateRange(data) {
  return !data.startDate || !data.endDate || data.startDate <= data.endDate;
}

export const dashboardQuerySchema = z
  .object(dateRangeFields)
  .refine(validateRange, { message: 'Start date must be before end date', path: ['endDate'] });

const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(20);

export const transactionQuerySchema = z
  .object({
    ...dateRangeFields,
    type: z.enum(TRANSACTION_TYPES).optional(),
    categoryId: objectId.optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    search: z.string().trim().max(100).optional(),
    sort: z.enum(['date_desc', 'date_asc', 'amount_desc', 'amount_asc']).default('date_desc'),
    page,
    limit,
  })
  .refine(validateRange, { message: 'Start date must be before end date', path: ['endDate'] });

export const analyticsQuerySchema = z
  .object({
    ...dateRangeFields,
    type: z.enum(TRANSACTION_TYPES).default('expense'),
  })
  .refine(validateRange, { message: 'Start date must be before end date', path: ['endDate'] });

export const dailyQuerySchema = z.object({
  month: periodKey,
  type: z.enum(TRANSACTION_TYPES).default('expense'),
});

export const budgetQuerySchema = z.object({
  period: periodKey.optional(),
});

export const createBudgetSchema = z
  .object({
    categoryId: objectId.nullable().optional().default(null),
    period: periodKey,
    monthlyLimit: amount,
  })
  .strict();

export const updateBudgetSchema = z
  .object({
    monthlyLimit: amount,
  })
  .strict();

export const createCategorySchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(50),
    type: z.enum(TRANSACTION_TYPES),
    color: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i, 'Use a valid hex colour')
      .default('#64748b'),
    icon: z.string().trim().max(40).default('tag'),
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(50),
    color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Use a valid hex colour'),
    icon: z.string().trim().max(40),
  })
  .strict();

const recurringFields = {
  type: z.enum(TRANSACTION_TYPES),
  amount,
  categoryId: objectId,
  description: z.string().trim().min(1, 'Add a description').max(200),
  merchant: z.string().trim().max(120).optional().default(''),
  paymentMethod: z.enum(PAYMENT_METHODS),
  tags: tags.optional().default([]),
  notes: z.string().trim().max(1000).optional().default(''),
  frequency: z.enum(FREQUENCIES),
  nextOccurrence: dateKey,
  endDate: dateKey.nullable().optional(),
  active: z.boolean().default(true),
};

export const createRecurringSchema = z
  .object(recurringFields)
  .strict()
  .refine(
    (data) => !data.endDate || data.endDate >= data.nextOccurrence,
    { message: 'End date must be on or after the next occurrence', path: ['endDate'] },
  );

export const updateRecurringSchema = z
  .object(recurringFields)
  .strict()
  .refine(
    (data) => !data.endDate || data.endDate >= data.nextOccurrence,
    { message: 'End date must be on or after the next occurrence', path: ['endDate'] },
  );

export const reportQuerySchema = z
  .object({
    ...dateRangeFields,
  })
  .refine(validateRange, { message: 'Start date must be before end date', path: ['endDate'] });
