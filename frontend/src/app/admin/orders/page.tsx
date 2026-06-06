'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, Search, ChevronLeft, ChevronRight,
  X, MapPin, User, Bike, Store, CreditCard, Clock,
  XCircle, RotateCcw, AlertTriangle,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_STYLE: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-700 border-amber-200',
  accepted:   'bg-blue-50 text-blue-700 border-blue-200',
  at_station: 'bg-violet-50 text-violet-700 border-violet-200',
  en_route:   'bg-orange-50 text-orange-700 border-orange-200',
  delivered:  'bg-green-50 text-green-700 border-green-200',
  cancelled:  'bg-red-50 text-red-700 border-red-200',
  scheduled:  'bg-cyan-50 text-cyan-700 border-cyan-200',
};

const PAY_STYLE: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-700',
  captured:  'bg-blue-50 text-blue-700',
  released:  'bg-green-50 text-green-700',
  refunded:  'bg-gray-100 text-gray-600',
};

const STATUSES = ['', 'pending', 'accepted', 'at_station', 'en_route', 'delivered', 'cancelled'];

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage]           = useState(1);
  const [status, setStatus]       = useState('');
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel]     = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', page, status, search],
    queryFn: () => adminApi.getOrders({ page, limit: 20, status: status || undefined, search: search || undefined }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.cancelOrder(id, reason),
    onSuccess: () => {
      toast.success('Order cancelled');
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setSelected(null); setShowCancel(false); setCancelReason('');
    },
    onError: () => toast.error('Failed to cancel order'),
  });

  const refundMutation = useMutation({
    mutationFn: (id: string) => adminApi.refundOrder(id),
    onSuccess: () => {
      toast.success('Refund initiated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setSelected(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Refund failed'),
  });

  const orders     = data?.orders || [];
  const pagination = data?.pagination || { page: 1, total: 0, pages: 1 };
  const mutating   = cancelMutation.isPending || refundMutation.isPending;

  return (
    <div className="px-4 lg:px-6 py-6 max-w-7xl mx-auto space-y-5 pb-10">

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search order ID, customer, station..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-1.5 bg-white border border-gray-200 rounded-xl p-1 overflow-x-auto">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                status === s ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              {s === '' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center shadow-sm">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">No orders found</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Order', 'Customer', 'Station', 'Items', 'Amount', 'Payment', 'Status', 'Date', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order: any) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      #{order._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-xs">{order.userId?.name || '—'}</p>
                      <p className="text-[11px] text-gray-400">{order.userId?.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 max-w-[120px] truncate">
                      {order.stationId?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                      {order.cylinders?.map((c: any) => `${c.quantity}×${c.size}kg`).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-900 whitespace-nowrap">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-[10px] font-bold px-2 py-1 rounded-lg', PAY_STYLE[order.paymentStatus] || 'bg-gray-100 text-gray-500')}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full border', STATUS_STYLE[order.status])}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatRelativeTime(order.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setSelected(order); setShowCancel(false); setCancelReason(''); }}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-all"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {orders.map((order: any) => (
              <div key={order._id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-mono text-[11px] text-gray-400">#{order._id.slice(-8).toUpperCase()}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{order.userId?.name || '—'}</p>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full border', STATUS_STYLE[order.status])}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(order.totalAmount)}</p>
                  <button
                    onClick={() => { setSelected(order); setShowCancel(false); setCancelReason(''); }}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-900">{(page - 1) * 20 + 1}</span>–<span className="font-semibold text-gray-900">{Math.min(page * 20, pagination.total)}</span> of <span className="font-semibold text-gray-900">{pagination.total}</span>
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const p = pagination.pages <= 5 ? i + 1 : Math.max(1, page - 2) + i;
                if (p > pagination.pages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={cn('w-8 h-8 rounded-lg text-xs font-bold transition-all',
                      p === page ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                    )}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative ml-auto w-full max-w-md h-full bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>

            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div>
                <p className="font-mono text-xs text-gray-400">#{selected._id.slice(-8).toUpperCase()}</p>
                <p className="font-bold text-gray-900 mt-0.5">
                  {selected.cylinders?.map((c: any) => `${c.quantity}×${c.size}kg`).join(', ')} · {selected.orderType}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border', STATUS_STYLE[selected.status])}>
                  {selected.status.replace(/_/g, ' ')}
                </span>
                <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Amount */}
              <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-semibold">Total Amount</p>
                  <p className="text-2xl font-black text-gray-900 mt-0.5">{formatCurrency(selected.totalAmount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-semibold">Delivery Fee</p>
                  <p className="text-sm font-bold text-gray-700 mt-0.5">{formatCurrency(selected.deliveryFee)}</p>
                </div>
              </div>

              {/* People */}
              {[
                { label: 'Customer', icon: User,  name: selected.userId?.name, sub: selected.userId?.phone },
                { label: 'Station',  icon: Store, name: selected.stationId?.name, sub: selected.stationId?.address },
                { label: 'Rider',    icon: Bike,  name: selected.riderId?.name || 'Unassigned', sub: selected.riderId?.phone },
              ].map(({ label, icon: Icon, name, sub }) => (
                <div key={label} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{name || '—'}</p>
                    {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
                  </div>
                </div>
              ))}

              {/* Address */}
              <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Delivery Address</p>
                  <p className="text-sm text-gray-800">{selected.deliveryAddress?.street}, {selected.deliveryAddress?.city}</p>
                </div>
              </div>

              {/* Payment + time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Payment</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{selected.paymentMethod?.replace('_', ' ')}</p>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-lg mt-1 inline-block', PAY_STYLE[selected.paymentStatus] || 'bg-gray-100 text-gray-500')}>
                    {selected.paymentStatus}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Placed</p>
                  <p className="text-sm font-semibold text-gray-900">{formatRelativeTime(selected.createdAt)}</p>
                  <p className="text-xs text-gray-400">{new Date(selected.createdAt).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              {/* Cancellation info */}
              {selected.status === 'cancelled' && selected.cancellationReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-700 mb-1">Cancelled by {selected.cancelledBy}</p>
                  <p className="text-xs text-red-600">{selected.cancellationReason}</p>
                </div>
              )}

              {/* Notes */}
              {selected.notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-blue-700 mb-1">Customer Notes</p>
                  <p className="text-xs text-blue-600">{selected.notes}</p>
                </div>
              )}

              {/* Cancel reason input */}
              {showCancel && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cancellation Reason</label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason for cancellation..."
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  />
                </div>
              )}
            </div>

            {/* Drawer actions */}
            <div className="px-5 py-4 border-t border-gray-100 space-y-2 shrink-0">
              {!['delivered', 'cancelled'].includes(selected.status) && !showCancel && (
                <button
                  onClick={() => setShowCancel(true)}
                  className="w-full h-11 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold border border-red-200 transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Cancel Order
                </button>
              )}
              {showCancel && (
                <div className="flex gap-2">
                  <button onClick={() => setShowCancel(false)} className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all">
                    Back
                  </button>
                  <button
                    onClick={() => cancelMutation.mutate({ id: selected._id, reason: cancelReason || 'Cancelled by admin' })}
                    disabled={mutating}
                    className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                  >
                    {mutating ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><AlertTriangle className="w-4 h-4" /> Confirm Cancel</>}
                  </button>
                </div>
              )}
              {selected.status === 'delivered' && !['refunded'].includes(selected.paymentStatus) && selected.paymentMethod !== 'cash' && (
                <button
                  onClick={() => refundMutation.mutate(selected._id)}
                  disabled={mutating}
                  className="w-full h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                >
                  {mutating ? <span className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-600 rounded-full animate-spin" /> : <><RotateCcw className="w-4 h-4" /> Issue Refund</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
