import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, LogOut, Menu, Moon, Plus, Settings, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Logo } from '../components/ui/Logo.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useQuickAdd } from '../features/transactions/QuickAddContext.jsx';

export function Header({ onOpenMenu }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { openQuickAdd } = useQuickAdd();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!profileOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setProfileOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [profileOpen]);

  const handleLogout = async () => {
    setSigningOut(true);
    await logout();
    toast.success('Signed out safely.');
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6 lg:h-[68px] lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open navigation menu"
            className="grid size-9 place-items-center rounded-xl border border-line bg-surface text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:hidden"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <div className="lg:hidden">
            <Logo compact />
          </div>
          <div className="hidden items-center gap-2 text-xs text-ink-subtle lg:flex">
            <CalendarDays size={14} aria-hidden="true" />
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="hidden size-9 place-items-center rounded-xl text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:grid"
          >
            {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>

          <Button size="sm" onClick={() => openQuickAdd('expense')} className="px-2.5 sm:px-3.5">
            <Plus size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Add transaction</span>
            <span className="sr-only sm:hidden">Add transaction</span>
          </Button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              aria-label="Open profile menu"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              className="rounded-full transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <Avatar name={user?.name} id={user?.id} />
            </button>

            {profileOpen && (
              <div
                role="menu"
                className="animate-fade-in absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-xl"
              >
                <div className="border-b border-line px-2.5 py-2.5">
                  <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-subtle">{user?.email}</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/settings');
                  }}
                  className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                >
                  <Settings size={15} aria-hidden="true" />
                  Settings
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/settings#security');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                >
                  <span className="grid size-[15px] place-items-center text-[11px]">•••</span>
                  Password & security
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={signingOut}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-expense transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                >
                  <LogOut size={15} aria-hidden="true" />
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
