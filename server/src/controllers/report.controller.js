import { asyncHandler } from '../utils/api-error.js';
import { resolveDateRange } from '../utils/date-range.js';
import { getReportSummary } from '../services/dashboard.service.js';
import { findTransactionsForExport } from '../services/transaction.service.js';
import { escapeCsvCell } from '../utils/sanitize.js';
import { formatPaiseAsDecimal } from '../utils/money.js';
import { PAYMENT_METHOD_LABELS } from '../utils/constants.js';

export const summary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = resolveDateRange(req.validated.query);
  const data = await getReportSummary(req.user, startDate, endDate);
  res.json({ success: true, data });
});

export const exportCsv = asyncHandler(async (req, res) => {
  const transactions = await findTransactionsForExport(req.user.id, req.validated.query);
  const header = [
    'Date',
    'Type',
    'Category',
    'Description',
    'Merchant',
    'Amount',
    'Currency',
    'Payment method',
    'Tags',
    'Notes',
  ];

  const rows = transactions.map((transaction) => [
    transaction.date instanceof Date
      ? transaction.date.toISOString().slice(0, 10)
      : new Date(transaction.date).toISOString().slice(0, 10),
    transaction.type,
    transaction.category?.name || 'Uncategorised',
    transaction.description,
    transaction.merchant,
    formatPaiseAsDecimal(transaction.amountPaise),
    req.user.preferredCurrency,
    PAYMENT_METHOD_LABELS[transaction.paymentMethod] || transaction.paymentMethod,
    (transaction.tags || []).join('; '),
    transaction.notes,
  ]);

  const csv = `\uFEFF${[header, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n')}\r\n`;

  const filename = `spendwise-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});
