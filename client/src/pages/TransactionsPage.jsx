import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  Filter,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Field, Input, Select } from '../components/ui/FormControls.jsx';
import { EmptyState, ErrorState } from '../components/ui/States.jsx';
import { TableSkeleton } from '../components/ui/Skeleton.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { TransactionsTable } from '../features/transactions/TransactionsTable.jsx';
import { TransactionFormModal } from '../features/transactions/TransactionFormModal.jsx';
import { TransactionDetailsModal } from '../features/transactions/TransactionDetailsModal.jsx';
import { useQuickAdd } from '../features/transactions/QuickAddContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDebounce } from '../hooks/useDebounce.js';
import {
  categoriesApi,
  getErrorMessage,
  reportsApi,
  transactionsApi,
} from '../services/api.js';
import { PAYMENT_METHODS } from '../utils/constants.js';

const EMPTY_FILTERS = {
  type: '',
  categoryId: '',
  paymentMethod: '',
  startDate: '',
  endDate: '',
  sort: 'date_desc',
};

export default function TransactionsPage() {
  const { openQuickAdd, version } = useQuickAdd();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const categories = useApi(() => categoriesApi.list(), []);
  const hasBothDates = Boolean(filters.startDate && filters.endDate);
  const dateRangeReady = hasBothDates || (!filters.startDate && !filters.endDate);

  const {
    data,
    loading,
    error,
    refetch,
  } = useApi(
    () =>
      transactionsApi.list({
        page,
        limit: 15,
        search: debouncedSearch,
        type: filters.type,
        categoryId: filters.categoryId,
        paymentMethod: filters.paymentMethod,
        startDate: hasBothDates ? filters.startDate : undefined,
        endDate: hasBothDates ? filters.endDate : undefined,
        sort: filters.sort,
      }),
    [
      page,
      debouncedSearch,
      filters.type,
      filters.categoryId,
      filters.paymentMethod,
      filters.startDate,
      filters.endDate,
      filters.sort,
      version,
    ],
  );

  const items = data?.items || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0, limit: 15 };
  const activeFilterCount = [
    filters.type,
    filters.categoryId,
    filters.paymentMethod,
    hasBothDates ? 'dates' : '',
  ].filter(Boolean).length;

  const updateFilter = (field, value) => {
    setFilters((previous) => ({ ...previous, [field]: value }));
    setPage(1);
    if (field === 'type' && filters.categoryId && categories.data?.categories) {
      const selected = categories.data.categories.find(
        (category) => category.id === filters.categoryId,
      );
      if (selected && selected.type !== value) {
        setFilters((previous) => ({ ...previous, categoryId: '' }));
      }
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await transactionsApi.remove(deleting.id);
      toast.success('Transaction deleted.');
      setDeleting(null);
      if (items.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        refetch();
      }
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, 'Could not delete this transaction.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await reportsApi.exportCsv({
        search: debouncedSearch,
        type: filters.type,
        categoryId: filters.categoryId,
        paymentMethod: filters.paymentMethod,
        startDate: hasBothDates ? filters.startDate : undefined,
        endDate: hasBothDates ? filters.endDate : undefined,
        sort: filters.sort,
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `spendwise-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Filtered transactions exported.');
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, 'Could not export transactions.'));
    } finally {
      setExporting(false);
    }
  };

  const anyFilter = Boolean(search || activeFilterCount);
  const queryError = error;

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Activity"
        title="Transactions"
        description="Every rupee in and out. Search, filter, and keep your records accurate."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={handleExport}
              loading={exporting}
              disabled={!pagination.total}
            >
              <ArrowDownToLine size={15} aria-hidden="true" />
              Export CSV
            </Button>
            <Button onClick={() => openQuickAdd('expense')}>
              <Plus size={16} aria-hidden="true" />
              Add transaction
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
                aria-hidden="true"
              />
              <label htmlFor="tx-search" className="sr-only">
                Search transactions
              </label>
              <Input
                id="tx-search"
                type="search"
                placeholder="Search description or merchant…"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <div className="w-full sm:w-36">
                <label htmlFor="tx-type-filter" className="sr-only">
                  Filter by type
                </label>
                <Select
                  id="tx-type-filter"
                  value={filters.type}
                  onChange={(event) => updateFilter('type', event.target.value)}
                  className="h-10"
                >
                  <option value="">All types</option>
                  <option value="expense">Expenses</option>
                  <option value="income">Income</option>
                </Select>
              </div>
              <div className="w-full sm:w-40">
                <label htmlFor="tx-sort" className="sr-only">
                  Sort transactions
                </label>
                <Select
                  id="tx-sort"
                  value={filters.sort}
                  onChange={(event) => updateFilter('sort', event.target.value)}
                  className="h-10"
                >
                  <option value="date_desc">Newest first</option>
                  <option value="date_asc">Oldest first</option>
                  <option value="amount_desc">Highest amount</option>
                  <option value="amount_asc">Lowest amount</option>
                </Select>
              </div>
              <Button
                variant="secondary"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                className="col-span-2 sm:col-span-1"
              >
                <SlidersHorizontal size={15} aria-hidden="true" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="grid size-4 place-items-center rounded-full bg-brand-600 text-[9px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {filtersOpen && (
            <div className="animate-fade-in grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface-soft p-3.5 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Category" htmlFor="filter-category">
                <Select
                  id="filter-category"
                  value={filters.categoryId}
                  onChange={(event) => updateFilter('categoryId', event.target.value)}
                >
                  <option value="">All categories</option>
                  {(categories.data?.categories || []).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.type === 'income' ? 'Income' : 'Expense'} · {category.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Payment method" htmlFor="filter-payment">
                <Select
                  id="filter-payment"
                  value={filters.paymentMethod}
                  onChange={(event) => updateFilter('paymentMethod', event.target.value)}
                >
                  <option value="">All methods</option>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="From date"
                htmlFor="filter-start"
                hint={!dateRangeReady ? 'Set both dates to apply' : undefined}
              >
                <Input
                  id="filter-start"
                  type="date"
                  value={filters.startDate}
                  max={filters.endDate || undefined}
                  onChange={(event) => updateFilter('startDate', event.target.value)}
                />
              </Field>
              <Field label="To date" htmlFor="filter-end">
                <Input
                  id="filter-end"
                  type="date"
                  value={filters.endDate}
                  min={filters.startDate || undefined}
                  onChange={(event) => updateFilter('endDate', event.target.value)}
                />
              </Field>
              <div className="flex items-center justify-between gap-3 sm:col-span-2 xl:col-span-4">
                <p className="flex items-center gap-1.5 text-[11px] text-ink-subtle">
                  <Filter size={12} aria-hidden="true" />
                  Filters apply instantly to your records.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  disabled={!anyFilter}
                >
                  <RotateCcw size={13} aria-hidden="true" />
                  Clear all
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-subtle">
            <span>
              {pagination.total} {pagination.total === 1 ? 'transaction' : 'transactions'}
              {debouncedSearch ? ` matching “${debouncedSearch}”` : ''}
            </span>
            {anyFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="font-semibold text-brand-700 hover:underline dark:text-brand-400"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {queryError && !data ? (
          <ErrorState
            title="Transactions could not load"
            message={getErrorMessage(queryError)}
            onRetry={refetch}
          />
        ) : loading && !data ? (
          <div className="border-t border-line p-4 sm:p-5">
            <TableSkeleton rows={7} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={anyFilter ? Search : ArrowLeftRight}
            title={anyFilter ? 'No matching transactions' : 'No transactions yet'}
            description={
              anyFilter
                ? 'Try a broader search or clear some filters.'
                : 'Record your first expense or income to start seeing insights.'
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {anyFilter && (
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    <RotateCcw size={14} aria-hidden="true" />
                    Clear filters
                  </Button>
                )}
                <Button size="sm" onClick={() => openQuickAdd('expense')}>
                  <Plus size={14} aria-hidden="true" />
                  Add transaction
                </Button>
              </div>
            }
            className="border-t border-line"
          />
        ) : (
          <>
            <div className="border-t border-line">
              <TransactionsTable
                items={items}
                onView={setViewing}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            </div>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={pagination.limit}
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <div className="flex items-center gap-2 text-[10px] text-ink-subtle">
        <Badge variant="neutral">Tip</Badge>
        Tap a transaction to see notes, tags, payment details, and edit options.
      </div>

      <TransactionFormModal
        open={Boolean(editing)}
        transaction={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refetch();
        }}
      />

      <TransactionDetailsModal
        open={Boolean(viewing)}
        transaction={viewing}
        onClose={() => setViewing(null)}
        onEdit={setEditing}
        onDelete={setDeleting}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete transaction?"
        message={
          deleting
            ? `“${deleting.description}” will be permanently removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete transaction"
      />
    </div>
  );
}
