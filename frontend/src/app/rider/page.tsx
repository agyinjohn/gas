'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Power, MapPin, Star, Package, TrendingUp, Bell } from 'lucide-react';
import { ridersApi, ordersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getSocket } from '@/hooks/useSocket';
import { Button, Card } from '@/components/ui';
import { formatCurrency, formatRelativeTime, ORDER_STATUS_LABELS, formatCylinders } from '@/lib/utils';
import { Order } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function RiderHomePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [countdown, setCountdown] = useState(60);

  const { data: dashData } = useQuery({
    queryKey: ['rider', 'dashboard'],
    queryFn: () => ridersApi.getDashboard().then((r) => r.data.dashboard),
  });

  const { data: riderData } = useQuery({
    queryKey: ['rider', 'me'],
    queryFn: () => ridersApi.getMe().then((r) => r.data.rider),
  });

  const { data: activeOrderData } = useQuery({
    queryKey: ['orders', 'rider', 'active'],
    queryFn: () =>
      ordersApi
        .list({ status: 'accepted,at_station,en_route' })
        .then((r) => r.data.orders[0] || null),
    refetchInterval: 10000,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => ridersApi.setStatus(status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rider', 'me'] }),
  });

  const isOnline = riderData?.status === 'available' || riderData?.status === 'busy';

  // GPS broadcasting while online
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      navigator.geolocation?.getCurrentPosition(({ coords }) => {
        ridersApi.updateLocation(coords.latitude, coords.longitude).catch(() => {});
      });
    }, 12000);
    return () => clearInterval(interval);
  }, [isOnline]);

  // Listen for new orders
  useEffect(() => {
    const socket = getSocket();
    socket.on('order:new', (order: any) => {
      setPendingOrder(order);
      setCountdown(60);
      toast('New order incoming!', { icon: '🛵', duration: 60000 });
    });
    return () => { socket.off('order:new'); };
  }, []);

  // Countdown timer for pending order
  useEffect(() => {
    if (!pendingOrder) return;
    if (countdown <= 0) { setPendingOrder(null); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [pendingOrder, countdown]);

  const handleAcceptOrder = async () => {
    if (!pendingOrder) return;
    try {
      await ordersApi.updateStatus(pendingOrder.orderId, 'accepted');
      setPendingOrder(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order accepted!');
    } catch {
      toast.error('Failed to accept order');
    }
  };

  const handleDeclineOrder = () => {
    setPendingOrder(null);
    toast('Order declined', { icon: '❌' });
  };

  const activeOrder = activeOrderData;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className={`px-4 pt-12 pb-6 ${isOnline ? 'bg-brand-500 text-white' : 'bg-gray-800 text-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm opacity-80">Welcome back</p>
            <h1 className="text-xl font-bold">{riderData?.name || 'Rider'}</h1>
          </div>
          <button
            onClick={() =>
              statusMutation.mutate(isOnline ? 'offline' : 'available')
            }
            disabled={statusMutation.isPending}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold text-sm transition-all ${
              isOnline
                ? 'bg-white/20 hover:bg-white/30'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            <Power className="w-4 h-4" />
            {isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>

        {/* Status Pill */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isOnline ? 'bg-white/20' : 'bg-white/10'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
            }`}
          />
          {riderData?.status === 'busy'
            ? 'On Delivery'
            : isOnline
            ? 'Available for Orders'
            : 'Offline'}
        </div>
      </div>

      {/* Incoming Order Alert */}
      {pendingOrder && (
        <div className="mx-4 mt-4 bg-white rounded-2xl border-2 border-brand-400 shadow-lg overflow-hidden animate-slide-up">
          <div className="bg-brand-500 text-white px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 animate-pulse" />
              <span className="font-semibold text-sm">New Order!</span>
            </div>
            <span className="text-2xl font-black">{countdown}s</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div>
                <p className="text-gray-500">Cylinders</p>
                <p className="font-semibold">{pendingOrder.cylinders ? formatCylinders(pendingOrder.cylinders) : `${pendingOrder.cylinderSize}kg`} · {pendingOrder.orderType}</p>
              </div>
              <div>
                <p className="text-gray-500">Your Earning</p>
                <p className="font-bold text-green-600">{formatCurrency(pendingOrder.earning)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Deliver to</p>
                <p className="font-semibold">{pendingOrder.deliveryAddress?.street}, {pendingOrder.deliveryAddress?.city}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" size="sm" onClick={handleDeclineOrder}>
                Decline
              </Button>
              <Button className="flex-1" size="sm" onClick={handleAcceptOrder}>
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active Order Card */}
      {activeOrder && (
        <div className="px-4 mt-4">
          <Link href={`/rider/orders/${activeOrder._id}`}>
            <Card className="border-2 border-brand-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">Active Order</p>
                <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                  {ORDER_STATUS_LABELS[activeOrder.status]}
                </span>
              </div>
              <p className="font-semibold text-gray-900">
                {formatCylinders(activeOrder.cylinders)} · {activeOrder.orderType}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {activeOrder.deliveryAddress.street}, {activeOrder.deliveryAddress.city}
              </p>
              <p className="text-xs text-brand-500 mt-2 font-medium">Tap to view details →</p>
            </Card>
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="text-center">
            <p className="text-2xl font-black text-gray-900">
              {formatCurrency(dashData?.todayEarnings || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Today's Earnings</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-black text-gray-900">{dashData?.todayTrips || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Today's Trips</p>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-bold">{dashData?.ratingAvg?.toFixed(1) || '—'}</span>
            </div>
            <p className="text-xs text-gray-500">Rating</p>
          </Card>
          <Card className="text-center">
            <p className="text-lg font-black text-gray-900">{dashData?.totalTrips || 0}</p>
            <p className="text-xs text-gray-500">Total Trips</p>
          </Card>
          <Card className="text-center">
            <p className="text-sm font-bold text-gray-900">
              {formatCurrency(dashData?.totalEarnings || 0)}
            </p>
            <p className="text-xs text-gray-500">All-time</p>
          </Card>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="px-4 mt-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Deliveries</h2>
        <RecentOrders />
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 flex">
        <Link href="/rider" className="flex-1 py-3 flex flex-col items-center gap-1 text-brand-500">
          <TrendingUp className="w-5 h-5" />
          <span className="text-xs font-medium">Dashboard</span>
        </Link>
        <Link href="/rider/orders" className="flex-1 py-3 flex flex-col items-center gap-1 text-gray-400">
          <Package className="w-5 h-5" />
          <span className="text-xs">Orders</span>
        </Link>
        <Link href="/rider/profile" className="flex-1 py-3 flex flex-col items-center gap-1 text-gray-400">
          <div className="w-5 h-5 border-2 border-current rounded-full" />
          <span className="text-xs">Profile</span>
        </Link>
      </div>
    </div>
  );
}

function RecentOrders() {
  const { data } = useQuery({
    queryKey: ['orders', 'rider', 'recent'],
    queryFn: () => ordersApi.list({ limit: 5 }).then((r) => r.data.orders as Order[]),
  });

  const orders = data || [];
  if (orders.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">No deliveries yet today</p>;
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => (
        <Link key={order._id} href={`/rider/orders/${order._id}`}>
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {formatCylinders(order.cylinders)} · {order.orderType}
              </p>
              <p className="text-xs text-gray-400">{formatRelativeTime(order.createdAt)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-green-600">
                +{formatCurrency(order.stationPayout * 0.15)}
              </p>
              <p className="text-xs text-gray-400">{ORDER_STATUS_LABELS[order.status]}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
