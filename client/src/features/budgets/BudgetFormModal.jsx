import { useEffect, useId, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, FormError, Input, Select } from '../../components/ui/FormControls.jsx';
import { CategoryIcon } from '../../components/ui/CategoryIcon.jsx';
import { budgetsApi, getErrorMessage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { currencySymbol } from '../../utils/format.js';
import { formatMonth } from '../../utils/date.js';
import { apiFieldErrors, budgetSchema, zodErrors } from '../../utils/validation.js';

export function BudgetFormModal({
  open,
  onClose,
  budget,
  kind = 'category',
  period,
  categories = [],
  existingCategoryIds = [],
  onSaved,
}) {
  const { user } = useAuth();
  const formId = useId();
  const [form, setForm] = useState({ categoryId: '', monthlyLimit: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(budget?.id);
  const availableCategories = categories.filter(
    (category) =>
      !existingCategoryIds.includes(category.id) || category.id === budget?.category?.id,
  );

  useEffect(() => {
    if (!open) return;
    setForm({
      categoryId: budget?.category?.id || '',
      monthlyLimit: budget ? (budget.monthlyLimitPaise / 100).toFixed(2) : '',
    });
    setErrors({});
    setFormError('');
  }, [open, budget]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (kind === 'category' && !isEditing && !form.categoryId) {
      setErrors({ categoryId: 'Choose a category' });
      return;
    }
    const payload = {
      categoryId: kind === 'overall' ? '' : form.categoryId,
      period,
      monthlyLimit: form.monthlyLimit,
    };
    const result = budgetSchema.safeParse(payload);
    if (!result.success) {
      setErrors(zodErrors(result.error));
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (isEditing) {
        await budgetsApi.update(budget.id, { monthlyLimit: result.data.monthlyLimit });
        toast.success('Budget updated.');
      } else {
        await budgetsApi.create({
          categoryId: kind === 'overall' ? null : result.data.categoryId || null,
          period,
          monthlyLimit: result.data.monthlyLimit,
        });
        toast.success(kind === 'overall' ? 'Monthly budget set.' : 'Category budget added.');
      }
      onSaved?.();
      onClose();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      setFormError(getErrorMessage(error, 'Could not save this budget.'));
    } finally {
      setSaving(false);
    }
  };

  const title = isEditing
    ? 'Edit budget'
    : kind === 'overall'
      ? 'Set monthly budget'
      : 'Add category budget';

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title={title}
      description={`For ${formatMonth(period, 'MMMM yyyy')}. Budgets only compare against expenses.`}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {isEditing ? 'Save budget' : 'Set budget'}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />

        {kind === 'category' && !isEditing && (
          <Field label="Expense category" htmlFor="budget-category" error={errors.categoryId} required>
            {availableCategories.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line-strong p-3 text-xs text-ink-subtle">
                Every expense category already has a budget this month. Edit an existing one
                instead.
              </p>
            ) : (
              <Select
                id="budget-category"
                value={form.categoryId}
                onChange={(event) => {
                  setForm((previous) => ({ ...previous, categoryId: event.target.value }));
                  setErrors((previous) => ({ ...previous, categoryId: undefined }));
                }}
                invalid={Boolean(errors.categoryId)}
                required
              >
                <option value="">Choose a category</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            )}
            {form.categoryId && (
              <div className="mt-2 flex items-center gap-2">
                {(() => {
                  const selected = availableCategories.find(
                    (category) => category.id === form.categoryId,
                  );
                  return selected ? (
                    <>
                      <CategoryIcon
                        icon={selected.icon}
                        color={selected.color}
                        size="sm"
                        className="size-6"
                      />
                      <span className="text-[11px] text-ink-subtle">{selected.name}</span>
                    </>
                  ) : null;
                })()}
              </div>
            )}
          </Field>
        )}

        {isEditing && budget?.category && (
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-soft p-3">
            <CategoryIcon icon={budget.category.icon} color={budget.category.color} size="sm" />
            <div>
              <p className="text-xs font-medium text-ink">{budget.category.name}</p>
              <p className="text-[10px] text-ink-subtle">Category budget</p>
            </div>
          </div>
        )}

        <Field
          label="Monthly limit"
          htmlFor="budget-limit"
          error={errors.monthlyLimit}
          hint="The most you plan to spend in this category this month."
          required
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-subtle">
              {currencySymbol(user?.preferredCurrency)}
            </span>
            <Input
              id="budget-limit"
              inputMode="decimal"
              placeholder="0.00"
              value={form.monthlyLimit}
              onChange={(event) => {
                setForm((previous) => ({ ...previous, monthlyLimit: event.target.value }));
                setErrors((previous) => ({ ...previous, monthlyLimit: undefined }));
              }}
              invalid={Boolean(errors.monthlyLimit)}
              className="financial-number pl-8 text-base font-semibold"
              required
            />
          </div>
        </Field>

        <p className="rounded-xl bg-surface-soft p-3 text-[11px] leading-5 text-ink-subtle">
          You&apos;ll see a warning at {user?.warningThreshold || 80}% of this limit and a clear
          exceeded state at 100%. You can change the warning threshold in Settings.
        </p>
      </form>
    </Modal>
  );
}
