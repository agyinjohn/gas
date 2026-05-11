'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Flame, LayoutDashboard, Package, DollarSign,
  BarChart2, Settings, LogOut, Menu, X,
  Wifi, WifiOff, ChevronRight, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/components/shared/ThemeProvider';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { stationsApi } from '@/lib/api';

const NAV = [
  { href: '/station',           icon: LayoutDashboard, label: 'Dashboard', exact: true, description: 'View your station performance' },
  { href: '/station/orders',    icon: Package,         label: 'Orders', description: 'Manage incoming and active orders' },
  { href: '/station/pricing',   icon: DollarSign,      label: 'Pricing', description: 'Update cylinder prices' },
  { href: '/station/analytics', icon: BarChart2,       label: 'Analytics', description: 'View detailed reports' },
  { href: '/station/settings',  icon: Settings,        label: 'Settings', description: 'Configure your station' },
];

export default function StationLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Don't render layout on login page
  if (pathname === '/station/login' || pathname === '/station/register') {
    return <>{children}</>;
  }

  const stationId = user?.stationId || (() => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gasgo_token') : null;
      if (!token) return '';
      return JSON.parse(atob(token.split('.')[1])).stationId || '';
    } catch { return ''; }
  })();

  const { data: stationData } = useQuery({
    queryKey: ['station', 'me', stationId],
    queryFn: () => stationsApi.getById(stationId).then((r) => r.data.station),
    enabled: !!stationId,
    staleTime: 30000,
  });

  const station = stationData;
  const isOnline = station?.status === 'active';

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const currentPage = NAV.find((n) =>
    n.exact ? pathname === n.href : pathname.startsWith(n.href)
  );

  const pageTitle = currentPage?.label || 'Station';
  const pageDescription = currentPage?.description || '';

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 bg-[var(--bg-card)] border-r border-[var(--border)] flex flex-col transition-transform duration-300',
        'lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[var(--border)]">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm tracking-tight truncate">
              {station?.name || 'Station'}
            </p>
            <p className="text-gray-500 text-[10px] font-medium uppercase tracking-widest">
              {station?.city || 'GasGo'}
            </p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-lg hover:bg-[var(--bg-card2)]">
            <X className="w-4 h-4 text-[var(--text-primary)]" />
          </button>
        </div>

        {/* Online/Offline status */}
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <div className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl',
            isOnline ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
          )}>
            <div className={cn(
              'w-2 h-2 rounded-full shrink-0',
              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
            )} />
            <div className="flex-1 min-w-0">
              <p className={cn('text-xs font-bold', isOnline ? 'text-emerald-400' : 'text-red-400')}>
                {isOnline ? 'Station Online' : 'Station Offline'}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {isOnline ? 'Accepting orders' : 'Not accepting orders'}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href}>
                <div className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-card2)] hover:text-[var(--text-primary)]'
                )}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User + logout + theme */}
        <div className="px-3 py-4 border-t border-[var(--border)] space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
            <div className="w-8 h-8 bg-brand-500/20 rounded-full flex items-center justify-center shrink-0">
              <span className="text-brand-400 font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase() ?? 'S'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-primary)] text-xs font-semibold truncate">{user?.name ?? 'Station Owner'}</p>
              <p className="text-[var(--text-muted)] text-[10px] truncate">{user?.phone}</p>
            </div>
          </div>
          <button
            onClick={toggle}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-card2)] hover:text-[var(--text-primary)] transition-all w-full"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            onClick={() => { logout(); router.push('/staff/login'); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400 transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">

        {/* ── Topbar ── */}
        <header className="sticky top-0 z-20 bg-[var(--bg-card)] border-b border-[var(--border)] px-4 lg:px-6 py-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-[var(--bg-card2)] transition-colors shrink-0"
            >
              <Menu className="w-5 h-5 text-[var(--text-primary)]" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-[var(--text-primary)]">{pageTitle}</h1>
              {pageDescription && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{pageDescription}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Online/Offline badge */}
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border',
              isOnline
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
            )}>
              {isOnline
                ? <Wifi className="w-3.5 h-3.5" />
                : <WifiOff className="w-3.5 h-3.5" />
              }
              <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* Station name */}
            <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-[var(--border)]">
              <div className="w-7 h-7 bg-brand-50 dark:bg-brand-500/10 rounded-lg flex items-center justify-center shrink-0">
                <Flame className="w-3.5 h-3.5 text-brand-500" />
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[160px]">
                {station?.name || 'Loading...'}
              </span>
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
