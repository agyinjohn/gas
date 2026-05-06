'use client';
import { useQuery } from '@tanstack/react-query';
import { Package, ChevronRight } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { Order } from '@/types';
import { StatusBadge, EmptyState } from '@/components/ui';
import { formatCurrency, formatRelativeTime, CYLINDER_LABELS, ORDER_TYPE_LABELS } from '@/lib/utils';
import Link from 'next/link';

export default function UserOrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'user'],
    queryFn: () => ordersApi.list().then((r) => r.data),
  });

  const orders: Order[] = data?.orders || [];

  return (
    <div className="bg-gray-50 pb-24">
      {/* Header — mobile only (desktop uses layout top bar) */}
      <div className="lg:hidden bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
      </div>

      <div className="px-4 py-4">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <EmptyState
            icon={<Package className="w-16 h-16" />}
            title="No orders yet"
            description="Order gas from your nearest station and it'll show up here."
            action={
              <Link href="/user" className="btn-primary inline-block">
                Order Gas Now
              </Link>
            }
          />
        )}

        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order._id} href={`/user/orders/${order._id}`}>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-gray-400 font-mono">
                      #{order._id.slice(-6).toUpperCase()}
                    </p>
                    <p className="font-semibold text-gray-900 mt-0.5">
                      {order.cylinderSize}kg · {ORDER_TYPE_LABELS[order.orderType]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={order.status} />
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {typeof order.stationId === 'object'
                      ? (order.stationId as any).name
                      : 'Station'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-brand-600">
                      {formatCurrency(order.totalAmount)}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {formatRelativeTime(order.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
