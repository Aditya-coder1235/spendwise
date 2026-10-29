import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { PageSkeleton } from './components/ui/Skeleton.jsx';
import { AppLayout } from './layouts/AppLayout.jsx';
import {
  ProtectedRoute,
  PublicOnlyRoute,
  RootRedirect,
} from './routes/guards.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage.jsx'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx'));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage.jsx'));
const RecurringPage = lazy(() => import('./pages/RecurringPage.jsx'));
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));

function LazyPage({ children }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <Toaster
            position="top-right"
            gutter={10}
            toastOptions={{
              duration: 3800,
              style: {
                background: 'var(--surface)',
                color: 'var(--ink)',
                border: '1px solid var(--line)',
                borderRadius: '12px',
                fontSize: '13px',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
              },
              success: { iconTheme: { primary: '#059669', secondary: '#ffffff' } },
              error: { iconTheme: { primary: '#e11d48', secondary: '#ffffff' } },
            }}
          />
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<LazyPage><DashboardPage /></LazyPage>} />
                <Route path="/transactions" element={<LazyPage><TransactionsPage /></LazyPage>} />
                <Route path="/analytics" element={<LazyPage><AnalyticsPage /></LazyPage>} />
                <Route path="/budgets" element={<LazyPage><BudgetsPage /></LazyPage>} />
                <Route path="/recurring" element={<LazyPage><RecurringPage /></LazyPage>} />
                <Route path="/reports" element={<LazyPage><ReportsPage /></LazyPage>} />
                <Route path="/settings" element={<LazyPage><SettingsPage /></LazyPage>} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
