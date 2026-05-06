'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Flame, ClipboardList, User, MapPin, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/user',         icon: Flame,         label: 'Home'    },
  { href: '/user/orders',  icon: ClipboardList, label: 'Orders'  },
  { href: '/user/profile', icon: User,          label: 'Profile' },
] as const;

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-md shadow-brand-500/30">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-gray-900 text-lg tracking-tight">GasGo</span>
          </div>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-brand-600 font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase() ?? 'U'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name ?? 'User'}</p>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                <p className="text-xs text-gray-400 truncate">{user?.phone}</p>
              </div>
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
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className={cn('w-5 h-5', active ? 'text-brand-500' : 'text-gray-400')} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Desktop top bar */}
        <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100 sticky top-0 z-20">
          <div>
            <h1 className="text-base font-bold text-gray-900">
              {pathname === '/user' && 'Find Gas Stations'}
              {pathname.startsWith('/user/orders') && 'My Orders'}
              {pathname.startsWith('/user/profile') && 'My Profile'}
              {pathname.startsWith('/user/stations') && 'Station Details'}
              {pathname.startsWith('/user/checkout') && 'Checkout'}
            </h1>
            <p className="text-xs text-gray-400">On-demand LPG delivery · Ghana</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4 text-brand-500" />
            <span>Detecting location…</span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 pb-20 lg:pb-0 lg:h-0 lg:overflow-y-auto">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className={cn(
        'lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 flex z-30',
        (pathname.startsWith('/user/stations/') || /^\/user\/orders\/[^/]+/.test(pathname)) && 'hidden'
      )}>
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = href === '/user' ? pathname === '/user' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 py-3 flex flex-col items-center gap-1 transition-colors',
                active ? 'text-brand-500' : 'text-gray-400'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
