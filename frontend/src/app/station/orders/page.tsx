'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Clock, CheckCircle, XCircle, MapPin, Phone, User, CreditCard, AlertCircle } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { formatCurrency, formatRelativeTime, formatCylinders, ORDER_TYPE_LABELS } from '@/lib/utils';
import toast from 'react-hot-toast';

function getStationId(): string {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('gasgo_token') : null;
    if (!token) return '';
    return JSON.parse(atob(token.split('.')[1])).stationId || '';
  } catch { return ''; }
}

const STATUS_FILTERS = [
  { key: '', label: 'All Orders' },
  { key: 'pending', label: 'Incoming' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'at_station', label: 'Ready' },
  { key: 'en_route', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function StationOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const stationId = useMemo(() => getStationId(), []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['station', 'orders', statusFilter, stationId],
    queryFn: () => {
      if (!stationId) return [];
      return ordersApi.list({ 
        stationId, 
        status: statusFilter || undefined,
        limit: 100 
      }).then((r) => r.data.orders);
    },
    enabled: !!stationId,
    refetchInterval: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      ordersApi.updateStatus(id, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['station', 'orders'] });
      toast.success('Order updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update order');
    },
  });

  const orders = data || [];
  const stats = {
    pending: orders.filter((o: any) => o.status === 'pending').length,
    active: orders.filter((o: any) => ['accepted', 'at_station', 'en_route'].includes(o.status)).length,
    completed: orders.filter((o: any) => o.status === 'delivered').length,
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header Section */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="px-4 lg:px-6 py-6 max-w-6xl mx-auto">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Incoming', count: stats.pending, color: 'text-yellow-600 dark:text-yellow-400' },
              { label: 'Active', count: stats.active, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Completed', count: stats.completed, color: 'text-green-600 dark:text-green-400' },
            ].map(({ label, count, color }) => (
              <div key={label} className="bg-[var(--bg-card2)] rounded-xl border border-[var(--border)] p-3 text-center">
                <p className={`text-2xl font-black ${color}`}>{count}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-4 lg:px-6 py-6 max-w-6xl mx-auto pb-8">
        {/* Status Filters */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {STATUS_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  statusFilter === key
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                    : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-card2)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 animate-pulse">
                <div className="h-4 bg-[var(--bg-card2)] rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-[var(--bg-card2)] rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]">
            <AlertCircle className="w-16 h-16 text-red-200 dark:text-red-900 mx-auto mb-4" />
            <p className="text-red-500 dark:text-red-400 font-medium">Error loading orders</p>
            <p className="text-sm text-red-400 dark:text-red-500 mt-1">{(error as any)?.message || 'Please try again'}</p>
          </div>
        ) : !stationId ? (
          <div className="text-center py-16 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]">
            <AlertCircle className="w-16 h-16 text-yellow-200 dark:text-yellow-900 mx-auto mb-4" />
            <p className="text-yellow-600 dark:text-yellow-400 font-medium">Station ID not found</p>
            <p className="text-sm text-yellow-500 dark:text-yellow-500 mt-1">Please log in again</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]">
            <Package className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-[var(--text-primary)] font-medium">No orders found</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Orders will appear here when customers place them</p>
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
      case 'pending': return { bg: 'bg-yellow-50 dark:bg-yellow-500/10', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-500/20' };
      case 'accepted': return { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/20' };
      case 'at_station': return { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-500/20' };
      case 'en_route': return { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-500/20' };
      case 'delivered': return { bg: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-500/20' };
      case 'cancelled': return { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-500/20' };
      default: return { bg: 'bg-[var(--bg-card2)]', text: 'text-[var(--text-primary)]', border: 'border-[var(--border)]' };
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

  const statusColor = getStatusColor(order.status);
  const StatusIcon = getStatusIcon(order.status);
  const rider = typeof order.riderId === 'object' ? order.riderId : null;

  return (
    <div className={`bg-[var(--bg-card)] rounded-2xl border ${statusColor.border} p-5 shadow-sm transition-all hover:shadow-md`}>
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-mono text-[var(--text-muted)] mb-1">
            Order #{order._id.slice(-6).toUpperCase()}
          </p>
          <p className="font-bold text-[var(--text-primary)] text-lg">
            {formatCylinders(order.cylinders)} · {ORDER_TYPE_LABELS[order.orderType]}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${statusColor.bg} border ${statusColor.border}`}>
          <StatusIcon className="w-4 h-4" />
          <span className={`text-xs font-bold ${statusColor.text}`}>
            {order.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pb-4 border-b border-[var(--border)]">
        
        {/* Customer */}
        <div className="flex items-start gap-3">
          <User className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-muted)] font-medium">Customer</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{order.userId?.name || 'N/A'}</p>
            <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3" /> {order.userId?.phone}
            </p>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-muted)] font-medium">Delivery Address</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{order.deliveryAddress?.street}</p>
            <p className="text-xs text-[var(--text-muted)]">{order.deliveryAddress?.city}</p>
          </div>
        </div>

        {/* Rider (if assigned) */}
        {rider && (
          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-[var(--text-muted)] font-medium">Assigned Rider</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{rider.name}</p>
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" /> {rider.phone}
              </p>
            </div>
          </div>
        )}

        {/* Payment & Amount */}
        <div className="flex items-start gap-3">
          <CreditCard className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-muted)] font-medium">Payment</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(order.totalAmount)}</p>
            <p className="text-xs text-[var(--text-muted)] capitalize">{order.paymentMethod?.type || 'Cash'}</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-4">
        <Clock className="w-3.5 h-3.5" />
        <span>Ordered {formatRelativeTime(order.createdAt)}</span>
        {order.scheduledFor && (
          <>
            <span>•</span>
            <span>Scheduled for {new Date(order.scheduledFor).toLocaleString()}</span>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {order.status === 'pending' && (
          <>
            <button
              onClick={() => onUpdateStatus('accepted')}
              disabled={loading}
              className="flex-1 h-10 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-60"
            >
              {loading ? 'Updating...' : 'Accept Order'}
            </button>
            <button
              onClick={() => onUpdateStatus('cancelled', 'Station declined')}
              disabled={loading}
              className="flex-1 h-10 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl transition-all disabled:opacity-60"
            >
              Decline
            </button>
          </>
        )}

        {order.status === 'accepted' && (
          <button
            onClick={() => onUpdateStatus('at_station', 'Cylinders ready for pickup')}
            disabled={loading}
            className="w-full h-10 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-60"
          >
            {loading ? 'Updating...' : 'Mark Ready for Pickup'}
          </button>
        )}

        {order.status === 'at_station' && (
          <div className="w-full h-10 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-xl flex items-center justify-center">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">Waiting for rider pickup</p>
          </div>
        )}

        {order.status === 'en_route' && (
          <div className="w-full h-10 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl flex items-center justify-center">
            <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold">Out for delivery</p>
          </div>
        )}

        {['delivered', 'cancelled'].includes(order.status) && (
          <div className="w-full h-10 bg-[var(--bg-card2)] border border-[var(--border)] rounded-xl flex items-center justify-center">
            <p className="text-xs text-[var(--text-primary)] font-semibold">Order {order.status}</p>
          </div>
        )}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-blue-700 dark:text-blue-400">Customer Notes</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{order.notes}</p>
          </div>
        </div>
      )}

    </div>
  );
}
