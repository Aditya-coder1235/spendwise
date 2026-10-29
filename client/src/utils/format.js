const LOCALES = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  AED: 'en-AE',
};

export function formatCurrency(paise = 0, currency = 'INR', options = {}) {
  const amount = Number(paise || 0) / 100;
  return new Intl.NumberFormat(LOCALES[currency] || 'en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: options.compact ? 0 : 2,
    maximumFractionDigits: options.compact ? 1 : 2,
    notation: options.compact ? 'compact' : 'standard',
  }).format(amount);
}

export function formatNumber(value, options = {}) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: options.maximumFractionDigits ?? 1,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
  }).format(value);
}

export function formatPercent(value, fallback = '—') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return fallback;
  return `${formatNumber(Number(value), { maximumFractionDigits: 1 })}%`;
}

export function currencySymbol(currency = 'INR') {
  return (
    new Intl.NumberFormat(LOCALES[currency] || 'en-IN', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value || currency
  );
}

export function formatSignedCurrency(paise, currency, type) {
  if (!paise) return formatCurrency(0, currency);
  const sign = type === 'income' ? '+' : '-';
  return `${sign}${formatCurrency(Math.abs(paise), currency)}`;
}
