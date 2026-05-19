'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, X, MapPin, Phone, User, CreditCard, Clock, Bike, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { formatCurrency, formatCylinders, formatRelativeTime, ORDER_TYPE_LABELS } from '@/lib/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

function getStationId(): string {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('gasgo_token') : null;
    if (!token) return '';
    return JSON.parse(atob(token.split('.')[1])).stationId || '';
  } catch { return ''; }
}

const STATUS_STYLE: Record<string, string> = {
  pending:    'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
  accepted:   'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  at_station: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  en_route:   'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  delivered:  'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  cancelled:  'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'at_station', label: 'At Station' },
  { value: 'en_route', label: 'En Route' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const fmt = (d: Date) => d.toISOString().split('T')[0];

export default function StationOrdersPage() {
  const queryClient = useQueryClient();
  const stationId = useMemo(() => getStationId(), []);
  
  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [fromDate, setFromDate] = useState(fmt(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))); // 30 days ago
  const [toDate, setToDate] = useState(fmt(new Date()));
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['station', 'orders', page, limit, fromDate, toDate, statusFilter, stationId],
    queryFn: () => ordersApi.list({ 
      stationId, 
      from: fromDate, 
      to: toDate,
      status: statusFilter,
      page,
      limit
    }).then((r) => r.data),
    enabled: !!stationId,
    refetchInterval: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      ordersApi.updateStatus(id, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['station', 'orders'] });
      toast.success('Order updated');
      setSelected(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update'),
  });

  const orders = data?.orders || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, pages: 1 };

  const handleResetFilters = () => {
    setPage(1);
    setFromDate(fmt(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
    setToDate(fmt(new Date()));
    setStatusFilter('');
  };

  return (
    <div className="px-4 lg:px-6 py-5 max-w-full mx-auto pb-8 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Orders</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Total: <span className="font-semibold text-[var(--text-primary)]">{pagination.total}</span> orders
          </p>
        </div>
        {(fromDate !== fmt(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) || toDate !== fmt(new Date()) || statusFilter) && (
          <button onClick={handleResetFilters}
            className="text-xs text-brand-500 font-semibold hover:text-brand-600 transition-colors">
            Reset Filters
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Filters</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* From Date */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--bg-card2)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--bg-card2)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--bg-card2)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {STATUS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Limit */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Per Page</label>
            <select
              value={limit}
              onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
              className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--bg-card2)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-8 text-center">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] py-16 text-center">
          <Package className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">No orders found</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-card2)] border-b border-[var(--border)]">
                  <tr>
                    {['Order', 'Customer', 'Items', 'Address', 'Amount', 'Payment', 'Status', 'Date', 'Action'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {orders.map((order: any) => (
                    <tr key={order._id} className="hover:bg-[var(--bg-card2)] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)] whitespace-nowrap">
                        #{order._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-semibold text-[var(--text-primary)] text-xs">{order.userId?.name || '—'}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{order.userId?.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-primary)] whitespace-nowrap">
                        {formatCylinders(order.cylinders)} · {ORDER_TYPE_LABELS[order.orderType]}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)] max-w-[160px] truncate">
                        {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-[var(--text-primary)] whitespace-nowrap">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)] capitalize whitespace-nowrap">
                        {order.paymentMethod?.replace('_', ' ') || 'cash'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn('text-[10px] font-bold px-2 py-1 rounded-lg', STATUS_STYLE[order.status])}>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-primary)] whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setSelected(order)}
                            className="px-3 py-1.5 bg-[var(--bg-card2)] border border-[var(--border)] text-[var(--text-primary)] text-[11px] font-bold rounded-lg hover:bg-[var(--border)] transition-all">
                            View
                          </button>
                          {order.status === 'pending' && (
                            <button onClick={() => updateMutation.mutate({ id: order._id, status: 'accepted' })}
                              disabled={updateMutation.isPending}
                              className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-[11px] font-bold rounded-lg disabled:opacity-60 transition-all">
                              Accept
                            </button>
                          )}
                          {order.status === 'accepted' && (
                            <button onClick={() => updateMutation.mutate({ id: order._id, status: 'at_station' })}
                              disabled={updateMutation.isPending}
                              className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-[11px] font-bold rounded-lg disabled:opacity-60 transition-all">
                              Ready
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {orders.map((order: any) => (
              <div key={order._id} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 space-y-3">
                {/* Header: Order ID and Status */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-mono text-[var(--text-muted)]">#{order._id.slice(-6).toUpperCase()}</p>
                    <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">
                      {formatCylinders(order.cylinders)} · {ORDER_TYPE_LABELS[order.orderType]}
                    </p>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap', STATUS_STYLE[order.status])}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Customer Info */}
                <div className="flex items-center gap-2 bg-[var(--bg-card2)] rounded-lg p-2.5">
                  <User className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{order.userId?.name || '—'}</p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">{order.userId?.phone}</p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-2 bg-[var(--bg-card2)] rounded-lg p-2.5">
                  <MapPin className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                    {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
                  </p>
                </div>

                {/* Details Row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[var(--bg-card2)] rounded-lg p-2">
                    <p className="text-[10px] text-[var(--text-muted)] font-semibold">Amount</p>
                    <p className="text-xs font-bold text-[var(--text-primary)] mt-1">
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                  <div className="bg-[var(--bg-card2)] rounded-lg p-2">
                    <p className="text-[10px] text-[var(--text-muted)] font-semibold">Payment</p>
                    <p className="text-xs font-bold text-[var(--text-primary)] mt-1 capitalize truncate">
                      {order.paymentMethod?.replace('_', ' ') || 'Cash'}
                    </p>
                  </div>
                  <div className="bg-[var(--bg-card2)] rounded-lg p-2">
                    <p className="text-[10px] text-[var(--text-muted)] font-semibold">Date</p>
                    <p className="text-xs font-bold text-[var(--text-primary)] mt-1">
                      {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => setSelected(order)}
                    className="flex-1 h-9 bg-[var(--bg-card2)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold rounded-lg hover:bg-[var(--border)] transition-all">
                    View
                  </button>
                  {order.status === 'pending' && (
                    <button onClick={() => updateMutation.mutate({ id: order._id, status: 'accepted' })}
                      disabled={updateMutation.isPending}
                      className="flex-1 h-9 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg disabled:opacity-60 transition-all">
                      Accept
                    </button>
                  )}
                  {order.status === 'accepted' && (
                    <button onClick={() => updateMutation.mutate({ id: order._id, status: 'at_station' })}
                      disabled={updateMutation.isPending}
                      className="flex-1 h-9 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg disabled:opacity-60 transition-all">
                      Ready
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {orders.length > 0 && (
        <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] px-4 py-3">
          <p className="text-xs text-[var(--text-muted)]">
            Showing <span className="font-semibold text-[var(--text-primary)]">{(page - 1) * limit + 1}</span> to
            <span className="font-semibold text-[var(--text-primary)]"> {Math.min(page * limit, pagination.total)}</span> of
            <span className="font-semibold text-[var(--text-primary)]"> {pagination.total}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-card2)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, pagination.pages) }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-xs font-bold transition-all',
                    pageNum === page
                      ? 'bg-brand-500 text-white'
                      : 'border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-card2)]'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(pagination.pages, page + 1))}
              disabled={page === pagination.pages}
              className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-card2)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <div>
                <p className="text-xs font-mono text-[var(--text-muted)]">#{selected._id.slice(-6).toUpperCase()}</p>
                <p className="font-bold text-[var(--text-primary)]">
                  {formatCylinders(selected.cylinders)} · {ORDER_TYPE_LABELS[selected.orderType]}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-[10px] font-bold px-2 py-1 rounded-lg', STATUS_STYLE[selected.status])}>
                  {selected.status.replace('_', ' ').toUpperCase()}
                </span>
                <button onClick={() => setSelected(null)}
                  className="w-8 h-8 rounded-full bg-[var(--bg-card2)] flex items-center justify-center hover:bg-[var(--border)] transition-all">
                  <X className="w-4 h-4 text-[var(--text-primary)]" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-4">

              {/* Cylinders breakdown */}
              <div>
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Items</p>
                <div className="space-y-1.5">
                  {selected.cylinders?.map((c: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-[var(--text-muted)]">{c.size}kg × {c.quantity}</span>
                      <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(c.subtotal)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-2 border-t border-[var(--border)]">
                    <span className="text-[var(--text-muted)]">Delivery fee</span>
                    <span className="text-[var(--text-primary)]">{formatCurrency(selected.deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-[var(--text-primary)]">Total</span>
                    <span className="text-brand-500">{formatCurrency(selected.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Customer */}
              <div>
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Customer</p>
                <div className="flex items-center gap-3 bg-[var(--bg-card2)] rounded-xl p-3">
                  <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{selected.userId?.name || '—'}</p>
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                      <Phone className="w-3 h-3" />{selected.userId?.phone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery address */}
              <div>
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Delivery Address</p>
                <div className="flex items-start gap-2 bg-[var(--bg-card2)] rounded-xl p-3">
                  <MapPin className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
                  <p className="text-sm text-[var(--text-primary)]">
                    {selected.deliveryAddress?.street}, {selected.deliveryAddress?.city}
                  </p>
                </div>
              </div>

              {/* Rider */}
              {typeof selected.riderId === 'object' && selected.riderId && (
                <div>
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Rider</p>
                  <div className="flex items-center gap-3 bg-[var(--bg-card2)] rounded-xl p-3">
                    <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
                      <Bike className="w-4 h-4 text-brand-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{selected.riderId.name}</p>
                      <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                        <Phone className="w-3 h-3" />{selected.riderId.phone}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment + time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--bg-card2)] rounded-xl p-3">
                  <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-widest mb-1">Payment</p>
                  <p className="text-sm font-bold text-[var(--text-primary)] capitalize">
                    {selected.paymentMethod?.replace('_', ' ') || 'Cash'}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] capitalize">{selected.paymentStatus}</p>
                </div>
                <div className="bg-[var(--bg-card2)] rounded-xl p-3">
                  <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-widest mb-1">Placed</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{formatRelativeTime(selected.createdAt)}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {new Date(selected.createdAt).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {selected.notes && (
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-3">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">Customer Notes</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">{selected.notes}</p>
                </div>
              )}

              {/* Actions */}
              {selected.status === 'pending' && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => updateMutation.mutate({ id: selected._id, status: 'accepted' })}
                    disabled={updateMutation.isPending}
                    className="flex-1 h-10 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl disabled:opacity-60 transition-all">
                    Accept Order
                  </button>
                  <button onClick={() => updateMutation.mutate({ id: selected._id, status: 'cancelled', note: 'Station declined' })}
                    disabled={updateMutation.isPending}
                    className="flex-1 h-10 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl disabled:opacity-60 transition-all">
                    Decline
                  </button>
                </div>
              )}
              {selected.status === 'accepted' && (
                <button onClick={() => updateMutation.mutate({ id: selected._id, status: 'at_station' })}
                  disabled={updateMutation.isPending}
                  className="w-full h-10 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl disabled:opacity-60 transition-all">
                  Mark Ready for Pickup
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
