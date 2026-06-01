'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Filter, Search, XCircle } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { Card, Button, Badge, Input, Skeleton } from '@/components/ui';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', statusFilter, searchTerm],
    queryFn: () => adminApi.getOrders({ 
      status: statusFilter || undefined, 
      search: searchTerm || undefined,
      limit: 50 
    }).then((r) => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.cancelOrder(id, reason),
    onSuccess: () => {
      toast.success('Order cancelled');
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });

  const refundMutation = useMutation({
    mutationFn: (id: string) => adminApi.refundOrder(id),
    onSuccess: () => {
      toast.success('Refund processed');
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });

  const orders = data?.orders || [];

  return (
    <div className="px-4 lg:px-6 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Order Management</h1>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by order ID, phone, address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['', 'pending', 'accepted', 'at_station', 'en_route', 'delivered', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? status === 'cancelled' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
                  : status === 'cancelled' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === '' ? 'All' : status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-32" />
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
              <OrderCard
                key={order._id}
                order={order}
                onCancel={(reason) => cancelMutation.mutate({ id: order._id, reason })}
                onRefund={() => refundMutation.mutate(order._id)}
                loading={cancelMutation.isPending || refundMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ 
  order, 
  onCancel, 
  onRefund, 
  loading 
}: { 
  order: any; 
  onCancel: (reason: string) => void; 
  onRefund: () => void; 
  loading: boolean; 
}) {
  const [showActions, setShowActions] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'en_route': return 'bg-blue-100 text-blue-700';
      case 'accepted': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-mono text-gray-400 mb-1">
            #{order._id.slice(-8).toUpperCase()}
          </p>
          <p className="font-semibold text-gray-900">
            {order.cylinders?.map((c: any) => `${c.quantity}×${c.size}kg`).join(', ')} · {order.orderType}
          </p>
        </div>
        <Badge className={getStatusColor(order.status)}>
          {order.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="space-y-1 text-xs text-gray-500 mb-3">
        <p>Customer: {order.userId?.name || 'N/A'} · {order.userId?.phone}</p>
        <p>Station: {order.stationId?.name || 'N/A'}</p>
        <p>Rider: {order.riderId?.name || 'Unassigned'}</p>
        <p>Address: {order.deliveryAddress?.street}, {order.deliveryAddress?.city}</p>
        <p>Ordered: {formatRelativeTime(order.createdAt)}</p>
        {order.scheduledFor && (
          <p>Scheduled: {new Date(order.scheduledFor).toLocaleString()}</p>
        )}
        {order.status === 'cancelled' && order.cancellationReason && (
          <div className="mt-2 p-2.5 bg-red-50 border border-red-100 rounded-lg">
            <p className="font-semibold text-red-700 mb-0.5">
              Cancelled by {order.cancelledBy || 'user'}
            </p>
            <p className="text-red-600">Reason: {order.cancellationReason}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-brand-600">
            {formatCurrency(order.totalAmount)}
          </p>
          <p className="text-xs text-gray-400">
            Payment: {order.paymentMethod?.type || 'N/A'}
          </p>
        </div>

        <div className="flex gap-2">
          {!['delivered', 'cancelled'].includes(order.status) && (
            <Button
              size="sm"
              variant="danger"
              loading={loading}
              onClick={() => onCancel('Cancelled by admin')}
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel
            </Button>
          )}
          
          {order.status === 'delivered' && order.paymentStatus === 'completed' && (
            <Button
              size="sm"
              variant="secondary"
              loading={loading}
              onClick={onRefund}
            >
              Refund
            </Button>
          )}
        </div>
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