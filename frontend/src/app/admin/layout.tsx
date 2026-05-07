'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Store, Users, TrendingUp, LogOut,
  Bell, Menu, X, ChevronRight, Flame, Settings,
  DollarSign, Package,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

const NAV = [
  { href: '/admin',          icon: LayoutDashboard, label: 'Overview',  exact: true  },
  { href: '/admin/stations', icon: Store,            label: 'Stations'               },
  { href: '/admin/riders',   icon: Users,            label: 'Riders'                 },
  { href: '/admin/orders',   icon: Package,          label: 'Orders'                 },
  { href: '/admin/pricing',  icon: DollarSign,       label: 'Pricing'                },
  { href: '/admin/settings', icon: Settings,         label: 'Settings'               },
];

// ─── Notification Panel ───────────────────────────────────────────────────────

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => adminApi.getMetrics().then((r) => r.data.metrics),
    staleTime: 30000,
  });

  const notifications = [
    data?.stations?.pending > 0 && {
      id: 'stations-pending',
      type: 'warning',
      title: `${data.stations.pending} station${data.stations.pending > 1 ? 's' : ''} awaiting approval`,
      sub: 'Review and activate new stations',
      href: '/admin/stations',
      time: 'Now',
    },
    data?.riders?.pendingKYC > 0 && {
      id: 'riders-kyc',
      type: 'warning',
      title: `${data.riders.pendingKYC} rider${data.riders.pendingKYC > 1 ? 's' : ''} awaiting KYC`,
      sub: 'Review rider documents',
      href: '/admin/riders',
      time: 'Now',
    },
    {
      id: 'system',
      type: 'info',
      title: 'System is running normally',
      sub: 'All services operational',
      href: null,
      time: 'Just now',
    },
  ].filter(Boolean) as any[];

  const TYPE_STYLES: Record<string, string> = {
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-100',
    success: 'bg-green-50 border-green-100',
  };
  const DOT: Record<string, string> = {
    warning: 'bg-amber-400',
    info: 'bg-blue-400',
    success: 'bg-green-400',
  };

  return (
    <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-bold text-gray-900">Notifications</p>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
        {notifications.map((n) => (
          <div key={n.id} className={cn('px-4 py-3 border-l-4', TYPE_STYLES[n.type])}>
            <div className="flex items-start gap-2.5">
              <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', DOT[n.type])} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900">{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.sub}</p>
                <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
              </div>
              {n.href && (
                <Link href={n.href} onClick={onClose}>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notif panel on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const { data: metrics } = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => adminApi.getMetrics().then((r) => r.data.metrics),
    staleTime: 30000,
  });

  const pendingCount = (metrics?.stations?.pending || 0) + (metrics?.riders?.pendingKYC || 0);

  // Don't render layout on login page
  if (pathname === '/admin/login') return <>{children}</>;

  const pageTitle = NAV.find((n) => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label || 'Admin';

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Sidebar overlay (mobile) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 bg-gray-950 flex flex-col transition-transform duration-300',
        'lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-base tracking-tight">GetGas</p>
            <p className="text-gray-500 text-[10px] font-medium uppercase tracking-widest">Admin</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden p-1 rounded-lg hover:bg-white/10">
            <X className="w-4 h-4 text-gray-400" />
          </button>
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
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                )}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {label === 'Stations' && metrics?.stations?.pending > 0 && (
                    <span className="w-5 h-5 bg-amber-400 text-gray-900 text-[10px] font-black rounded-full flex items-center justify-center">
                      {metrics.stations.pending}
                    </span>
                  )}
                  {label === 'Riders' && metrics?.riders?.pendingKYC > 0 && (
                    <span className="w-5 h-5 bg-amber-400 text-gray-900 text-[10px] font-black rounded-full flex items-center justify-center">
                      {metrics.riders.pendingKYC}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
            <div className="w-8 h-8 bg-brand-500/20 rounded-full flex items-center justify-center shrink-0">
              <span className="text-brand-400 font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.name ?? 'Admin'}</p>
              <p className="text-gray-500 text-[10px] truncate">{user?.phone}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.push('/admin/login'); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">

        {/* ── Topbar ── */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 lg:px-6 h-14 flex items-center gap-4 shadow-sm">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          {/* Page title */}
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900">{pageTitle}</h1>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {pendingCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </button>
              {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase() ?? 'A'}
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
