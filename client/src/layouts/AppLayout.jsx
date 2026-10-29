import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Header } from './Header.jsx';
import { MobileNav } from './MobileNav.jsx';
import { QuickAddProvider } from '../features/transactions/QuickAddContext.jsx';

const TITLES = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/analytics': 'Analytics',
  '/budgets': 'Budgets',
  '/recurring': 'Recurring',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    document.title = `${TITLES[location.pathname] || 'SpendWise'} · SpendWise`;
  }, [location.pathname]);

  return (
    <QuickAddProvider>
      <div className="min-h-dvh bg-canvas">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="lg:pl-[264px]">
          <Header onOpenMenu={() => setMenuOpen(true)} />
          <main className="mx-auto w-full max-w-[1500px] px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-7">
            <Outlet />
          </main>
        </div>
        <MobileNav onOpenMenu={() => setMenuOpen(true)} />
      </div>
    </QuickAddProvider>
  );
}
