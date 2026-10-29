import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Logo } from '../components/ui/Logo.jsx';
import { Spinner } from '../components/ui/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function FullPageLoader() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-canvas">
      <Logo />
      <div className="flex items-center gap-2 text-xs text-ink-subtle">
        <Spinner size={16} />
        Loading your workspace…
      </div>
    </div>
  );
}

export function ProtectedRoute() {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, initializing } = useAuth();
  if (initializing) return <FullPageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function RootRedirect() {
  const { user, initializing } = useAuth();
  if (initializing) return <FullPageLoader />;
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}
