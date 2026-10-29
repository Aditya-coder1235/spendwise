import { useEffect, useId, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, FormError, Input, Select } from '../../components/ui/FormControls.jsx';
import { CategoryIcon } from '../../components/ui/CategoryIcon.jsx';
import { categoriesApi, getErrorMessage } from '../../services/api.js';
import { ICON_OPTIONS } from '../../utils/constants.js';
import { apiFieldErrors, categorySchema, zodErrors } from '../../utils/validation.js';

const PRESET_COLOURS = [
  '#059669',
  '#0d9488',
  '#0891b2',
  '#2563eb',
  '#7c3aed',
  '#c026d3',
  '#db2777',
  '#e11d48',
  '#ea580c',
  '#ca8a04',
  '#65a30d',
  '#64748b',
];

export function CategoryFormModal({ open, onClose, category, onSaved }) {
  const formId = useId();
  const isEditing = Boolean(category?.id);
  const [form, setForm] = useState({
    name: '',
    type: 'expense',
    color: '#059669',
    icon: 'tag',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: category?.name || '',
      type: category?.type || 'expense',
      color: category?.color || '#059669',
      icon: category?.icon || 'tag',
    });
    setErrors({});
    setFormError('');
  }, [open, category]);

  const change = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = categorySchema.safeParse(form);
    if (!result.success) {
      setErrors(zodErrors(result.error));
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (isEditing) {
        await categoriesApi.update(category.id, {
          name: result.data.name,
          color: result.data.color,
          icon: result.data.icon,
        });
        toast.success('Category updated.');
      } else {
        await categoriesApi.create(result.data);
        toast.success('Category added.');
      }
      onSaved?.();
      onClose();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      setFormError(getErrorMessage(error, 'Could not save this category.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title={isEditing ? 'Edit category' : 'Add custom category'}
      description={isEditing ? 'Update the name, colour, or icon.' : 'Create a category tailored to how you spend.'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {isEditing ? 'Save category' : 'Add category'}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />

        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-soft p-3.5">
          <CategoryIcon icon={form.icon} color={form.color} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{form.name || 'Category preview'}</p>
            <p className="mt-0.5 text-[11px] capitalize text-ink-subtle">{form.type}</p>
          </div>
        </div>

        <Field label="Category name" htmlFor="category-name" error={errors.name} required>
          <Input
            id="category-name"
            value={form.name}
            onChange={change('name')}
            invalid={Boolean(errors.name)}
            placeholder="e.g. Hobbies"
            maxLength={50}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="category-type" error={errors.type} required>
            <Select
              id="category-type"
              value={form.type}
              onChange={change('type')}
              disabled={isEditing}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </Select>
          </Field>
          <Field label="Icon" htmlFor="category-icon" error={errors.icon}>
            <Select id="category-icon" value={form.icon} onChange={change('icon')}>
              {ICON_OPTIONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon.replaceAll('-', ' ')}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Colour" htmlFor="category-color" error={errors.color} required>
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_COLOURS.map((colour) => (
              <button
                key={colour}
                type="button"
                aria-label={`Use colour ${colour}`}
                aria-pressed={form.color === colour}
                onClick={() => setForm((previous) => ({ ...previous, color: colour }))}
                className={`size-8 rounded-lg border-2 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  form.color === colour ? 'border-ink' : 'border-transparent'
                }`}
                style={{ backgroundColor: colour }}
              />
            ))}
            <label className="ml-1 inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-line px-2 text-[11px] text-ink-subtle">
              Custom
              <input
                id="category-color"
                type="color"
                value={form.color}
                onChange={change('color')}
                className="size-5 cursor-pointer border-0 bg-transparent p-0"
              />
            </label>
          </div>
        </Field>
      </form>
    </Modal>
  );
}
