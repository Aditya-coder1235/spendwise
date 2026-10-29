import { useState } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import {
  CalendarClock,
  Pencil,
  Play,
  Plus,
  Repeat2,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { EmptyState, ErrorState } from '../components/ui/States.jsx';
import { PageSkeleton } from '../components/ui/Skeleton.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { CategoryIcon } from '../components/ui/CategoryIcon.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { Toggle } from '../components/ui/FormControls.jsx';
import { RecurringFormModal } from '../features/recurring/RecurringFormModal.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useQuickAdd } from '../features/transactions/QuickAddContext.jsx';
import {
  categoriesApi,
  getErrorMessage,
  recurringApi,
} from '../services/api.js';
import { FREQUENCIES } from '../utils/constants.js';
import { formatCurrency } from '../utils/format.js';
import { formatDisplayDate } from '../utils/date.js';

function recurringPayload(item, active) {
  return {
    type: item.type,
    amount: (item.amountPaise / 100).toFixed(2),
    categoryId: item.category?.id,
    description: item.description,
    merchant: item.merchant || '',
    paymentMethod: item.paymentMethod,
    tags: item.tags || [],
    notes: item.notes || '',
    frequency: item.frequency,
    nextOccurrence: String(item.nextOccurrence).slice(0, 10),
    endDate: item.endDate ? String(item.endDate).slice(0, 10) : null,
    active,
  };
}

function dueLabel(date) {
  const difference = differenceInCalendarDays(parseISO(String(date).slice(0, 10)), new Date());
  if (difference < 0) return { text: 'Due since', tone: 'warning' };
  if (difference === 0) return { text: 'Due today', tone: 'warning' };
  if (difference === 1) return { text: 'Due tomorrow', tone: 'neutral' };
  return { text: `In ${difference} days`, tone: 'neutral' };
}

export default function RecurringPage() {
  const { user } = useAuth();
  const { version } = useQuickAdd();
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const currency = user?.preferredCurrency || 'INR';

  const { data, loading, error, refetch } = useApi(
    async () => {
      const [recurringData, categoryData] = await Promise.all([
        recurringApi.list(),
        categoriesApi.list(),
      ]);
      return { recurringData, categoryData };
    },
    [version],
  );

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return (
      <ErrorState
        title="Recurring schedules could not load"
        message={getErrorMessage(error)}
        onRetry={refetch}
        className="min-h-[55vh]"
      />
    );
  }

  const items = data.recurringData.items || [];
  const categories = data.categoryData.categories || [];
  const activeCount = items.filter((item) => item.active).length;

  const runDue = async () => {
    setProcessing(true);
    try {
      const result = await recurringApi.process();
      if (result.createdCount > 0) {
        toast.success(
          `${result.createdCount} scheduled ${result.createdCount === 1 ? 'transaction' : 'transactions'} created.`,
        );
      } else {
        toast.success('No recurring transactions are due.');
      }
      refetch();
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, 'Could not process recurring schedules.'));
    } finally {
      setProcessing(false);
    }
  };

  const toggleActive = async (item) => {
    setTogglingId(item.id);
    try {
      await recurringApi.update(item.id, recurringPayload(item, !item.active));
      toast.success(item.active ? 'Schedule paused.' : 'Schedule resumed.');
      refetch();
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, 'Could not update this schedule.'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await recurringApi.remove(deleting.id);
      toast.success('Recurring schedule deleted.');
      setDeleting(null);
      refetch();
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, 'Could not delete this schedule.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Planning"
        title="Recurring transactions"
        description="Plan regular rent, salary, bills, and subscriptions without re-entering them."
        actions={
          <>
            <Button variant="secondary" onClick={runDue} loading={processing}>
              <Play size={14} aria-hidden="true" />
              Process due now
            </Button>
            <Button onClick={() => setModal({ recurring: null })}>
              <Plus size={16} aria-hidden="true" />
              New schedule
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[11px] text-ink-subtle">Active schedules</p>
          <p className="financial-number mt-1 text-2xl font-bold text-ink">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] text-ink-subtle">Paused schedules</p>
          <p className="financial-number mt-1 text-2xl font-bold text-ink">
            {items.length - activeCount}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] text-ink-subtle">Next scheduled item</p>
          <p className="mt-1 truncate text-sm font-semibold text-ink">
            {items.find((item) => item.active)
              ? formatDisplayDate(items.find((item) => item.active).nextOccurrence, user?.dateFormat)
              : 'None scheduled'}
          </p>
        </Card>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-soft px-4 py-3 text-[11px] leading-5 text-ink-subtle">
        <CalendarClock size={15} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />
        <p>
          Scheduled templates do not affect totals by themselves. When an occurrence is due, the
          server creates a real transaction once; use <strong className="font-semibold text-ink-muted">Process due now</strong> to
          run it immediately or let the background scheduler handle it every 15 minutes.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Repeat2}
            title="No recurring schedules yet"
            description="Create a schedule for rent, salary, subscriptions, or any regular income or expense."
            action={
              <Button size="sm" onClick={() => setModal({ recurring: null })}>
                <Plus size={14} aria-hidden="true" />
                Create schedule
              </Button>
            }
            className="py-14"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((item) => {
            const due = dueLabel(item.nextOccurrence);
            const isDue = item.active && due.tone === 'warning';
            return (
              <Card
                key={item.id}
                className={`p-5 transition-opacity ${item.active ? '' : 'opacity-70'}`}
              >
                <div className="flex items-start gap-3">
                  <CategoryIcon icon={item.category?.icon} color={item.category?.color} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{item.description}</p>
                        <p className="mt-0.5 text-[11px] text-ink-subtle">
                          {item.category?.name || 'Uncategorised'}
                          {item.merchant ? ` · ${item.merchant}` : ''}
                        </p>
                      </div>
                      <p
                        className={`financial-number text-sm font-bold ${
                          item.type === 'income' ? 'text-income' : 'text-ink'
                        }`}
                      >
                        {item.type === 'income' ? '+' : '−'}
                        {formatCurrency(item.amountPaise, currency)}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="neutral">
                        <Repeat2 size={11} aria-hidden="true" />
                        {FREQUENCIES.find((frequency) => frequency.value === item.frequency)?.label}
                      </Badge>
                      <Badge variant={item.active ? 'brand' : 'neutral'} dot>
                        {item.active ? 'Active' : 'Paused'}
                      </Badge>
                      {item.active && (
                        <Badge variant={isDue ? 'warning' : 'neutral'}>
                          {due.text} · {formatDisplayDate(item.nextOccurrence, user?.dateFormat)}
                        </Badge>
                      )}
                    </div>

                    {item.endDate && (
                      <p className="mt-2 text-[10px] text-ink-subtle">
                        Ends {formatDisplayDate(item.endDate, user?.dateFormat)}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                      <div>
                        <Toggle
                          checked={item.active}
                          onChange={() => toggleActive(item)}
                          label={item.active ? 'Active' : 'Paused'}
                          disabled={togglingId === item.id}
                        />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setModal({ recurring: item })}
                        >
                          <Pencil size={13} aria-hidden="true" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-expense hover:bg-rose-50 hover:text-expense dark:hover:bg-rose-500/10"
                          onClick={() => setDeleting(item)}
                        >
                          <Trash2 size={13} aria-hidden="true" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-center text-[10px] text-ink-subtle">
        Background processing runs server-side every 15 minutes. Each occurrence is protected by a
        unique database constraint to prevent duplicates.
      </p>

      <RecurringFormModal
        open={Boolean(modal)}
        recurring={modal?.recurring}
        categories={categories}
        onClose={() => setModal(null)}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete recurring schedule?"
        message={
          deleting
            ? `“${deleting.description}” will stop generating future entries. Transactions already created are kept.`
            : ''
        }
        confirmLabel="Delete schedule"
      />
    </div>
  );
}
