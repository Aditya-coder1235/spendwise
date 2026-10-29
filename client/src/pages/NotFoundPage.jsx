import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui/States.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';

export default function NotFoundPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Page not found" description="That page does not exist in SpendWise." />
      <div className="rounded-2xl border border-line bg-surface">
        <EmptyState
          icon={Compass}
          title="404 · Wrong turn"
          description="The page you were looking for may have moved, or the address may be incorrect."
          action={
            <Link
              to="/dashboard"
              className="inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Back to dashboard
            </Link>
          }
          className="py-20"
        />
      </div>
    </div>
  );
}
