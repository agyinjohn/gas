'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, Package, Star, Clock,
  Power, Navigation, Phone, TrendingUp, Bike, MapPin, ChevronRight,
} from 'lucide-react';
import { ridersApi } from '@/lib/api';
import { Button } from '@/components/ui';
import { formatCurrency, formatRelativeTime, formatCylinders } from '@/lib/utils';
import { getSocket } from '@/hooks/useSocket';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

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

export default function RiderDashboardPage() {
  const queryClient = useQueryClient();
  const [riderStatus, setRiderStatus] = useState<'offline' | 'available' | 'on_break'>('offline');

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['rider', 'dashboard'],
    queryFn: () => ridersApi.getDashboard().then((r) => r.data.dashboard),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (dashboardData?.status && dashboardData.status !== riderStatus) {
      setRiderStatus(dashboardData.status);
    }
  }, [dashboardData?.status]);

  // Log coordinates
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => console.log('[Rider] GPS:', { lat: c.latitude, lng: c.longitude }),
      (err) => console.warn('[Rider] Location error:', err.message)
    );
  }, []);

  useEffect(() => {
    if (dashboardData?.location) console.log('[Rider] DB location:', dashboardData.location);
    if (dashboardData?.activeOrder) console.log('[Rider] Active order:', dashboardData.activeOrder._id);
  }, [dashboardData?.location, dashboardData?.activeOrder]);

  const statusMutation = useMutation({
    mutationFn: (status: string) => ridersApi.setStatus(status),
    onSuccess: (_, status) => {
      setRiderStatus(status as any);
      toast.success(`You're now ${status.replace('_', ' ')}`);
      queryClient.invalidateQueries({ queryKey: ['rider', 'dashboard'] });
    },
  });

  useEffect(() => {
    const socket = getSocket();
    socket.on('order:new', (order: any) => {
      toast(`New order: ${formatCylinders(order.cylinders)}`, { icon: '🔔', duration: 10000 });
      queryClient.invalidateQueries({ queryKey: ['rider', 'dashboard'] });
    });
    socket.on('order:status', ({ status }: { status: string }) => {
      if (status === 'delivered' || status === 'cancelled') {
        queryClient.invalidateQueries({ queryKey: ['rider', 'dashboard'] });
      }
    });
    return () => {
      socket.off('order:new');
      socket.off('order:status');
    };
  }, [queryClient]);

  const dashboard = dashboardData || {};
  const activeOrder = dashboard.activeOrder;
  const recentOrders: any[] = dashboard.recentOrders || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── Header ── */}
      <div className="bg-brand-500 px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-brand-200 text-xs mb-0.5">Rider Dashboard</p>
            <h1 className="text-white text-xl font-black">
              {riderStatus === 'available' ? 'You\'re Online 🟢' :
               riderStatus === 'on_break'  ? 'On Break ⏸' : 'You\'re Offline'}
            </h1>
          </div>
          <Button
            onClick={() => statusMutation.mutate(riderStatus === 'available' ? 'offline' : 'available')}
            loading={statusMutation.isPending}
            size="sm"
            className={cn(
              'font-bold rounded-xl',
              riderStatus === 'available' ? 'bg-white text-brand-600' : 'bg-white/20 text-white border border-white/30'
            )}
          >
            <Power className="w-4 h-4" />
            {riderStatus === 'available' ? 'Go Offline' : 'Go Online'}
          </Button>
        </div>

        {/* Today stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/15 rounded-2xl p-3">
            <p className="text-brand-100 text-xs mb-1">Today's Earnings</p>
            <p className="text-white text-xl font-black">{formatCurrency(dashboard.todayEarnings ?? 0)}</p>
          </div>
          <div className="bg-white/15 rounded-2xl p-3">
            <p className="text-brand-100 text-xs mb-1">Trips Today</p>
            <p className="text-white text-xl font-black">{dashboard.todayTrips ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* ── Active Order ── */}
        {activeOrder && (
          <div className="bg-white rounded-2xl border-2 border-brand-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center">
                  <Bike className="w-4 h-4 text-white" />
                </div>
                <p className="font-bold text-gray-900 text-sm">Active Delivery</p>
              </div>
              <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full', STATUS_COLORS[activeOrder.status])}>
                {STATUS_LABELS[activeOrder.status] ?? activeOrder.status}
              </span>
            </div>

            <div className="space-y-1.5 mb-3">
              <p className="text-sm font-semibold text-gray-800">
                {formatCylinders(activeOrder.cylinders)} · <span className="capitalize">{activeOrder.orderType}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <p className="text-xs text-gray-500 truncate">
                  {activeOrder.deliveryAddress?.street}, {activeOrder.deliveryAddress?.city}
                </p>
              </div>
              {activeOrder.stationId?.name && (
                <p className="text-xs text-gray-400">Station: {activeOrder.stationId.name}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Link href={`/rider/orders/${activeOrder._id}`} className="flex-1">
                <Button size="sm" className="w-full rounded-xl">
                  <Navigation className="w-4 h-4" />
                  Continue Delivery
                </Button>
              </Link>
              <Button variant="secondary" size="sm" className="rounded-xl px-3">
                <Phone className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Overall Stats ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-brand-500" />
            <p className="font-bold text-gray-900 text-sm">Overall Performance</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-black text-gray-900">{dashboard.totalTrips ?? 0}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Total Trips</p>
            </div>
            <div className="text-center border-x border-gray-100">
              <p className="text-2xl font-black text-green-600">{formatCurrency(dashboard.totalEarnings ?? 0)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Total Earned</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <p className="text-2xl font-black text-gray-900">
                  {dashboard.ratingAvg > 0 ? dashboard.ratingAvg.toFixed(1) : '—'}
                </p>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">Rating</p>
            </div>
          </div>
        </div>

        {/* ── Recent Deliveries ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-gray-900 text-sm">Recent Deliveries</p>
            <Link href="/rider/orders" className="text-xs font-semibold text-brand-500">
              View All
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No deliveries yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order: any) => (
                <Link key={order._id} href={`/rider/orders/${order._id}`}>
                  <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm active:scale-[0.99] transition-transform">
                    <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                      <Bike className="w-4 h-4 text-brand-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 capitalize">
                        {order.orderType} · {formatCylinders(order.cylinders)}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-gray-300" />
                        <p className="text-xs text-gray-400">{formatRelativeTime(order.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-green-600">+{formatCurrency(order.deliveryFee ?? 0)}</p>
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', STATUS_COLORS[order.status])}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Take a Break ── */}
        {riderStatus === 'available' && (
          <button
            onClick={() => statusMutation.mutate('on_break')}
            disabled={statusMutation.isPending}
            className="w-full bg-white border border-gray-200 rounded-2xl py-3 text-sm font-semibold text-gray-500 flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" /> Take a Break
          </button>
        )}

        {/* ── Go Online prompt ── */}
        {riderStatus === 'offline' && (
          <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 bg-brand-500/10 rounded-xl flex items-center justify-center shrink-0">
              <Bike className="w-4 h-4 text-brand-500" />
            </div>
            <div>
              <p className="font-semibold text-brand-900 text-sm mb-0.5">Ready to earn?</p>
              <p className="text-xs text-brand-600">Go online to start receiving delivery orders.</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Nav ── */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 flex">
        <Link href="/rider/dashboard" className="flex-1 py-3 flex flex-col items-center gap-1 text-brand-500">
          <Package className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Home</span>
        </Link>
        <Link href="/rider/orders" className="flex-1 py-3 flex flex-col items-center gap-1 text-gray-400">
          <Clock className="w-5 h-5" />
          <span className="text-[10px]">Orders</span>
        </Link>
        <Link href="/rider/earnings" className="flex-1 py-3 flex flex-col items-center gap-1 text-gray-400">
          <DollarSign className="w-5 h-5" />
          <span className="text-[10px]">Earnings</span>
        </Link>
        <Link href="/rider/profile" className="flex-1 py-3 flex flex-col items-center gap-1 text-gray-400">
          <Star className="w-5 h-5" />
          <span className="text-[10px]">Profile</span>
        </Link>
      </div>
    </div>
  );
}
