'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import RiderNav from '@/components/RiderNav';
import { Package, MapPin, Clock, ChevronRight, Bike } from 'lucide-react';
import { ridersApi } from '@/lib/api';
import { Order } from '@/types';
import { EmptyState, Skeleton } from '@/components/ui';
import { formatCurrency, formatRelativeTime, formatCylinders } from '@/lib/utils';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const FILTERS = [
  { key: '',                          label: 'All' },
  { key: 'accepted,at_station,en_route', label: 'Active' },
  { key: 'delivered',                 label: 'Completed' },
  { key: 'cancelled',                 label: 'Cancelled' },
];

const STATUS_COLORS: Record<string, string> = {
  accepted:   'bg-blue-100 text-blue-700',
  at_station: 'bg-yellow-100 text-yellow-700',
  en_route:   'bg-brand-100 text-brand-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  accepted:   'Accepted',
  at_station: 'At Station',
  en_route:   'En Route',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
};

export default function RiderOrdersPage() {
  const [filter, setFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['rider', 'orders', filter],
    queryFn: () => ridersApi.getOrders({ status: filter || undefined, limit: 30 }).then((r) => r.data),
  });

  const orders: Order[] = data?.orders || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 mb-3">My Deliveries</h1>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border',
                filter === key
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-gray-500 border-gray-200'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading && [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}

        {!isLoading && orders.length === 0 && (
          <EmptyState
            icon={<Package className="w-16 h-16" />}
            title="No deliveries found"
            description={filter ? 'Try a different filter.' : 'Go online to start receiving orders.'}
          />
        )}

        {orders.map((order) => (
          <Link key={order._id} href={`/rider/orders/${order._id}`}>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm active:scale-[0.99] transition-transform">
              {/* Top row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                    <Bike className="w-4 h-4 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">
                      #{order._id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-sm font-bold text-gray-900 capitalize">
                      {order.orderType} · {formatCylinders(order.cylinders)}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  'text-[10px] font-bold px-2 py-1 rounded-full',
                  STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'
                )}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>

              {/* Address */}
              <div className="flex items-center gap-1.5 mb-3">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <p className="text-xs text-gray-500 truncate">
                  {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
                </p>
              </div>

              {/* Bottom row */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(order.createdAt)}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-green-600">
                    +{formatCurrency(order.deliveryFee ?? 0)}
                  </p>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <RiderNav />
    </div>
  );
}
