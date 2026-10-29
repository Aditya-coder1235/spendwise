import { Pencil, Repeat2, Trash2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { CategoryIcon } from '../../components/ui/CategoryIcon.jsx';
import { formatCurrency } from '../../utils/format.js';
import { formatDisplayDate } from '../../utils/date.js';
import { PAYMENT_METHODS } from '../../utils/constants.js';
import { useAuth } from '../../context/AuthContext.jsx';

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-line py-3 last:border-0">
      <dt className="text-xs text-ink-subtle">{label}</dt>
      <dd className="max-w-[65%] text-right text-xs font-medium text-ink">{children || '—'}</dd>
    </div>
  );
}

export function TransactionDetailsModal({ open, transaction, onClose, onEdit, onDelete }) {
  const { user } = useAuth();
  if (!transaction) return null;
  const isIncome = transaction.type === 'income';
  const method =
    PAYMENT_METHODS.find((item) => item.value === transaction.paymentMethod)?.label ||
    transaction.paymentMethod;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transaction details"
      size="md"
      footer={
        <div className="flex flex-wrap justify-between gap-2">
          <Button
            variant="dangerSoft"
            size="sm"
            onClick={() => {
              onClose();
              onDelete(transaction);
            }}
          >
            <Trash2 size={14} aria-hidden="true" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onClose();
                onEdit(transaction);
              }}
            >
              <Pencil size={14} aria-hidden="true" />
              Edit transaction
            </Button>
          </div>
        </div>
      }
    >
      <div className="text-center">
        <CategoryIcon
          icon={transaction.category?.icon}
          color={transaction.category?.color}
          size="lg"
          className="mx-auto"
        />
        <p className="mt-3 text-sm font-medium text-ink">{transaction.description}</p>
        <p
          className={`financial-number mt-1 text-3xl font-bold ${
            isIncome ? 'text-income' : 'text-ink'
          }`}
        >
          {isIncome ? '+' : '−'}
          {formatCurrency(transaction.amountPaise, user?.preferredCurrency)}
        </p>
        <div className="mt-2 flex justify-center gap-2">
          <Badge variant={isIncome ? 'income' : 'expense'}>{isIncome ? 'Income' : 'Expense'}</Badge>
          {transaction.recurrenceId && (
            <Badge variant="neutral">
              <Repeat2 size={11} aria-hidden="true" />
              Recurring
            </Badge>
          )}
        </div>
      </div>

      <dl className="mt-6">
        <DetailRow label="Category">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: transaction.category?.color || '#64748b' }}
              aria-hidden="true"
            />
            {transaction.category?.name || 'Uncategorised'}
          </span>
        </DetailRow>
        <DetailRow label="Date">
          {formatDisplayDate(transaction.date, user?.dateFormat)}
        </DetailRow>
        <DetailRow label="Merchant / payee">{transaction.merchant}</DetailRow>
        <DetailRow label="Payment method">{method}</DetailRow>
        <DetailRow label="Tags">
          {transaction.tags?.length ? (
            <span className="flex flex-wrap justify-end gap-1">
              {transaction.tags.map((tag) => (
                <Badge key={tag} variant="neutral">
                  {tag}
                </Badge>
              ))}
            </span>
          ) : (
            '—'
          )}
        </DetailRow>
        <DetailRow label="Notes">
          <span className="whitespace-pre-wrap">{transaction.notes}</span>
        </DetailRow>
        <DetailRow label="Recorded">
          {transaction.createdAt
            ? `${formatDisplayDate(transaction.createdAt, user?.dateFormat)}`
            : '—'}
        </DetailRow>
      </dl>
    </Modal>
  );
}
