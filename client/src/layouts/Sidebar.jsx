import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowLeftRight,
  BarChart3,
  ChevronRight,
  FileText,
  LayoutDashboard,
  PiggyBank,
  Repeat2,
  Settings,
  Wallet,
  X,
} from 'lucide-react';
import { Logo } from '../components/ui/Logo.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Planning',
    items: [
      { to: '/budgets', label: 'Budgets', icon: Wallet },
      { to: '/recurring', label: 'Recurring', icon: Repeat2 },
      { to: '/reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/settings', label: 'Settings', icon: Settings }],
  },
];

function Navigation({ onNavigate }) {
  return (
    <nav aria-label="Main navigation" className="flex-1 px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-5">
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors',
                      isActive
                        ? 'bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-300'
                        : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={17}
                        strokeWidth={isActive ? 2.2 : 1.9}
                        className={clsx(isActive ? 'text-brand-600 dark:text-brand-400' : 'text-ink-subtle')}
                        aria-hidden="true"
                      />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <span className="size-1.5 rounded-full bg-brand-500" aria-hidden="true" />}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarContent({ onNavigate }) {
  const { user } = useAuth();
  return (
    <>
      <div className="flex h-[68px] shrink-0 items-center px-5">
        <Logo />
      </div>
      <div className="mx-5 h-px bg-line" />
      <div className="thin-scrollbar flex flex-1 flex-col overflow-y-auto">
        <Navigation onNavigate={onNavigate} />
      </div>
      <div className="p-3">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl border border-line bg-surface-soft p-3 transition-colors hover:bg-surface-muted"
        >
          <Avatar name={user?.name} id={user?.id} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink">{user?.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-ink-subtle">{user?.preferredCurrency} account</p>
          </div>
          <ChevronRight size={15} className="text-ink-subtle" aria-hidden="true" />
        </NavLink>
        <div className="mt-3 flex items-center gap-1.5 px-2 text-[10px] text-ink-subtle">
          <PiggyBank size={12} aria-hidden="true" />
          SpendWise · Personal finance made clear
        </div>
      </div>
    </>
  );
}

export function Sidebar({ open, onClose }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-line bg-surface lg:flex">
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="animate-fade-in absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <aside
            className="animate-slide-in absolute inset-y-0 left-0 flex w-[min(86vw,300px)] flex-col border-r border-line bg-surface shadow-2xl"
            aria-label="Mobile navigation"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation menu"
              className="absolute right-3 top-4 z-10 grid size-8 place-items-center rounded-lg text-ink-subtle hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <X size={17} aria-hidden="true" />
            </button>
            <SidebarContent onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
