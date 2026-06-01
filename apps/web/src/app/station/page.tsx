'use client';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  DollarSign, TrendingUp, ShoppingBag, CheckCircle,
  AlertCircle, Clock, Package, ArrowUpRight,
} from 'lucide-react';
import { ordersApi, stationsApi } from '@/lib/api';
import { getSocket } from '@/hooks/useSocket';
import { Order } from '@/types';
import { formatCurrency, formatCylinders, ORDER_TYPE_LABELS } from '@/lib/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

function getStationId(): string {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('gasgo_token') : null;
    if (!token) return '';
    return JSON.parse(atob(token.split('.')[1])).stationId || '';
  } catch { return ''; }
}

const STATION_ID = getStationId();
const P = { emerald: '#10b981', orange: '#f97316', blue: '#3b82f6', violet: '#8b5cf6' };
const TT = {
  borderRadius: 10, border: 'none',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  fontSize: 12, padding: '8px 12px',
  backgroundColor: 'var(--bg-card)',
};

export default function StationDashboardPage() {
  const queryClient = useQueryClient();

  const { data: ordersData } = useQuery({
    queryKey: ['station', 'orders'],
    queryFn: () => ordersApi.list({ stationId: STATION_ID, limit: 100 }).then((r) => r.data.orders as Order[]),
    refetchInterval: 30000,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['station', 'analytics'],
    queryFn: () => stationsApi.getAnalytics(STATION_ID).then((r) => r.data.analytics),
  });

  useEffect(() => {
    const socket = getSocket();
    socket.on('order:incoming', (order: any) => {
      queryClient.invalidateQueries({ queryKey: ['station', 'orders'] });
      toast(`🔔 New order: ${formatCylinders(order.cylinders)} ${order.orderType}`, { duration: 8000 });
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    });
    return () => { socket.off('order:incoming'); };
  }, [queryClient]);

  const orders = ordersData || [];
  const pendingOrders   = orders.filter((o) => o.status === 'pending');
  const activeOrders    = orders.filter((o) => ['accepted', 'at_station', 'en_route'].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === 'delivered');
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

  const totalRevenue     = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const avgOrderValue    = orders.length > 0 ? totalRevenue / orders.length : 0;
  const completionRate   = orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0;
  const cancellationRate = orders.length > 0 ? (cancelledOrders.length / orders.length) * 100 : 0;

  const today           = new Date().toDateString();
  const todayOrders     = orders.filter((o) => new Date(o.createdAt).toDateString() === today);
  const todayRevenue    = todayOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const todayCommission = analyticsData?.today?.commission || 0;
  const todayNet        = todayRevenue - todayCommission;

  return (
    <div className="px-4 lg:px-6 py-6 max-w-7xl mx-auto space-y-6 pb-10">

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-black text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Real-time performance overview</p>
      </div>

      {/* ── Hero: Today's Revenue ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-6 text-white shadow-xl shadow-brand-500/20">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-100">Today's Net Revenue</p>
            <p className="text-5xl font-black mt-2 leading-none">{formatCurrency(todayNet)}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-brand-100">
              <span>Gross: <span className="font-semibold text-white">{formatCurrency(todayRevenue)}</span></span>
              <span className="w-px h-4 bg-brand-400/40" />
              <span>Commission: <span className="font-semibold text-white">−{formatCurrency(todayCommission)}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:flex-col sm:items-end">
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-black">{todayOrders.length}</p>
              <p className="text-xs text-violet-200 mt-0.5">Today's Orders</p>
            </div>
          </div>
        </div>
        {/* decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -bottom-12 -right-4 w-56 h-56 bg-white/5 rounded-full" />
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          color="emerald"
        />
        <KpiCard
          label="Avg Order Value"
          value={formatCurrency(avgOrderValue)}
          icon={TrendingUp}
          color="blue"
        />
        <KpiCard
          label="Completion Rate"
          value={`${completionRate.toFixed(1)}%`}
          icon={CheckCircle}
          color="green"
          sub={`${completedOrders.length} of ${orders.length} orders`}
        />
        <KpiCard
          label="Cancellation Rate"
          value={`${cancellationRate.toFixed(1)}%`}
          icon={AlertCircle}
          color="red"
          sub={`${cancelledOrders.length} cancelled`}
        />
      </div>

      {/* ── Live Order Status ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Live Order Status</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pending',   count: pendingOrders.length,   icon: ShoppingBag, bg: 'bg-yellow-50 dark:bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-500/20' },
            { label: 'Active',    count: activeOrders.length,    icon: Clock,       bg: 'bg-blue-50 dark:bg-blue-500/10',     text: 'text-blue-600 dark:text-blue-400',     border: 'border-blue-200 dark:border-blue-500/20'   },
            { label: 'Completed', count: completedOrders.length, icon: CheckCircle, bg: 'bg-green-50 dark:bg-green-500/10',   text: 'text-green-600 dark:text-green-400',   border: 'border-green-200 dark:border-green-500/20' },
            { label: 'Cancelled', count: cancelledOrders.length, icon: AlertCircle, bg: 'bg-red-50 dark:bg-red-500/10',       text: 'text-red-600 dark:text-red-400',       border: 'border-red-200 dark:border-red-500/20'     },
          ].map(({ label, count, icon: Icon, bg, text, border }) => (
            <div key={label} className={`${bg} border ${border} rounded-2xl p-4 flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${text}`} />
              </div>
              <div>
                <p className={`text-2xl font-black leading-none ${text}`}>{count}</p>
                <p className={`text-xs font-semibold mt-0.5 ${text} opacity-80`}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Revenue & Orders Trend — 2/3 width */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 shadow-sm">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">Revenue & Orders Trend</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Last 7 days — delivered orders only</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: P.emerald }} /><span className="text-[11px] text-[var(--text-muted)]">Revenue</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: P.orange }} /><span className="text-[11px] text-[var(--text-muted)]">Orders</span></div>
            </div>
          </div>
          {analyticsLoading || !analyticsData?.dailyChart ? (
            <div className="h-52 bg-[var(--bg-card2)] rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={analyticsData.dailyChart} margin={{ top: 5, right: 0, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={P.emerald} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={P.emerald} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOrd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={P.orange} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={P.orange} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="_id" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="r" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="o" orientation="right" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TT} formatter={(v: any, name: string) => name === 'revenue' ? [`GH₵${Number(v).toFixed(0)}`, 'Revenue'] : [v, 'Orders']} />
                <Area yAxisId="r" type="monotone" dataKey="revenue" stroke={P.emerald} strokeWidth={2.5} fill="url(#gRev)" dot={false} />
                <Area yAxisId="o" type="monotone" dataKey="orders" stroke={P.orange} strokeWidth={2.5} fill="url(#gOrd)" dot={{ r: 4, fill: P.orange, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cylinder Sizes — 1/3 width */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 shadow-sm">
          <div className="mb-5">
            <p className="text-sm font-bold text-[var(--text-primary)]">Cylinder Sizes</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Units sold this period</p>
          </div>
          {analyticsLoading || !analyticsData?.sizeSplit?.length ? (
            <div className="h-52 bg-[var(--bg-card2)] rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={analyticsData.sizeSplit} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="_id" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TT} formatter={(v: any) => [v, 'Units']} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {(analyticsData.sizeSplit || []).map((_: any, i: number) => (
                    <Cell key={i} fill={[P.orange, P.blue, P.violet, P.emerald][i % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Daily Breakdown Table ── */}
      {analyticsData?.dailyChart?.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">Daily Breakdown</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Last 7 days performance</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-card2)] border-b border-[var(--border)]">
                <tr>
                  {[
                    { label: 'Date',      icon: null },
                    { label: 'Orders',    icon: Package },
                    { label: 'Revenue',   icon: DollarSign },
                    { label: 'Avg Value', icon: TrendingUp },
                  ].map(({ label, icon: Icon }) => (
                    <th key={label} className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-muted)]">
                      <div className="flex items-center gap-1.5">
                        {Icon && <Icon className="w-3 h-3" />}
                        {label}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {analyticsData.dailyChart.map((row: any) => {
                  const avg = row.orders > 0 ? row.revenue / row.orders : 0;
                  return (
                    <tr key={row._id} className="hover:bg-[var(--bg-card2)] transition-colors">
                      <td className="px-5 py-3 font-semibold text-sm text-[var(--text-primary)]">
                        {new Date(row._id).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-lg text-xs font-bold">
                          {row.orders}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-bold">
                          GH₵{Number(row.revenue).toFixed(0)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-[var(--text-muted)]">
                        GH₵{Number(avg).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string; icon: React.ElementType; color: string; sub?: string;
}) {
  const styles: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    blue:    'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    green:   'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400',
    red:     'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
    violet:  'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
  };
  const cls = styles[color] || styles.blue;
  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${cls}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className={`text-2xl font-black leading-none ${cls.split(' ').slice(2).join(' ')}`}>{value}</p>
      <p className="text-xs font-semibold text-[var(--text-primary)] mt-1">{label}</p>
      {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}
