'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Package, DollarSign,
  BarChart2, Settings, LogOut, Menu, X,
  Sun, Moon, Flame, Bell,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/components/shared/ThemeProvider';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { stationsApi, notificationsApi } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';

const NAV = [
  { href: '/station',           icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/station/orders',    icon: Package,         label: 'Orders'                 },
  { href: '/station/pricing',   icon: DollarSign,      label: 'Pricing'                },
  // { href: '/station/analytics', icon: BarChart2,       label: 'Analytics'              },
  { href: '/station/settings',  icon: Settings,        label: 'Settings'               },
];

export default function StationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen]           = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const notifsRef  = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

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

  const { data: station } = useQuery({
    queryKey: ['station', 'me', stationId],
    queryFn: () => stationsApi.getById(stationId).then((r) => r.data.station),
    enabled: !!stationId,
    staleTime: 30000,
  });

  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'station'],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    refetchInterval: 60000,
  });
  const notifications = notifData?.notifications?.slice(0, 8) ?? [];
  const unread = notifData?.unreadCount ?? 0;

  const active = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const pageLabel = NAV.find((n) => active(n.href, n.exact))?.label ?? 'Station';

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-60 flex flex-col bg-[var(--bg-card)] border-r border-[var(--border)] transition-transform duration-300',
        'lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>

        {/* Brand */}
        <div className="flex items-center gap-3 h-16 px-5 border-b border-[var(--border)] shrink-0">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-[var(--text-primary)] truncate leading-tight">
              {station?.name || 'GetGas'}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] truncate">{station?.city || 'Station Portal'}</p>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden shrink-0">
            <X className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-3 mb-2">Menu</p>
          {NAV.map(({ href, icon: Icon, label, exact }) => {
            const isActive = active(href, exact);
            return (
              <Link key={href} href={href}>
                <div className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-brand-500 text-white'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-card2)] hover:text-[var(--text-primary)]'
                )}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-[var(--border)] space-y-0.5 shrink-0">
          {/* User */}
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
            <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-brand-500">
                {user?.name?.charAt(0).toUpperCase() ?? 'S'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{user?.name ?? 'Station Owner'}</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.phone}</p>
            </div>
          </div>

          <button onClick={toggle}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-card2)] hover:text-[var(--text-primary)] transition-all">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>

          <button onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-500 transition-all">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-60">

        {/* Topbar */}
        <header className="sticky top-0 z-20 h-16 bg-[var(--bg-card)] border-b border-[var(--border)] px-4 lg:px-6 flex items-center gap-4 shrink-0">
          <button onClick={() => setOpen(true)} className="lg:hidden">
            <Menu className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <h1 className="text-base font-bold text-[var(--text-primary)]">{pageLabel}</h1>

          <div className="ml-auto flex items-center gap-2">

            {/* Online badge */}
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
              station?.status === 'active'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', station?.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')} />
              {station?.status === 'active' ? 'Online' : 'Offline'}
            </div>

            {/* Notifications */}
            <div className="relative" ref={notifsRef}>
              <button
                onClick={() => { setShowNotifs((v) => !v); setShowProfile(false); if (!showNotifs) notificationsApi.readAll().then(() => queryClient.invalidateQueries({ queryKey: ['notifications', 'station'] })).catch(() => {}); }}
                className="relative w-9 h-9 rounded-xl bg-[var(--bg-card2)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--border)] transition-all"
              >
                <Bell className="w-4 h-4 text-[var(--text-muted)]" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 top-11 w-80 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                    <p className="text-sm font-bold text-[var(--text-primary)]">Notifications</p>
                    {unread > 0 && <span className="text-xs text-brand-500 font-semibold">{unread} new</span>}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center">
                        <Bell className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                        <p className="text-xs text-[var(--text-muted)]">No notifications</p>
                      </div>
                    ) : notifications.map((n: any) => (
                      <div key={n._id} className={cn(
                        'px-4 py-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card2)] transition-colors',
                        !n.isRead && 'bg-brand-500/5'
                      )}>
                        <div className="flex items-start gap-2">
                          {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug">{n.title}</p>
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{n.body}</p>
                            <p className="text-[10px] text-[var(--text-muted)] mt-1">{formatRelativeTime(n.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => { setShowProfile((v) => !v); setShowNotifs(false); }}
                className="w-9 h-9 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center hover:bg-brand-500/30 transition-all"
              >
                <span className="text-sm font-black text-brand-500">
                  {user?.name?.charAt(0).toUpperCase() ?? 'S'}
                </span>
              </button>

              {showProfile && (
                <div className="absolute right-0 top-11 w-56 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden z-50">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">{user?.name ?? 'Station Owner'}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{user?.phone}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{station?.name}</p>
                  </div>
                  {/* Actions */}
                  <div className="p-1.5 space-y-0.5">
                    <Link href="/station/settings" onClick={() => setShowProfile(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[var(--text-muted)] hover:bg-[var(--bg-card2)] hover:text-[var(--text-primary)] transition-all">
                      <Settings className="w-4 h-4" /> Settings
                    </Link>
                    <button onClick={toggle}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-[var(--text-muted)] hover:bg-[var(--bg-card2)] hover:text-[var(--text-primary)] transition-all">
                      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <button onClick={() => { setShowProfile(false); setShowLogoutConfirm(true); }}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-500/10 transition-all">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ── Logout confirmation ── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-[var(--bg-card)] rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center">
                <LogOut className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">Sign out?</h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">You will need to sign in again to manage your station.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 h-11 rounded-xl border border-[var(--border)] bg-[var(--bg-card2)] text-sm font-semibold text-[var(--text-primary)] transition-all">
                Cancel
              </button>
              <button onClick={() => { setShowLogoutConfirm(false); logout(); router.push('/'); }}
                className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all">
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
