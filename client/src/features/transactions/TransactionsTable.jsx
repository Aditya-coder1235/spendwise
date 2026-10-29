import { Eye, Pencil, Repeat2, Trash2 } from 'lucide-react';
import { CategoryIcon } from '../../components/ui/CategoryIcon.jsx';
import { formatCurrency } from '../../utils/format.js';
import { formatDisplayDate } from '../../utils/date.js';
import { PAYMENT_METHODS } from '../../utils/constants.js';
import { useAuth } from '../../context/AuthContext.jsx';

function methodLabel(value) {
  return PAYMENT_METHODS.find((method) => method.value === value)?.label || value || '—';
}

function CategoryPill({ category }) {
  const name = category?.name || 'Uncategorised';
  return (
    <span className="inline-flex items-center gap-2 text-xs text-ink-muted">
      <CategoryIcon icon={category?.icon} color={category?.color} size="sm" className="size-7" />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function TransactionsTable({ items, onView, onEdit, onDelete }) {
  const { user } = useAuth();

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface-soft">
              <th scope="col" className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                Date
              </th>
              <th scope="col" className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                Transaction
              </th>
              <th scope="col" className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                Category
              </th>
              <th scope="col" className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                Method
              </th>
              <th scope="col" className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                Amount
              </th>
              <th scope="col" className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((transaction) => (
              <tr key={transaction.id} className="group transition-colors hover:bg-surface-soft/70">
                <td className="whitespace-nowrap px-5 py-3 text-xs text-ink-muted">
                  {formatDisplayDate(transaction.date, user?.dateFormat)}
                </td>
                <td className="max-w-[280px] px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onView(transaction)}
                    className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-medium text-ink">
                        {transaction.description}
                      </span>
                      {transaction.recurrenceId && (
                        <Repeat2
                          size={12}
                          className="shrink-0 text-ink-subtle"
                          aria-label="Recurring entry"
                        />
                      )}
                    </span>
                    {transaction.merchant && (
                      <span className="mt-0.5 block truncate text-[11px] text-ink-subtle">
                        {transaction.merchant}
                      </span>
                    )}
                  </button>
                </td>
                <td className="px-3 py-3">
                  <CategoryPill category={transaction.category} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-subtle">
                  {methodLabel(transaction.paymentMethod)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right">
                  <span
                    className={`financial-number text-[13px] font-semibold ${
                      transaction.type === 'income' ? 'text-income' : 'text-ink'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '−'}
                    {formatCurrency(transaction.amountPaise, user?.preferredCurrency)}
                  </span>
                  <span className="mt-0.5 block text-[10px] capitalize text-ink-subtle">
                    {transaction.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onView(transaction)}
                      aria-label={`View ${transaction.description}`}
                      className="grid size-8 place-items-center rounded-lg text-ink-subtle hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <Eye size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(transaction)}
                      aria-label={`Edit ${transaction.description}`}
                      className="grid size-8 place-items-center rounded-lg text-ink-subtle hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(transaction)}
                      aria-label={`Delete ${transaction.description}`}
                      className="grid size-8 place-items-center rounded-lg text-ink-subtle hover:bg-rose-50 hover:text-expense focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-line md:hidden">
        {items.map((transaction) => (
          <div key={transaction.id} className="flex items-center gap-2 px-4 py-3">
            <button
              type="button"
              onClick={() => onView(transaction)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <CategoryIcon
                icon={transaction.category?.icon}
                color={transaction.category?.color}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">{transaction.description}</p>
                <p className="mt-0.5 truncate text-[10px] text-ink-subtle">
                  {transaction.category?.name || 'Uncategorised'} ·{' '}
                  {formatDisplayDate(transaction.date, user?.dateFormat)}
                </p>
                {transaction.merchant && (
                  <p className="mt-0.5 truncate text-[10px] text-ink-subtle">{transaction.merchant}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={`financial-number text-[13px] font-semibold ${
                    transaction.type === 'income' ? 'text-income' : 'text-ink'
                  }`}
                >
                  {transaction.type === 'income' ? '+' : '−'}
                  {formatCurrency(transaction.amountPaise, user?.preferredCurrency)}
                </p>
                <p className="mt-0.5 text-[10px] capitalize text-ink-subtle">{transaction.type}</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onEdit(transaction)}
              aria-label={`Edit ${transaction.description}`}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-subtle hover:bg-surface-muted hover:text-ink"
            >
              <Pencil size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
