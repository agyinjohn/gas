'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DollarSign, Package, Star, MapPin, Clock, 
  Power, Navigation, Phone, CheckCircle 
} from 'lucide-react';
import { ridersApi, ordersApi } from '@/lib/api';
import { Card, Button, Badge } from '@/components/ui';
import { formatCurrency, formatRelativeTime, formatCylinders } from '@/lib/utils';
import { getSocket } from '@/hooks/useSocket';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function RiderDashboardPage() {
  const queryClient = useQueryClient();
  const [riderStatus, setRiderStatus] = useState<'offline' | 'available' | 'on_break'>('offline');

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['rider', 'dashboard'],
    queryFn: () => ridersApi.getDashboard().then((r) => r.data.dashboard),
    refetchInterval: 30000,
  });

  // Sync local status from DB on load
  useEffect(() => {
    if (dashboardData?.status && dashboardData.status !== riderStatus) {
      setRiderStatus(dashboardData.status);
    }
  }, [dashboardData?.status]);

  const statusMutation = useMutation({
    mutationFn: (status: string) => ridersApi.setStatus(status),
    onSuccess: (_, status) => {
      setRiderStatus(status as any);
      toast.success(`Status updated to ${status}`);
      queryClient.invalidateQueries({ queryKey: ['rider', 'dashboard'] });
    },
  });

  // Join personal rider room + listen for dispatched orders
  useEffect(() => {
    const socket = getSocket();

    socket.on('order:new', (order: any) => {
      toast(`New order available: ${formatCylinders(order.cylinders)}`, {
        icon: '🔔',
        duration: 10000,
      });
      queryClient.invalidateQueries({ queryKey: ['rider', 'dashboard'] });
    });
    return () => { socket.off('order:new'); };
  }, [queryClient]);

  const dashboard = dashboardData || {};
  const activeOrder = dashboard.activeOrder;

  const handleStatusToggle = () => {
    const newStatus = riderStatus === 'offline' ? 'available' : 'offline';
    statusMutation.mutate(newStatus);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Rider Dashboard</h1>
            <p className="text-brand-100 text-sm">
              {riderStatus === 'available' ? 'You\'re online and ready for orders' : 
               riderStatus === 'on_break' ? 'You\'re on break' : 'You\'re offline'}
            </p>
          </div>
          <Button
            onClick={handleStatusToggle}
            loading={statusMutation.isPending}
            className={`${
              riderStatus === 'available' 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-green-500 hover:bg-green-600'
            } text-white`}
          >
            <Power className="w-4 h-4 mr-1" />
            {riderStatus === 'available' ? 'Go Offline' : 'Go Online'}
          </Button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            riderStatus === 'available' ? 'bg-green-400' :
            riderStatus === 'on_break' ? 'bg-yellow-400' : 'bg-gray-400'
          }`}></div>
          <span className="text-sm font-medium capitalize">{riderStatus}</span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Active Order */}
        {activeOrder && (
          <Card className="border-brand-200 bg-brand-50">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-brand-600" />
              <h2 className="font-semibold text-brand-900">Active Order</h2>
              <Badge className="bg-brand-100 text-brand-700">
                {activeOrder.status.replace('_', ' ')}
              </Badge>
            </div>
            
            <div className="space-y-2 text-sm mb-4">
              <p className="font-medium">
                {formatCylinders(activeOrder.cylinders)} · {activeOrder.orderType}
              </p>
              <p className="text-gray-600">
                Deliver to: {activeOrder.deliveryAddress?.street}, {activeOrder.deliveryAddress?.city}
              </p>
              <p className="text-gray-600">
                Station: {activeOrder.stationId?.name}
              </p>
            </div>

            <div className="flex gap-2">
              <Link href={`/rider/orders/${activeOrder._id}`} className="flex-1">
                <Button className="w-full">
                  <Navigation className="w-4 h-4 mr-1" />
                  View Details
                </Button>
              </Link>
              {activeOrder.status === 'accepted' && (
                <Button variant="secondary">
                  <Phone className="w-4 h-4 mr-1" />
                  Call Customer
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center">
            <DollarSign className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-black text-gray-900">
              {formatCurrency(dashboard.todayEarnings || 0)}
            </p>
            <p className="text-xs text-gray-500">Today's Earnings</p>
          </Card>
          
          <Card className="text-center">
            <Package className="w-6 h-6 text-brand-500 mx-auto mb-2" />
            <p className="text-2xl font-black text-gray-900">
              {dashboard.todayTrips || 0}
            </p>
            <p className="text-xs text-gray-500">Trips Completed</p>
          </Card>
        </div>

        {/* Overall Stats */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-3">Overall Performance</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Total Trips</p>
              <p className="font-bold text-lg">{dashboard.totalTrips || 0}</p>
            </div>
            <div>
              <p className="text-gray-500">Total Earnings</p>
              <p className="font-bold text-lg text-green-600">
                {formatCurrency(dashboard.totalEarnings || 0)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Rating</p>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <p className="font-bold text-lg">
                  {dashboard.ratingAvg?.toFixed(1) || 'N/A'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-gray-500">Status</p>
              <p className="font-bold text-lg capitalize">{dashboard.status || 'offline'}</p>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/rider/orders">
              <Button variant="secondary" className="w-full">
                <Clock className="w-4 h-4 mr-1" />
                Order History
              </Button>
            </Link>
            <Link href="/rider/earnings">
              <Button variant="secondary" className="w-full">
                <DollarSign className="w-4 h-4 mr-1" />
                Earnings
              </Button>
            </Link>
            <Link href="/rider/profile">
              <Button variant="secondary" className="w-full">
                <Star className="w-4 h-4 mr-1" />
                Profile
              </Button>
            </Link>
            <Button 
              variant="secondary" 
              onClick={() => statusMutation.mutate('on_break')}
              disabled={riderStatus === 'offline'}
            >
              <Clock className="w-4 h-4 mr-1" />
              Take Break
            </Button>
          </div>
        </Card>

        {/* Tips */}
        {riderStatus === 'offline' && (
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-900 mb-1">Ready to start earning?</p>
                <p className="text-sm text-blue-700">
                  Go online to receive order notifications and start delivering gas cylinders to customers.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 flex">
        <Link href="/rider/dashboard" className="flex-1 py-3 flex flex-col items-center gap-1 text-brand-500">
          <Package className="w-5 h-5" />
          <span className="text-xs font-medium">Dashboard</span>
        </Link>
        <Link href="/rider/orders" className="flex-1 py-3 flex flex-col items-center gap-1 text-gray-400">
          <Clock className="w-5 h-5" />
          <span className="text-xs">Orders</span>
        </Link>
        <Link href="/rider/earnings" className="flex-1 py-3 flex flex-col items-center gap-1 text-gray-400">
          <DollarSign className="w-5 h-5" />
          <span className="text-xs">Earnings</span>
        </Link>
        <Link href="/rider/profile" className="flex-1 py-3 flex flex-col items-center gap-1 text-gray-400">
          <Star className="w-5 h-5" />
          <span className="text-xs">Profile</span>
        </Link>
      </div>
    </div>
  );
}