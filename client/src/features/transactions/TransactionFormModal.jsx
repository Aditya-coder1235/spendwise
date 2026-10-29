import { useEffect, useId, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownLeft, ArrowUpRight, Repeat2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, FormError, Input, Select, Textarea } from '../../components/ui/FormControls.jsx';
import { CategoryIcon } from '../../components/ui/CategoryIcon.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { categoriesApi, getErrorMessage, transactionsApi } from '../../services/api.js';
import { PAYMENT_METHODS } from '../../utils/constants.js';
import { toDateKey } from '../../utils/date.js';
import { currencySymbol } from '../../utils/format.js';
import { apiFieldErrors, transactionSchema, zodErrors } from '../../utils/validation.js';

function emptyForm(type = 'expense') {
  return {
    type,
    amount: '',
    categoryId: '',
    description: '',
    merchant: '',
    paymentMethod: 'upi',
    date: toDateKey(),
    tags: '',
    notes: '',
  };
}

export function TransactionFormModal({
  open,
  onClose,
  transaction = null,
  defaultType = 'expense',
  onSaved,
}) {
  const { user } = useAuth();
  const formId = useId();
  const [form, setForm] = useState(() => emptyForm(defaultType));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(transaction?.id);

  const {
    data: categoryData,
    loading: categoriesLoading,
    error: categoriesError,
    refetch: reloadCategories,
  } = useApi(() => categoriesApi.list(), [open], { enabled: open });

  const categories = useMemo(() => categoryData?.categories || [], [categoryData]);
  const filteredCategories = categories.filter((category) => category.type === form.type);
  const symbol = currencySymbol(user?.preferredCurrency || 'INR');

  useEffect(() => {
    if (!open) return;
    if (transaction) {
      setForm({
        type: transaction.type,
        amount: (transaction.amountPaise / 100).toFixed(2),
        categoryId: transaction.category?.id || transaction.categoryId || '',
        description: transaction.description || '',
        merchant: transaction.merchant || '',
        paymentMethod: transaction.paymentMethod || 'upi',
        date: transaction.date ? String(transaction.date).slice(0, 10) : toDateKey(),
        tags: (transaction.tags || []).join(', '),
        notes: transaction.notes || '',
      });
    } else {
      setForm(emptyForm(defaultType));
    }
    setErrors({});
    setFormError('');
  }, [open, transaction, defaultType]);

  useEffect(() => {
    if (!open || form.categoryId) return;
    const first = categories.find((category) => category.type === form.type);
    if (first) setForm((previous) => ({ ...previous, categoryId: first.id }));
  }, [open, categories, form.categoryId, form.type]);

  const change = (field) => (event) => {
    const value = event.target.value;
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setFormError('');
  };

  const chooseType = (type) => {
    const firstCategory = categories.find((category) => category.type === type);
    setForm((previous) => ({
      ...previous,
      type,
      categoryId: firstCategory?.id || '',
    }));
    setErrors((previous) => ({ ...previous, type: undefined, categoryId: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = transactionSchema.safeParse(form);
    if (!result.success) {
      setErrors(zodErrors(result.error));
      return;
    }

    const payload = {
      type: result.data.type,
      amount: result.data.amount,
      categoryId: result.data.categoryId,
      description: result.data.description,
      merchant: result.data.merchant || '',
      paymentMethod: result.data.paymentMethod,
      date: result.data.date,
      tags: (result.data.tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 10),
      notes: result.data.notes || '',
    };

    setSaving(true);
    setFormError('');
    try {
      const response = isEditing
        ? await transactionsApi.update(transaction.id, payload)
        : await transactionsApi.create(payload);
      toast.success(isEditing ? 'Transaction updated.' : 'Transaction added.');
      onSaved?.(response.transaction);
      onClose();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      setFormError(getErrorMessage(error, 'Could not save this transaction.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title={isEditing ? 'Edit transaction' : 'Add transaction'}
      description={isEditing ? 'Update the details and save your changes.' : 'Record money in or out in a few seconds.'}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-[11px] text-ink-subtle sm:block">
            Amounts are stored with paise precision.
          </p>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form={formId} loading={saving}>
              {isEditing ? 'Save changes' : 'Add transaction'}
            </Button>
          </div>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-5" noValidate>
        <FormError message={formError} />

        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink">Type</span>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-muted p-1">
            {[
              { value: 'expense', label: 'Expense', icon: ArrowDownLeft },
              { value: 'income', label: 'Income', icon: ArrowUpRight },
            ].map((option) => {
              const Icon = option.icon;
              const active = form.type === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => chooseType(option.value)}
                  className={`flex h-9 items-center justify-center gap-2 rounded-lg text-[13px] font-semibold transition-colors ${
                    active
                      ? option.value === 'expense'
                        ? 'bg-surface text-expense shadow-sm'
                        : 'bg-surface text-income shadow-sm'
                      : 'text-ink-subtle hover:text-ink'
                  }`}
                >
                  <Icon size={15} aria-hidden="true" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Amount" htmlFor="tx-amount" error={errors.amount} required>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-subtle">
                {symbol}
              </span>
              <Input
                id="tx-amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={form.amount}
                onChange={change('amount')}
                invalid={Boolean(errors.amount)}
                className="financial-number pl-8 text-base font-semibold"
                required
              />
            </div>
          </Field>
          <Field label="Date" htmlFor="tx-date" error={errors.date} required>
            <Input
              id="tx-date"
              type="date"
              value={form.date}
              onChange={change('date')}
              invalid={Boolean(errors.date)}
              required
            />
          </Field>
        </div>

        <Field label="Category" htmlFor="tx-category" error={errors.categoryId} required>
          {categoriesLoading ? (
            <div className="h-10 animate-pulse rounded-xl bg-surface-muted" />
          ) : categoriesError ? (
            <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-xs text-ink-subtle">
              Categories could not load.
              <button type="button" onClick={reloadCategories} className="font-semibold text-brand-700">
                Retry
              </button>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line-strong px-3 py-3 text-xs text-ink-subtle">
              No {form.type} categories yet. Add one in Settings → Categories.
            </div>
          ) : (
            <Select
              id="tx-category"
              value={form.categoryId}
              onChange={change('categoryId')}
              invalid={Boolean(errors.categoryId)}
              required
            >
              <option value="">Choose a category</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          )}
          {form.categoryId && filteredCategories.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-subtle">
              {(() => {
                const selected = filteredCategories.find((category) => category.id === form.categoryId);
                return selected ? (
                  <>
                    <CategoryIcon icon={selected.icon} color={selected.color} size="sm" className="size-6" />
                    <span>{selected.name}</span>
                  </>
                ) : null;
              })()}
            </div>
          )}
        </Field>

        <Field label="Description" htmlFor="tx-description" error={errors.description} required>
          <Input
            id="tx-description"
            placeholder="e.g. Grocery shopping at DMart"
            value={form.description}
            onChange={change('description')}
            invalid={Boolean(errors.description)}
            maxLength={200}
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Merchant or payee" htmlFor="tx-merchant" error={errors.merchant} hint="Optional">
            <Input
              id="tx-merchant"
              placeholder="e.g. DMart"
              value={form.merchant}
              onChange={change('merchant')}
              invalid={Boolean(errors.merchant)}
              maxLength={120}
            />
          </Field>
          <Field label="Payment method" htmlFor="tx-payment" error={errors.paymentMethod}>
            <Select
              id="tx-payment"
              value={form.paymentMethod}
              onChange={change('paymentMethod')}
              invalid={Boolean(errors.paymentMethod)}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Tags"
          htmlFor="tx-tags"
          error={errors.tags}
          hint="Separate tags with commas. Up to 10."
        >
          <Input
            id="tx-tags"
            placeholder="e.g. weekly, essentials"
            value={form.tags}
            onChange={change('tags')}
          />
        </Field>

        <Field label="Notes" htmlFor="tx-notes" error={errors.notes} hint="Optional">
          <Textarea
            id="tx-notes"
            placeholder="Anything useful to remember about this transaction"
            value={form.notes}
            onChange={change('notes')}
            maxLength={1000}
          />
        </Field>

        {isEditing && (
          <p className="flex items-center gap-1.5 text-[11px] text-ink-subtle">
            <Repeat2 size={13} aria-hidden="true" />
            Editing an automatically generated recurring entry updates only this record.
          </p>
        )}
      </form>
    </Modal>
  );
}
