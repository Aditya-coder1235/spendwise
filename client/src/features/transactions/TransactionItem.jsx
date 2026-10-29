import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { CategoryIcon } from '../../components/ui/CategoryIcon.jsx';
import { formatCurrency } from '../../utils/format.js';
import { formatDisplayDate } from '../../utils/date.js';
import { useAuth } from '../../context/AuthContext.jsx';

export function TransactionItem({ transaction, showDate = true, onClick }) {
  const { user } = useAuth();
  const isIncome = transaction.type === 'income';
  const category = transaction.category;
  const categoryName =
    typeof category === 'object' && category ? category.name : transaction.categoryName || 'Uncategorised';
  const icon = typeof category === 'object' && category ? category.icon : 'tag';
  const color = typeof category === 'object' && category ? category.color : '#64748b';
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      {...(onClick ? { type: 'button', onClick, className: 'w-full text-left' } : {})}
      className={
        onClick
          ? 'group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:px-3'
          : 'flex items-center gap-3 rounded-xl px-2 py-2.5 sm:px-3'
      }
    >
      <CategoryIcon icon={icon} color={color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{transaction.description}</p>
        <p className="mt-0.5 truncate text-[11px] text-ink-subtle">
          {categoryName}
          {transaction.merchant ? ` · ${transaction.merchant}` : ''}
          {showDate ? ` · ${formatDisplayDate(transaction.date, user?.dateFormat)}` : ''}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={`financial-number text-[13px] font-semibold ${
            isIncome ? 'text-income' : 'text-ink'
          }`}
        >
          {isIncome ? '+' : '−'}
          {formatCurrency(transaction.amountPaise, user?.preferredCurrency)}
        </p>
        <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-ink-subtle">
          {isIncome ? (
            <ArrowUpRight size={11} className="text-income" aria-hidden="true" />
          ) : (
            <ArrowDownLeft size={11} aria-hidden="true" />
          )}
          {isIncome ? 'Income' : 'Expense'}
        </p>
      </div>
    </Wrapper>
  );
}
