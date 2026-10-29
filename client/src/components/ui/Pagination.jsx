import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button.jsx';

export function Pagination({ page, totalPages, onChange, totalItems, pageSize }) {
  if (!totalItems) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3.5 sm:flex-row sm:px-5">
      <p className="text-[11px] text-ink-subtle">
        Showing <span className="font-medium text-ink-muted">{start}</span>–
        <span className="font-medium text-ink-muted">{end}</span> of{' '}
        <span className="font-medium text-ink-muted">{totalItems}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} aria-hidden="true" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <span className="min-w-[78px] text-center text-[11px] font-medium text-ink-muted">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={15} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
