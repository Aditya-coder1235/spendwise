export const TRANSACTION_TYPES = ['income', 'expense'];

export const PAYMENT_METHODS = [
  'cash',
  'card',
  'upi',
  'bank_transfer',
  'net_banking',
  'wallet',
  'other',
];

export const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  bank_transfer: 'Bank transfer',
  net_banking: 'Net banking',
  wallet: 'Wallet',
  other: 'Other',
};

export const FREQUENCIES = ['weekly', 'monthly', 'yearly'];

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

export const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

export const THEMES = ['light', 'dark'];

export const DEFAULT_CATEGORIES = [
  { name: 'Food & groceries', type: 'expense', color: '#f97316', icon: 'utensils' },
  { name: 'Transport', type: 'expense', color: '#3b82f6', icon: 'car' },
  { name: 'Rent & housing', type: 'expense', color: '#8b5cf6', icon: 'home' },
  { name: 'Bills & utilities', type: 'expense', color: '#06b6d4', icon: 'zap' },
  { name: 'Shopping', type: 'expense', color: '#ec4899', icon: 'shopping-bag' },
  { name: 'Health', type: 'expense', color: '#ef4444', icon: 'heart-pulse' },
  { name: 'Education', type: 'expense', color: '#6366f1', icon: 'graduation-cap' },
  { name: 'Entertainment', type: 'expense', color: '#f59e0b', icon: 'ticket' },
  { name: 'Travel', type: 'expense', color: '#14b8a6', icon: 'plane' },
  { name: 'Subscriptions', type: 'expense', color: '#a855f7', icon: 'repeat' },
  { name: 'Personal care', type: 'expense', color: '#d946ef', icon: 'sparkles' },
  { name: 'Other', type: 'expense', color: '#64748b', icon: 'more-horizontal' },
  { name: 'Salary', type: 'income', color: '#16a34a', icon: 'briefcase' },
  { name: 'Freelance', type: 'income', color: '#22c55e', icon: 'laptop' },
  { name: 'Business', type: 'income', color: '#0d9488', icon: 'building' },
  { name: 'Investment income', type: 'income', color: '#84cc16', icon: 'trending-up' },
  { name: 'Gifts', type: 'income', color: '#eab308', icon: 'gift' },
  { name: 'Other', type: 'income', color: '#64748b', icon: 'more-horizontal' },
];

export const MAX_AMOUNT_PAISE = 999_999_999_999; // ₹9,99,99,99,999.99
