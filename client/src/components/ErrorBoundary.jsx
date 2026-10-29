import { Component } from 'react';
import { AlertOctagon } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SpendWise UI error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-canvas p-6">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-50 text-expense dark:bg-rose-500/10">
              <AlertOctagon size={22} aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-lg font-semibold text-ink">Something went wrong</h1>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              The interface hit an unexpected error. Your data is safe. Reload to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Reload SpendWise
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
