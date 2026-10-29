import { z } from 'zod';

const amountPattern = /^\d{1,10}(\.\d{1,2})?$/;

const amount = z
  .string()
  .trim()
  .min(1, 'Enter an amount')
  .refine((value) => amountPattern.test(value), 'Use a valid amount with up to 2 decimals')
  .refine((value) => Number(value) > 0, 'Amount must be greater than zero');

const password = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Password is too long')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/\d/, 'Include a number');

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
    email: z.string().trim().email('Enter a valid email address'),
    password,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount,
  categoryId: z.string().min(1, 'Choose a category'),
  description: z.string().trim().min(1, 'Add a description').max(200),
  merchant: z.string().trim().max(120).optional(),
  paymentMethod: z.enum(['cash', 'card', 'upi', 'bank_transfer', 'net_banking', 'wallet', 'other']),
  date: z.string().min(1, 'Choose a date'),
  tags: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export const budgetSchema = z.object({
  categoryId: z.string().optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Choose a valid month'),
  monthlyLimit: amount,
});

export const recurringSchema = z
  .object({
    type: z.enum(['income', 'expense']),
    amount,
    categoryId: z.string().min(1, 'Choose a category'),
    description: z.string().trim().min(1, 'Add a description').max(200),
    merchant: z.string().trim().max(120).optional(),
    paymentMethod: z.enum(['cash', 'card', 'upi', 'bank_transfer', 'net_banking', 'wallet', 'other']),
    tags: z.string().optional(),
    notes: z.string().max(1000).optional(),
    frequency: z.enum(['weekly', 'monthly', 'yearly']),
    nextOccurrence: z.string().min(1, 'Choose the next date'),
    endDate: z.string().optional(),
    active: z.boolean(),
  })
  .refine(
    (data) => !data.endDate || data.endDate >= data.nextOccurrence,
    { message: 'End date must be on or after the next occurrence', path: ['endDate'] },
  );

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  preferredCurrency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED']),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
  theme: z.enum(['light', 'dark']),
  warningThreshold: z.coerce.number().int().min(50, 'Use at least 50%').max(100, 'Use at most 100%'),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: password,
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50),
  type: z.enum(['income', 'expense']),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Choose a colour'),
  icon: z.string().max(40),
});

export function zodErrors(error) {
  if (!error?.issues) return {};
  return error.issues.reduce((acc, issue) => {
    const field = issue.path.join('.');
    if (field && !acc[field]) acc[field] = issue.message;
    return acc;
  }, {});
}

export function apiFieldErrors(error) {
  const details = error?.response?.data?.error?.details;
  if (!Array.isArray(details)) return {};
  return details.reduce((acc, detail) => {
    if (detail.field && !acc[detail.field]) acc[detail.field] = detail.message;
    return acc;
  }, {});
}
