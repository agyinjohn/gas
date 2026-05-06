'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, TrendingUp, ChevronRight } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { Order, OrderStatus } from '@/types';
import { StatusBadge, EmptyState, Skeleton } from '@/components/ui';
import { formatCurrency, formatRelativeTime, ORDER_TYPE_LABELS } from '@/lib/utils';
import Link from 'next/link';

const FILTERS: Array<{ key: string; label: string }> = [
  { key: '', label: 'All' },
  { key: 'delivered', label: 'Completed' },
  { key: 'accepted,at_station,en_route', label: 'Active' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function RiderOrdersPage() {
  const [filter, setFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'rider', filter],
    queryFn: () => ordersApi.list({ status: filter || undefined, limit: 30 }).then((r) => r.data),
  });

  const orders: Order[] = data?.orders || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 mb-3">My Deliveries</h1>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === key ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <EmptyState
            icon={<Package className="w-16 h-16" />}
            title="No deliveries yet"
            description="Go online to start receiving orders."
          />
        )}

        <div className="space-y-2">
          {orders.map((order) => (
            <Link key={order._id} href={`/rider/orders/${order._id}`}>
              <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-sm font-black text-orange-600">{order.cylinderSize}kg</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">
                    {ORDER_TYPE_LABELS[order.orderType]}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {order.deliveryAddress.street}, {order.deliveryAddress.city}
                  </p>
                  <p className="text-xs text-gray-400">{formatRelativeTime(order.createdAt)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-green-600">
                    +{formatCurrency(order.stationPayout * 0.15)}
                  </p>
                  <StatusBadge status={order.status} />
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 flex">
        <Link href="/rider" className="flex-1 py-3 flex flex-col items-center gap-1 text-gray-400">
          <TrendingUp className="w-5 h-5" />
          <span className="text-xs">Dashboard</span>
        </Link>
        <Link href="/rider/orders" className="flex-1 py-3 flex flex-col items-center gap-1 text-brand-500">
          <Package className="w-5 h-5" />
          <span className="text-xs font-medium">Orders</span>
        </Link>
        <Link href="/rider/profile" className="flex-1 py-3 flex flex-col items-center gap-1 text-gray-400">
          <div className="w-5 h-5 border-2 border-current rounded-full" />
          <span className="text-xs">Profile</span>
        </Link>
      </div>
    </div>
  );
}
