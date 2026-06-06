'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownLeft, Search } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Order Payments', value: 'order' },
  { label: 'Payouts',        value: 'payout' },
];

const PAY_STATUS_STYLE: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-700 border-amber-200',
  captured:   'bg-blue-50 text-blue-700 border-blue-200',
  released:   'bg-green-50 text-green-700 border-green-200',
  refunded:   'bg-gray-100 text-gray-600 border-gray-200',
};

const PAYOUT_STATUS_STYLE: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  paid:       'bg-green-50 text-green-700 border-green-200',
  failed:     'bg-red-50 text-red-700 border-red-200',
};

const METHOD_ICON: Record<string, string> = {
  mobile_money: '📱',
  card:         '💳',
  cash:         '💵',
};

export default function AdminPaymentsPage() {
  const [tab, setTab]       = useState('order');
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'payments', tab, page, status, search],
    queryFn: () => adminApi.getPayments({
      type: tab === 'payout' ? 'payout' : undefined,
      page,
      limit: 20,
      status: status || undefined,
    }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const records    = data?.records || [];
  const pagination = data?.pagination || { page: 1, total: 0, pages: 1 };

  // Stats from current page
  const totalAmount = records.reduce((s: number, r: any) => s + (r.totalAmount || r.amountGHS || 0), 0);

  const orderStatuses  = ['', 'pending', 'captured', 'released', 'refunded'];
  const payoutStatuses = ['', 'pending', 'processing', 'paid', 'failed'];
  const statusOptions  = tab === 'payout' ? payoutStatuses : orderStatuses;

  function handleTabChange(t: string) {
    setTab(t); setPage(1); setStatus(''); setSearch('');
  }

  return (
    <div className="px-4 lg:px-6 py-6 max-w-7xl mx-auto space-y-5 pb-10">

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => handleTabChange(value)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === value ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Records',  value: pagination.total,           color: 'text-gray-900' },
          { label: 'Page Volume',    value: formatCurrency(totalAmount), color: 'text-green-700' },
          { label: 'Current Page',   value: `${page} / ${pagination.pages}`, color: 'text-gray-700' },
          { label: 'Per Page',       value: 20,                         color: 'text-gray-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-400 font-semibold mb-1">{label}</p>
            <p className={`text-xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={tab === 'order' ? 'Search reference, customer...' : 'Search reference...'}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-1.5 bg-white border border-gray-200 rounded-xl p-1">
          {statusOptions.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                status === s ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              {s === '' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center shadow-sm">
          <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">No records found</p>
        </div>
      ) : tab === 'order' ? (
        <OrderPaymentsTable records={records} />
      ) : (
        <PayoutsTable records={records} />
      )}

      {/* Pagination */}
      {records.length > 0 && (
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
      )}
    </div>
  );
}

function OrderPaymentsTable({ records }: { records: any[] }) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Order ID', 'Customer', 'Station', 'Method', 'Amount', 'Pay Status', 'Reference', 'Date'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {records.map((r: any) => (
              <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-400">#{r._id.slice(-8).toUpperCase()}</td>
                <td className="px-4 py-3">
                  <p className="text-xs font-semibold text-gray-900">{r.userId?.name || '—'}</p>
                  <p className="text-[11px] text-gray-400">{r.userId?.phone}</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 max-w-[120px] truncate">{r.stationId?.name || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-700 capitalize">
                  {METHOD_ICON[r.paymentMethod] || '💳'} {r.paymentMethod?.replace('_', ' ')}
                </td>
                <td className="px-4 py-3 text-xs font-bold text-gray-900">{formatCurrency(r.totalAmount)}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full border', PAY_STATUS_STYLE[r.paymentStatus] || 'bg-gray-100 text-gray-500 border-gray-200')}>
                    {r.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-gray-400 max-w-[140px] truncate">
                  {r.paystackReference || '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden space-y-2">
        {records.map((r: any) => (
          <div key={r._id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-mono text-[11px] text-gray-400">#{r._id.slice(-8).toUpperCase()}</p>
                <p className="text-sm font-semibold text-gray-900">{r.userId?.name || '—'}</p>
              </div>
              <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full border', PAY_STATUS_STYLE[r.paymentStatus] || 'bg-gray-100 text-gray-500 border-gray-200')}>
                {r.paymentStatus}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">{formatCurrency(r.totalAmount)}</p>
              <p className="text-xs text-gray-400 capitalize">{METHOD_ICON[r.paymentMethod]} {r.paymentMethod?.replace('_', ' ')}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function PayoutsTable({ records }: { records: any[] }) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Type', 'Order', 'Amount', 'Status', 'Reference', 'Transfer Code', 'Failure Reason', 'Date'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {records.map((r: any) => (
              <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {r.recipientType === 'rider'
                      ? <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
                      : <ArrowDownLeft className="w-3.5 h-3.5 text-violet-500" />
                    }
                    <span className="text-xs font-semibold text-gray-700 capitalize">{r.recipientType}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">
                  {r.orderId?._id?.slice(-8).toUpperCase() || r.orderId?.toString().slice(-8).toUpperCase() || '—'}
                </td>
                <td className="px-4 py-3 text-xs font-bold text-gray-900">{formatCurrency(r.amountGHS)}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full border', PAYOUT_STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-500 border-gray-200')}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-gray-400 max-w-[130px] truncate">{r.paystackReference || '—'}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-gray-400 max-w-[130px] truncate">{r.paystackTransferCode || '—'}</td>
                <td className="px-4 py-3 text-xs text-red-500 max-w-[160px] truncate">{r.failureReason || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden space-y-2">
        {records.map((r: any) => (
          <div key={r._id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-1.5">
                {r.recipientType === 'rider'
                  ? <ArrowUpRight className="w-4 h-4 text-blue-500" />
                  : <ArrowDownLeft className="w-4 h-4 text-violet-500" />
                }
                <span className="text-sm font-semibold text-gray-900 capitalize">{r.recipientType} payout</span>
              </div>
              <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full border', PAYOUT_STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-500 border-gray-200')}>
                {r.status}
              </span>
            </div>
            <p className="text-sm font-bold text-gray-900">{formatCurrency(r.amountGHS)}</p>
            {r.failureReason && <p className="text-xs text-red-500 mt-1">{r.failureReason}</p>}
          </div>
        ))}
      </div>
    </>
  );
}
