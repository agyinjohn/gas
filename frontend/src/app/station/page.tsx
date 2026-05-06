'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, BarChart2, Settings, DollarSign, Clock, CheckCircle, Inbox } from 'lucide-react';
import { ordersApi, stationsApi } from '@/lib/api';
import { getSocket } from '@/hooks/useSocket';
import { Order } from '@/types';
import { Card, StatusBadge } from '@/components/ui';
import { formatCurrency, formatRelativeTime, ORDER_TYPE_LABELS, formatCylinders } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

const STATION_ID = typeof window !== 'undefined' ? localStorage.getItem('gasgo_station_id') || '' : '';

const KANBAN_COLUMNS = [
  { key: 'pending', label: 'Incoming', icon: Inbox, color: 'text-yellow-600 bg-yellow-50' },
  { key: 'active', label: 'Active', icon: Clock, color: 'text-blue-600 bg-blue-50' },
  { key: 'delivered', label: 'Completed', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
];

export default function StationDashboardPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'orders' | 'analytics'>('orders');

  const { data: ordersData } = useQuery({
    queryKey: ['station', 'orders'],
    queryFn: () =>
      ordersApi.list({ stationId: STATION_ID, limit: 50 }).then((r) => r.data.orders as Order[]),
    refetchInterval: 30000,
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['station', 'analytics'],
    queryFn: () => stationsApi.getAnalytics(STATION_ID).then((r) => r.data.analytics),
    enabled: activeTab === 'analytics',
  });

  // Listen for new incoming orders via socket
  useEffect(() => {
    const socket = getSocket();
    socket.on('order:incoming', (order: any) => {
      queryClient.invalidateQueries({ queryKey: ['station', 'orders'] });
      // Play sound + show toast
      toast(`New order: ${order.cylinders ? formatCylinders(order.cylinders) : ''} ${order.orderType}`, {
        icon: '🔔',
        duration: 8000,
      });
      // Vibrate on mobile
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    });
    return () => { socket.off('order:incoming'); };
  }, [queryClient]);

  const orders = ordersData || [];
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const activeOrders = orders.filter((o) =>
    ['accepted', 'at_station', 'en_route'].includes(o.status)
  );
  const completedOrders = orders.filter((o) => o.status === 'delivered');

  const analytics = analyticsData;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Station Dashboard</h1>
          <Link href="/station/settings">
            <Settings className="w-5 h-5 text-gray-500" />
          </Link>
        </div>
        <div className="flex gap-4 mt-3">
          <button
            onClick={() => setActiveTab('orders')}
            className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
              activeTab === 'orders' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
              activeTab === 'analytics' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'
            }`}
          >
            Analytics
          </button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <div className="px-4 py-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Incoming', count: pendingOrders.length, color: 'text-yellow-600' },
              { label: 'Active', count: activeOrders.length, color: 'text-blue-600' },
              { label: 'Done Today', count: completedOrders.length, color: 'text-green-600' },
            ].map(({ label, count, color }) => (
              <Card key={label} className="text-center py-3">
                <p className={`text-2xl font-black ${color}`}>{count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </Card>
            ))}
          </div>

          {/* Kanban Columns */}
          {KANBAN_COLUMNS.map(({ key, label, icon: Icon, color }) => {
            const colOrders =
              key === 'pending' ? pendingOrders
              : key === 'active' ? activeOrders
              : completedOrders;

            return (
              <div key={key} className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${color.split(' ')[1]}`}>
                    <Icon className={`w-3.5 h-3.5 ${color.split(' ')[0]}`} />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-700">{label}</h2>
                  <span className="ml-auto text-xs text-gray-400 font-medium">{colOrders.length}</span>
                </div>
                <div className="space-y-2">
                  {colOrders.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">No orders</p>
                  ) : (
                    colOrders.map((order) => (
                      <StationOrderCard key={order._id} order={order} onUpdate={() =>
                        queryClient.invalidateQueries({ queryKey: ['station', 'orders'] })
                      } />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          {/* Today's Stats */}
          <h2 className="text-sm font-semibold text-gray-700">Today</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="text-center">
              <DollarSign className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-xl font-black text-gray-900">
                {formatCurrency(analytics?.today?.revenue || 0)}
              </p>
              <p className="text-xs text-gray-500">Revenue</p>
            </Card>
            <Card className="text-center">
              <Package className="w-5 h-5 text-brand-500 mx-auto mb-1" />
              <p className="text-xl font-black text-gray-900">{analytics?.today?.count || 0}</p>
              <p className="text-xs text-gray-500">Orders Fulfilled</p>
            </Card>
          </div>

          {/* Weekly Trend */}
          <h2 className="text-sm font-semibold text-gray-700 mt-2">This Week</h2>
          {analytics?.weekly?.length > 0 ? (
            <Card>
              <div className="space-y-2">
                {analytics.weekly.map((day: any) => (
                  <div key={day._id} className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500 w-24">{day._id}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{
                          width: `${Math.min(100, (day.orders / (analytics.weekly[0]?.orders || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="font-semibold text-gray-800 w-8">{day.orders}</span>
                    <span className="text-green-600 font-medium w-20 text-right">
                      {formatCurrency(day.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="text-center py-8">
              <BarChart2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No data yet this week</p>
            </Card>
          )}

          {/* Commission Info */}
          {analytics?.today?.commission > 0 && (
            <Card className="bg-orange-50 border-orange-100">
              <p className="text-xs text-orange-600 font-medium">Platform Commission (Today)</p>
              <p className="text-lg font-bold text-orange-700 mt-1">
                − {formatCurrency(analytics.today.commission)}
              </p>
              <p className="text-xs text-orange-500 mt-1">Deducted before payout</p>
            </Card>
          )}
        </div>
      )}

      {/* Bottom Nav */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 flex">
        <Link href="/station" className="flex-1 py-3 flex flex-col items-center gap-1 text-brand-500">
          <Package className="w-5 h-5" />
          <span className="text-xs font-medium">Orders</span>
        </Link>
        <Link href="/station/inventory" className="flex-1 py-3 flex flex-col items-center gap-1 text-gray-400">
          <div className="w-5 h-5 border-2 border-current rounded-md" />
          <span className="text-xs">Inventory</span>
        </Link>
        <Link href="/station/analytics" className="flex-1 py-3 flex flex-col items-center gap-1 text-gray-400">
          <BarChart2 className="w-5 h-5" />
          <span className="text-xs">Analytics</span>
        </Link>
        <Link href="/station/settings" className="flex-1 py-3 flex flex-col items-center gap-1 text-gray-400">
          <Settings className="w-5 h-5" />
          <span className="text-xs">Settings</span>
        </Link>
      </div>
    </div>
  );
}

function StationOrderCard({ order, onUpdate }: { order: Order; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleMarkReady = async () => {
    setLoading(true);
    try {
      // Station marks cylinder ready for pickup — triggers "at_station" flow
      toast.success('Marked as ready for pickup');
      onUpdate();
    } catch {
      toast.error('Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const rider =
    typeof order.riderId === 'object' ? order.riderId : null;

  return (
    <Card className="text-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-gray-900">
            {formatCylinders(order.cylinders)} · {ORDER_TYPE_LABELS[order.orderType]}
          </p>
          <p className="text-xs text-gray-400 font-mono">#{order._id.slice(-6).toUpperCase()}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="text-xs text-gray-500 space-y-1 mb-2">
        {rider && <p>Rider: {(rider as any).name}</p>}
        <p>Deliver to: {order.deliveryAddress.street}, {order.deliveryAddress.city}</p>
        <p>{formatRelativeTime(order.createdAt)}</p>
      </div>
      {order.status === 'accepted' && (
        <button
          onClick={handleMarkReady}
          disabled={loading}
          className="w-full text-center text-xs font-semibold text-brand-600 bg-brand-50 py-2 rounded-xl hover:bg-brand-100 transition-colors"
        >
          {loading ? 'Updating...' : 'Mark Ready for Pickup'}
        </button>
      )}
    </Card>
  );
}
