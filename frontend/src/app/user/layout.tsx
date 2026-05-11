'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, ClipboardList, MapPin, User, LogOut, Sun, Moon, Flame } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/components/shared/ThemeProvider';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/user',         icon: Home,          label: 'Home'    },
  { href: '/user/orders',  icon: ClipboardList, label: 'Orders'  },
  { href: '/user/track',   icon: MapPin,        label: 'Track'   },
  { href: '/user/profile', icon: User,          label: 'Profile' },
] as const;

// Pages where bottom nav should be hidden
const HIDE_NAV_PATTERNS = [
  /^\/user\/stations\/[^/]+/,
  /^\/user\/orders\/[^/]+/,
  /^\/user\/checkout/,
  /^\/user\/payment/,
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  const hideNav = HIDE_NAV_PATTERNS.some((p) => p.test(pathname));

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex flex-col w-64 bg-[var(--bg-card)] border-r border-[var(--border)] fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-md shadow-brand-500/30">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-[var(--text-primary)] text-lg tracking-tight">GasGo</span>
          </div>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500/20 rounded-full flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-brand-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user?.name ?? 'User'}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{user?.phone}</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = href === '/user' ? pathname === '/user' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-brand-500/10 text-brand-500'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-card2)] hover:text-[var(--text-primary)]'
                )}
              >
                <Icon className={cn('w-5 h-5', active ? 'text-brand-500' : 'text-[var(--text-muted)]')} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Theme toggle + Logout */}
        <div className="px-3 py-4 border-t border-[var(--border)] space-y-1">
          <button
            onClick={toggle}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-card2)] hover:text-[var(--text-primary)] transition-all w-full"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-500 transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen overflow-y-auto">
        <div className="flex-1">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      {!hideNav && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-[var(--bg-card)] border-t border-[var(--border)] flex z-30">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = href === '/user' ? pathname === '/user' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex-1 py-3 flex flex-col items-center gap-1 transition-colors',
                  active ? 'text-brand-500' : 'text-[var(--text-muted)]'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
