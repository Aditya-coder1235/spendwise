import { MAX_AMOUNT_PAISE } from './constants.js';

/**
 * Money is stored as integer paise in MongoDB.
 * 1 INR = 100 paise. This avoids floating-point drift in totals.
 */
export function toPaise(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Invalid amount');
    value = String(value);
  }
  if (typeof value !== 'string') throw new Error('Invalid amount');

  const normalized = value.trim();
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(normalized)) {
    throw new Error('Amount must be a positive number with at most 2 decimal places');
  }

  const [whole, fraction = ''] = normalized.split('.');
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(paise) || paise < 1 || paise > MAX_AMOUNT_PAISE) {
    throw new Error('Amount is outside the allowed range');
  }
  return paise;
}

export function amountToDecimal(paise) {
  return Number((paise / 100).toFixed(2));
}

export function formatPaiseAsDecimal(paise) {
  return (paise / 100).toFixed(2);
}

export function sumPaise(values) {
  return values.reduce((total, value) => total + value, 0);
}
