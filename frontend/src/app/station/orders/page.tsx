'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { Card, Button, Badge } from '@/components/ui';
import { formatCurrency, formatRelativeTime, formatCylinders } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATION_ID = typeof window !== 'undefined' ? localStorage.getItem('GetGas_station_id') || '' : '';

export default function StationOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['station', 'orders', statusFilter],
    queryFn: () => ordersApi.list({ 
      stationId: STATION_ID, 
      status: statusFilter || undefined,
      limit: 100 
    }).then((r) => r.data.orders),
    refetchInterval: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      ordersApi.updateStatus(id, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['station', 'orders'] });
      toast.success('Order updated');
    },
  });

  const orders = data || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 mb-4">All Orders</h1>
        
        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['', 'pending', 'accepted', 'at_station', 'en_route', 'delivered', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === '' ? 'All' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No orders found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order: any) => (
              <StationOrderCard
                key={order._id}
                order={order}
                onUpdateStatus={(status, note) => 
                  updateStatusMutation.mutate({ id: order._id, status, note })
                }
                loading={updateStatusMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StationOrderCard({ 
  order, 
  onUpdateStatus, 
  loading 
}: { 
  order: any; 
  onUpdateStatus: (status: string, note?: string) => void; 
  loading: boolean; 
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'accepted': return 'bg-blue-100 text-blue-700';
      case 'at_station': return 'bg-purple-100 text-purple-700';
      case 'en_route': return 'bg-orange-100 text-orange-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'delivered': return CheckCircle;
      case 'cancelled': return XCircle;
      default: return Package;
    }
  };

  const StatusIcon = getStatusIcon(order.status);
  const rider = typeof order.riderId === 'object' ? order.riderId : null;

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-mono text-gray-400 mb-1">
            #{order._id.slice(-6).toUpperCase()}
          </p>
          <p className="font-semibold text-gray-900">
            {formatCylinders(order.cylinders)} · {order.orderType}
          </p>
        </div>
        <Badge className={getStatusColor(order.status)}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {order.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="space-y-1 text-xs text-gray-500 mb-3">
        <p>Customer: {order.userId?.name || 'N/A'} · {order.userId?.phone}</p>
        {rider && <p>Rider: {rider.name} · {rider.phone}</p>}
        <p>Deliver to: {order.deliveryAddress?.street}, {order.deliveryAddress?.city}</p>
        <p>Ordered: {formatRelativeTime(order.createdAt)}</p>
        {order.scheduledFor && (
          <p>Scheduled: {new Date(order.scheduledFor).toLocaleString()}</p>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-lg font-bold text-brand-600">
          {formatCurrency(order.totalAmount)}
        </p>
        <p className="text-xs text-gray-400">
          Payment: {order.paymentMethod?.type || 'Cash'}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {order.status === 'pending' && (
          <>
            <Button
              size="sm"
              className="flex-1"
              loading={loading}
              onClick={() => onUpdateStatus('accepted')}
            >
              Accept Order
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => onUpdateStatus('cancelled', 'Station declined')}
            >
              Decline
            </Button>
          </>
        )}

        {order.status === 'accepted' && (
          <Button
            size="sm"
            className="w-full"
            loading={loading}
            onClick={() => onUpdateStatus('at_station', 'Cylinders ready for pickup')}
          >
            Mark Ready for Pickup
          </Button>
        )}

        {order.status === 'at_station' && (
          <div className="w-full text-center py-2 bg-purple-50 rounded-lg">
            <p className="text-xs text-purple-600 font-medium">
              Waiting for rider pickup
            </p>
          </div>
        )}

        {order.status === 'en_route' && (
          <div className="w-full text-center py-2 bg-orange-50 rounded-lg">
            <p className="text-xs text-orange-600 font-medium">
              Out for delivery
            </p>
          </div>
        )}

        {['delivered', 'cancelled'].includes(order.status) && (
          <div className="w-full text-center py-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 font-medium">
              Order {order.status}
            </p>
          </div>
        )}
      </div>

      {order.notes && (
        <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
          <p className="font-medium text-gray-700">Notes:</p>
          <p className="text-gray-600">{order.notes}</p>
        </div>
      )}
    </Card>
  );
}