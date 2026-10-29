import { useEffect, useId, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock, Repeat2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, FormError, Input, Select, Textarea, Toggle } from '../../components/ui/FormControls.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getErrorMessage, recurringApi } from '../../services/api.js';
import { FREQUENCIES, PAYMENT_METHODS } from '../../utils/constants.js';
import { toDateKey } from '../../utils/date.js';
import { currencySymbol } from '../../utils/format.js';
import { apiFieldErrors, recurringSchema, zodErrors } from '../../utils/validation.js';

function emptyForm() {
  return {
    type: 'expense',
    amount: '',
    categoryId: '',
    description: '',
    merchant: '',
    paymentMethod: 'upi',
    tags: '',
    notes: '',
    frequency: 'monthly',
    nextOccurrence: toDateKey(),
    endDate: '',
    active: true,
  };
}

export function RecurringFormModal({ open, onClose, recurring, categories, onSaved }) {
  const { user } = useAuth();
  const formId = useId();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(recurring?.id);
  const filteredCategories = categories.filter((category) => category.type === form.type);

  useEffect(() => {
    if (!open) return;
    if (recurring) {
      setForm({
        type: recurring.type,
        amount: (recurring.amountPaise / 100).toFixed(2),
        categoryId: recurring.category?.id || '',
        description: recurring.description || '',
        merchant: recurring.merchant || '',
        paymentMethod: recurring.paymentMethod || 'upi',
        tags: (recurring.tags || []).join(', '),
        notes: recurring.notes || '',
        frequency: recurring.frequency || 'monthly',
        nextOccurrence: String(recurring.nextOccurrence).slice(0, 10),
        endDate: recurring.endDate ? String(recurring.endDate).slice(0, 10) : '',
        active: recurring.active,
      });
    } else {
      setForm({
        ...emptyForm(),
        categoryId: categories.find((category) => category.type === 'expense')?.id || '',
      });
    }
    setErrors({});
    setFormError('');
  }, [open, recurring, categories]);

  const change = (field) => (event) => {
    const value = field === 'active' ? event.target.checked : event.target.value;
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setFormError('');
  };

  const chooseType = (type) => {
    const first = categories.find((category) => category.type === type);
    setForm((previous) => ({ ...previous, type, categoryId: first?.id || '' }));
    setErrors((previous) => ({ ...previous, type: undefined, categoryId: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = recurringSchema.safeParse(form);
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
      tags: (result.data.tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 10),
      notes: result.data.notes || '',
      frequency: result.data.frequency,
      nextOccurrence: result.data.nextOccurrence,
      endDate: result.data.endDate || null,
      active: result.data.active,
    };

    setSaving(true);
    setFormError('');
    try {
      if (isEditing) {
        await recurringApi.update(recurring.id, payload);
        toast.success('Recurring schedule updated.');
      } else {
        await recurringApi.create(payload);
        toast.success('Recurring schedule created.');
      }
      onSaved?.();
      onClose();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      setFormError(getErrorMessage(error, 'Could not save this recurring schedule.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title={isEditing ? 'Edit recurring schedule' : 'New recurring schedule'}
      description="Scheduled entries become real transactions when they are due."
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {isEditing ? 'Save changes' : 'Create schedule'}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-5" noValidate>
        <FormError message={formError} />

        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink">Type</span>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-muted p-1">
            {['expense', 'income'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => chooseType(type)}
                aria-pressed={form.type === type}
                className={`h-9 rounded-lg text-[13px] font-semibold capitalize transition-colors ${
                  form.type === type
                    ? type === 'expense'
                      ? 'bg-surface text-expense shadow-sm'
                      : 'bg-surface text-income shadow-sm'
                    : 'text-ink-subtle hover:text-ink'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Amount" htmlFor="rec-amount" error={errors.amount} required>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-subtle">
                {currencySymbol(user?.preferredCurrency)}
              </span>
              <Input
                id="rec-amount"
                inputMode="decimal"
                placeholder="0.00"
                value={form.amount}
                onChange={change('amount')}
                invalid={Boolean(errors.amount)}
                className="financial-number pl-8 text-base font-semibold"
              />
            </div>
          </Field>
          <Field label="Category" htmlFor="rec-category" error={errors.categoryId} required>
            <Select
              id="rec-category"
              value={form.categoryId}
              onChange={change('categoryId')}
              invalid={Boolean(errors.categoryId)}
            >
              <option value="">Choose a category</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Description" htmlFor="rec-description" error={errors.description} required>
          <Input
            id="rec-description"
            placeholder="e.g. Netflix subscription"
            value={form.description}
            onChange={change('description')}
            invalid={Boolean(errors.description)}
            maxLength={200}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Merchant or payee" htmlFor="rec-merchant" error={errors.merchant} hint="Optional">
            <Input
              id="rec-merchant"
              value={form.merchant}
              onChange={change('merchant')}
              maxLength={120}
            />
          </Field>
          <Field label="Payment method" htmlFor="rec-payment">
            <Select id="rec-payment" value={form.paymentMethod} onChange={change('paymentMethod')}>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="rounded-xl border border-line bg-surface-soft p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-ink">
            <CalendarClock size={15} className="text-brand-600" aria-hidden="true" />
            Schedule
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Frequency" htmlFor="rec-frequency" error={errors.frequency}>
              <Select id="rec-frequency" value={form.frequency} onChange={change('frequency')}>
                {FREQUENCIES.map((frequency) => (
                  <option key={frequency.value} value={frequency.value}>
                    {frequency.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Next occurrence" htmlFor="rec-next" error={errors.nextOccurrence} required>
              <Input
                id="rec-next"
                type="date"
                value={form.nextOccurrence}
                onChange={change('nextOccurrence')}
                invalid={Boolean(errors.nextOccurrence)}
              />
            </Field>
            <Field label="End date" htmlFor="rec-end" error={errors.endDate} hint="Optional">
              <Input
                id="rec-end"
                type="date"
                value={form.endDate}
                min={form.nextOccurrence}
                onChange={change('endDate')}
                invalid={Boolean(errors.endDate)}
              />
            </Field>
          </div>
          <div className="mt-3">
            <Toggle
              checked={form.active}
              onChange={change('active')}
              label="Active schedule"
              description="Paused schedules stay listed but will not create transactions."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tags" htmlFor="rec-tags" error={errors.tags} hint="Comma-separated">
            <Input id="rec-tags" value={form.tags} onChange={change('tags')} />
          </Field>
          <Field label="Notes" htmlFor="rec-notes" error={errors.notes}>
            <Textarea id="rec-notes" value={form.notes} onChange={change('notes')} rows={2} />
          </Field>
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-[11px] leading-5 text-brand-800 dark:bg-brand-500/10 dark:text-brand-300">
          <Repeat2 size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          Scheduled templates are kept separate from actual transactions. The server processes due
          schedules and records each occurrence only once.
        </p>
      </form>
    </Modal>
  );
}
