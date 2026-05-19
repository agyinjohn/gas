'use client';
import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { Package, DollarSign, TrendingUp, ShoppingBag, CheckCircle, AlertCircle, Inbox, Clock, Percent, CreditCard } from 'lucide-react';
import { ordersApi, stationsApi } from '@/lib/api';
import { getSocket } from '@/hooks/useSocket';
import { Order } from '@/types';
import { formatCurrency, formatRelativeTime, ORDER_TYPE_LABELS, formatCylinders } from '@/lib/utils';
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
const P = { emerald: '#10b981', orange: '#f97316', blue: '#3b82f6', violet: '#8b5cf6', rose: '#f43f5e' };
const TT = { borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12, padding: '8px 14px', backgroundColor: 'var(--bg-card)' };

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
  
  // Status breakdowns
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const activeOrders = orders.filter((o) => ['accepted', 'at_station', 'en_route'].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === 'delivered');
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

  // Analytics calculations
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const completedRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const completionRate = orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0;
  const cancellationRate = orders.length > 0 ? (cancelledOrders.length / orders.length) * 100 : 0;

  // Payment methods breakdown
  const paymentMethods = orders.reduce((acc: any, o) => {
    const method = o.paymentMethod || 'cash';
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {});
  const paymentData = Object.entries(paymentMethods).map(([method, count]: any) => ({
    name: method.replace('_', ' ').toUpperCase(),
    value: count,
  }));

  // Most popular cylinder size
  const sizeStats: any = {};
  orders.forEach((o) => {
    if (o.cylinders) {
      o.cylinders.forEach((c: any) => {
        sizeStats[c.size] = (sizeStats[c.size] || 0) + c.quantity;
      });
    }
  });
  const topSize = Object.entries(sizeStats).sort((a: any, b: any) => b[1] - a[1])[0];

  // Hour-based distribution for peak times
  const hourlyData: any = {};
  orders.forEach((o) => {
    const hour = new Date(o.createdAt).getHours();
    hourlyData[hour] = (hourlyData[hour] || 0) + 1;
  });
  const peakHour = Object.entries(hourlyData).sort((a: any, b: any) => b[1] - a[1])[0];

  // Today's data
  const today = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today);
  const todayCompleted = todayOrders.filter((o) => o.status === 'delivered');
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const todayCommission = analyticsData?.today?.commission || 0;

  return (
    <div className="px-4 lg:px-6 py-6 max-w-7xl mx-auto pb-8">
      <div className="space-y-5">

        {/* Header Section */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Real-time insights and performance metrics</p>
        </div>

        {/* Top KPI Cards - 4 Column Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Today's Revenue" value={formatCurrency(todayRevenue)} icon={DollarSign} iconBg="bg-emerald-100 dark:bg-emerald-500/10" iconColor="text-emerald-500" valueColor="text-emerald-600 dark:text-emerald-400" />
          <KpiCard label="Completed Orders" value={completedOrders.length} icon={CheckCircle} iconBg="bg-green-100 dark:bg-green-500/10" iconColor="text-green-500" valueColor="text-green-600 dark:text-green-400" />
          <KpiCard label="Pending Orders" value={pendingOrders.length} icon={ShoppingBag} iconBg="bg-yellow-100 dark:bg-yellow-500/10" iconColor="text-yellow-500" valueColor="text-yellow-600 dark:text-yellow-400" />
          <KpiCard label="Avg Order Value" value={formatCurrency(avgOrderValue)} icon={TrendingUp} iconBg="bg-violet-100 dark:bg-violet-500/10" iconColor="text-violet-500" valueColor="text-violet-600 dark:text-violet-400" />
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Status Overview */}
          <div className="space-y-5">
            {/* Status Cards - Full Width 3 Column */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Order Status Overview</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Active', count: activeOrders.length, icon: Clock, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10', borderColor: 'border-blue-200 dark:border-blue-500/20' },
                  { label: 'Pending', count: pendingOrders.length, icon: Inbox, color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10', borderColor: 'border-yellow-200 dark:border-yellow-500/20' },
                  { label: 'Completed', count: completedOrders.length, icon: CheckCircle, color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10', borderColor: 'border-green-200 dark:border-green-500/20' },
                ].map(({ label, count, icon: Icon, color, borderColor }) => (
                  <div key={label} className={`bg-[var(--bg-card)] rounded-2xl border ${borderColor} p-4 text-center hover:shadow-md transition-shadow`}>
                    <Icon className={`w-5 h-5 ${color.split(' ')[0]} mx-auto mb-2`} />
                    <p className={`text-2xl font-black ${color.split(' ')[0]}`}>{count}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Distribution Pie */}
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 shadow-sm">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Distribution</p>
                <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">Order Status Mix</p>
              </div>
              {orders.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-8">No orders yet</p>
              ) : (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <Pie
                        data={[
                          { name: 'Active', value: activeOrders.length, color: P.blue },
                          { name: 'Pending', value: pendingOrders.length, color: P.orange },
                          { name: 'Completed', value: completedOrders.length, color: P.emerald },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={2}
                        label={false}
                      >
                        {[
                          { name: 'Active', value: activeOrders.length, color: P.blue },
                          { name: 'Pending', value: pendingOrders.length, color: P.orange },
                          { name: 'Completed', value: completedOrders.length, color: P.emerald },
                        ].map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TT} formatter={(v: any) => [v, 'Orders']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Active', value: activeOrders.length, color: P.blue },
                      { label: 'Pending', value: pendingOrders.length, color: P.orange },
                      { label: 'Completed', value: completedOrders.length, color: P.emerald },
                    ].map(({ label, value, color }) => {
                      const pct = orders.length > 0 ? (value / orders.length * 100).toFixed(0) : '0';
                      return (
                        <div key={label} className="text-center p-2 bg-[var(--bg-card2)] rounded-xl">
                          <p className="text-xs font-bold text-[var(--text-primary)]">{pct}%</p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Financial & Performance */}
          <div className="space-y-5">
            {/* Net Revenue Card - Top Priority - Enhanced */}
            <div className="bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-500/10 dark:to-blue-500/10 border border-violet-100 dark:border-violet-500/20 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">Today's Net Revenue</p>
                  <p className="text-4xl font-black text-violet-700 dark:text-violet-300 mt-2">
                    {formatCurrency(todayRevenue - todayCommission)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-violet-300 dark:text-violet-500/40" />
              </div>
              <div className="space-y-2 text-xs text-violet-600 dark:text-violet-400">
                <div className="flex justify-between">
                  <span>Gross Revenue:</span>
                  <span className="font-semibold">{formatCurrency(todayRevenue)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-violet-200 dark:border-violet-500/20">
                  <span>Commission:</span>
                  <span className="font-semibold">−{formatCurrency(todayCommission)}</span>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Performance</h2>
              <div className="grid grid-cols-2 gap-3">
                {/* Completion Rate */}
                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Completion</p>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-2xl font-black text-green-600 dark:text-green-400">{completionRate.toFixed(1)}%</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-2 font-medium">{completedOrders.length} of {orders.length}</p>
                </div>

                {/* Cancellation Rate */}
                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Cancellations</p>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <p className="text-2xl font-black text-red-600 dark:text-red-400">{cancellationRate.toFixed(1)}%</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-2 font-medium">{cancelledOrders.length} orders</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Width - Revenue Trend */}
        <ChartCard title="Revenue & Orders Trend" sub="Last 7 days - Delivered orders only">
          {analyticsLoading || !analyticsData?.dailyChart ? (
            <div className="h-56 bg-[var(--bg-card2)] rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
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
          <div className="flex items-center gap-5 mt-1 justify-center">
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: P.emerald }} /><span className="text-[11px] text-[var(--text-muted)]">Revenue</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: P.orange }} /><span className="text-[11px] text-[var(--text-muted)]">Orders</span></div>
          </div>
        </ChartCard>

        {/* Cylinder Sizes */}
        <ChartCard title="Cylinder Sizes" sub="Units sold this period">
          {analyticsLoading || !analyticsData?.sizeSplit || analyticsData.sizeSplit.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analyticsData.sizeSplit} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={40}>
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
        </ChartCard>

        {/* Commission Notice */}
        {todayCommission > 0 && (
          <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-2xl p-5">
            <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold uppercase mb-1">Platform Commission (Today)</p>
            <p className="text-2xl font-black text-orange-700 dark:text-orange-300">− {formatCurrency(todayCommission)}</p>
            <p className="text-xs text-orange-500 dark:text-orange-400 mt-2">Deducted before payout</p>
          </div>
        )}

        {/* Daily Breakdown Table - Full Width */}
        {analyticsData?.dailyChart && analyticsData.dailyChart.length > 0 && (
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="p-5 border-b border-[var(--border)] bg-gradient-to-r from-[var(--bg-card)] to-[var(--bg-card2)]">
              <p className="text-sm font-bold text-[var(--text-primary)]">Daily Performance Breakdown</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Last 7 days - Orders, Revenue & Average Value per day</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-card2)] border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-muted)]">Date</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-muted)]">
                      <div className="flex items-center justify-end gap-1">
                        <Package className="w-3 h-3" />
                        <span>Orders</span>
                      </div>
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-muted)]">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="w-3 h-3" />
                        <span>Revenue</span>
                      </div>
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-muted)]">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>Avg Value</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {analyticsData.dailyChart.map((row: any, i: number) => {
                    const avgValue = row.orders > 0 ? row.revenue / row.orders : 0;
                    return (
                      <tr key={row._id} className="hover:bg-[var(--bg-card2)] transition-colors">
                        <td className="px-5 py-3 text-[var(--text-primary)] font-semibold text-sm">
                          {new Date(row._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-lg text-xs font-bold">
                            {row.orders}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-lg text-xs font-bold">
                            GH₵{Number(row.revenue).toFixed(0)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-[var(--text-muted)] font-semibold text-sm">
                            GH₵{Number(avgValue).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 bg-[var(--bg-card2)] border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
              <p>📊 Tip: Monitor daily trends to identify patterns and optimize staffing and inventory management</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, iconBg, iconColor, valueColor }: {
  label: string; value: string | number; icon: React.ElementType; iconBg: string; iconColor: string; valueColor: string;
}) {
  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg} mb-3`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <p className={`text-2xl font-black leading-none mb-1 ${valueColor}`}>{value}</p>
      <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
    </div>
  );
}

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-bold text-[var(--text-primary)]">{title}</p>
        {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}
