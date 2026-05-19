'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { Search, Package, X } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { Order } from '@/types';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

const ACTIVE_STATUSES = ['pending', 'accepted', 'at_station', 'en_route'];

function OrderCard({ order, active, tab }: { order: Order; active: boolean; tab: 'active' | 'past' }) {
  const date = new Date(order.createdAt).toLocaleString('en-GH', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const PAST_STATUSES = ['delivered', 'cancelled'];
  const statusColor = order.status === 'cancelled' ? 'text-red-500 bg-red-500/10' : 'text-green-500 bg-green-500/10';
  const statusLabel = order.status === 'cancelled' ? 'Cancelled' : 'Completed';
  const showStatus = !active && PAST_STATUSES.includes(order.status);

  return (
    <Link href={`/user/orders/${order._id}?tab=${tab}`} className="block">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 active:scale-[0.99] transition-transform">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Order #{order._id.slice(-8).toUpperCase()}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{date}</p>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <p className="text-sm font-black text-brand-500">{formatCurrency(order.totalAmount)}</p>
            {showStatus && (
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap mt-1', statusColor)}>
                {statusLabel}
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-[var(--border)] mt-3 pt-3 space-y-2">
          {order.cylinders?.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-7 h-7 bg-brand-500/10 rounded-xl flex items-center justify-center shrink-0">
                <Image src="/LPG.png" alt="LPG" width={16} height={16} />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-primary)]">
                  {c.size}kg Cylinder Refill (x{c.quantity})
                </p>
                <p className="text-xs text-[var(--text-muted)]">Est. Delivery: 12:45 PM</p>
              </div>
            </div>
          ))}
          {(!order.cylinders || order.cylinders.length === 0) && (
            <p className="text-xs text-[var(--text-muted)]">Loading details…</p>
          )}
        </div>

        {active && (
          <div className="mt-4 w-full h-12 bg-brand-500 rounded-xl font-bold text-sm flex items-center justify-center text-white">
            View Order Details
          </div>
        )}
      </div>
    </Link>
  );
}

export default function UserOrdersPage() {
  const searchParams = useSearchParams();
  const currentTab = (searchParams.get('tab') as 'active' | 'past' | null) ?? 'active';
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch]     = useState('');
  const { isLoading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'user'],
    queryFn:  () => ordersApi.list().then((r) => r.data),
    enabled:  !authLoading,
  });

  const allOrders: Order[] = data?.orders ?? [];

  const filtered = search.trim()
    ? allOrders.filter((o) =>
        o._id.toLowerCase().includes(search.toLowerCase()) ||
        formatCurrency(o.totalAmount).includes(search) ||
        new Date(o.createdAt).toLocaleDateString().includes(search) ||
        o.cylinders?.some((c) => String(c.size).includes(search))
      )
    : allOrders;

  const active = filtered.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const past   = filtered.filter((o) => !ACTIVE_STATUSES.includes(o.status));
  const shown  = currentTab === 'active' ? active : past;

  return (
    <div className="min-h-full bg-[var(--bg)] pb-24">

      {/* Header */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)] px-4 pt-12 pb-0 lg:pt-4 sticky top-0 z-10">

        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          {searchOpen ? (
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by order number, date, price..."
                  className="w-full h-10 bg-[var(--bg-card2)] border border-[var(--border)] rounded-xl pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <button
                onClick={() => { setSearchOpen(false); setSearch(''); }}
                className="w-9 h-9 rounded-full bg-[var(--bg-card2)] flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">My Orders</h1>
              <button
                onClick={() => setSearchOpen(true)}
                className="w-9 h-9 rounded-full bg-[var(--bg-card2)] flex items-center justify-center"
              >
                <Search className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="flex">
          {(['active', 'past'] as const).map((t) => (
            <Link
              key={t}
              href={`/user/orders?tab=${t}`}
              className={cn(
                'flex-1 pb-3 text-sm font-semibold transition-colors border-b-2',
                currentTab === t
                  ? 'text-brand-500 border-brand-500'
                  : 'text-[var(--text-muted)] border-transparent'
              )}
            >
              {t === 'active' ? 'Active Orders' : 'Past Orders'}
            </Link>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 pb-24 lg:pb-5 flex flex-col gap-5 max-w-lg mx-auto lg:max-w-2xl">

        {/* Loading skeletons */}
        {isLoading && (
          <div className="flex flex-col gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[var(--bg-card)] rounded-2xl p-4 animate-pulse border border-[var(--border)]">
                <div className="flex justify-between mb-3">
                  <div className="h-4 bg-[var(--bg-card2)] rounded w-1/3" />
                  <div className="h-4 bg-[var(--bg-card2)] rounded w-1/5" />
                </div>
                <div className="h-3 bg-[var(--bg-card2)] rounded w-1/2 mb-3" />
                <div className="h-3 bg-[var(--bg-card2)] rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && shown.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Package className="w-7 h-7 text-brand-500" />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {search ? 'No orders match your search' : tab === 'active' ? 'No active orders' : 'No past orders'}
            </p>
            {!search && tab === 'active' && (
              <>
                <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">Order gas from your nearest station.</p>
                <Link href="/user" className="inline-block bg-brand-500 text-white text-sm font-bold px-5 py-3 rounded-xl">
                  Order Gas Now
                </Link>
              </>
            )}
          </div>
        )}

        {/* Order cards */}
        {!isLoading && shown.map((o) => (
          <OrderCard key={o._id} order={o} active={currentTab === 'active'} tab={currentTab} />
        ))}
      </div>
    </div>
  );
}
