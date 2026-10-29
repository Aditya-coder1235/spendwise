import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { EmptyState, ErrorState } from './States.jsx';
import { Modal } from './Modal.jsx';
import { ConfirmDialog } from './ConfirmDialog.jsx';
import { PeriodFilter } from '../dashboard/PeriodFilter.jsx';
import { ProgressBar } from './ProgressBar.jsx';

describe('empty, error, and destructive confirmation states', () => {
  test('renders an empty state with a useful action', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={Inbox}
        title="No transactions yet"
        description="Add your first expense."
        action={<button type="button" onClick={onClick}>Add transaction</button>}
      />,
    );
    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add transaction' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  test('announces errors and retries on demand', () => {
    const onRetry = vi.fn();
    render(<ErrorState title="Could not load" message="Check connection" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load');
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  test('requires explicit confirmation before destructive actions', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Delete transaction?"
        message="This cannot be undone."
        confirmLabel="Delete transaction"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    expect(screen.getByRole('dialog')).toHaveTextContent('This cannot be undone.');
    fireEvent.click(screen.getByRole('button', { name: 'Delete transaction' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('modal accessibility', () => {
  test('labels the dialog and closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Edit budget" description="Set the monthly limit.">
        <p>Modal content</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Edit budget' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('period selection', () => {
  const range = { startDate: '2026-10-01', endDate: '2026-10-28' };

  test('selects presets and exposes the active option', () => {
    const onChange = vi.fn();
    render(
      <PeriodFilter period="month" onPeriodChange={onChange} range={range} onRangeChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'This month' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'This week' }));
    expect(onChange).toHaveBeenCalledWith('week');
  });

  test('applies valid custom dates and ignores reversed ranges', () => {
    const onChange = vi.fn();
    const onRangeChange = vi.fn();
    const { rerender } = render(
      <PeriodFilter
        period="custom"
        onPeriodChange={onChange}
        range={range}
        onRangeChange={onRangeChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2026-10-05' },
    });
    expect(onRangeChange).toHaveBeenCalledWith({
      startDate: '2026-10-05',
      endDate: '2026-10-28',
    });

    onRangeChange.mockClear();
    rerender(
      <PeriodFilter
        period="custom"
        onPeriodChange={onChange}
        range={range}
        onRangeChange={onRangeChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2026-11-05' },
    });
    expect(onRangeChange).not.toHaveBeenCalled();
  });
});

test('progress bars expose accessible percentages and clamp values', () => {
  render(<ProgressBar percentage={125} status="exceeded" />);
  const progress = screen.getByRole('progressbar');
  expect(progress).toHaveAttribute('aria-valuenow', '100');
  expect(progress.firstElementChild).toHaveStyle({ width: '100%' });
});
