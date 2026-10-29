import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowLeftRight,
  BarChart3,
  LayoutDashboard,
  Menu,
  Wallet,
} from 'lucide-react';

const ITEMS = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/transactions', label: 'Activity', icon: ArrowLeftRight },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/budgets', label: 'Budgets', icon: Wallet },
];

export function MobileNav({ onOpenMenu }) {
  const location = useLocation();
  const moreActive = ['/recurring', '/reports', '/settings'].some((path) =>
    location.pathname.startsWith(path),
  );

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
                  isActive ? 'text-brand-700 dark:text-brand-400' : 'text-ink-subtle hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={19} strokeWidth={isActive ? 2.3 : 1.9} aria-hidden="true" />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={onOpenMenu}
          className={clsx(
            'flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
            moreActive ? 'text-brand-700 dark:text-brand-400' : 'text-ink-subtle hover:text-ink',
          )}
          aria-label="More navigation options"
        >
          <Menu size={19} strokeWidth={2} aria-hidden="true" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
