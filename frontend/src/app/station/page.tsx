'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Package, DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle, Inbox } from 'lucide-react';
import { ordersApi, stationsApi } from '@/lib/api';
import { getSocket } from '@/hooks/useSocket';
import { Order } from '@/types';
import { formatCurrency, formatRelativeTime, ORDER_TYPE_LABELS, formatCylinders } from '@/lib/utils';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'orders'>('overview');

  const { data: ordersData } = useQuery({
    queryKey: ['station', 'orders'],
    queryFn: () => ordersApi.list({ stationId: STATION_ID, limit: 100 }).then((r) => r.data.orders as Order[]),
    refetchInterval: 30000,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['station', 'analytics'],
    queryFn: () => stationsApi.getAnalytics(STATION_ID).then((r) => r.data.analytics),
    enabled: activeTab === 'overview',
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
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const activeOrders = orders.filter((o) => ['accepted', 'at_station', 'en_route'].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === 'delivered');

  const analytics = analyticsData;

  return (
    <div className="px-4 lg:px-6 py-6 max-w-6xl mx-auto pb-8">

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-[var(--bg-card2)] p-1 rounded-xl w-fit">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'orders', label: 'Orders' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === key ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}>{label}</button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-5">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Today's Orders" value={analytics?.today?.count || 0} icon={Package} iconBg="bg-orange-100 dark:bg-orange-500/10" iconColor="text-orange-500" valueColor="text-orange-600 dark:text-orange-400" />
            <KpiCard label="Today's Revenue" value={formatCurrency(analytics?.today?.revenue || 0)} icon={DollarSign} iconBg="bg-emerald-100 dark:bg-emerald-500/10" iconColor="text-emerald-500" valueColor="text-emerald-600 dark:text-emerald-400" />
            <KpiCard label="Avg Delivery Time" value={`${Math.round(analytics?.avgDeliveryMinutes || 0)}m`} icon={Clock} iconBg="bg-blue-100 dark:bg-blue-500/10" iconColor="text-blue-500" valueColor="text-blue-600 dark:text-blue-400" />
            <KpiCard label="This Week" value={analytics?.period?.count || 0} icon={TrendingUp} iconBg="bg-violet-100 dark:bg-violet-500/10" iconColor="text-violet-500" valueColor="text-violet-600 dark:text-violet-400" />
          </div>

          {/* Revenue & Orders Trend */}
          <ChartCard title="Revenue & Orders — Last 7 Days" sub="Delivered orders only">
            {analyticsLoading || !analytics?.dailyChart ? (
              <div className="h-56 bg-[var(--bg-card2)] rounded-lg animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={analytics.dailyChart} margin={{ top: 5, right: 0, left: -28, bottom: 0 }}>
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

          {/* Cylinder Sizes + Order Type Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Popular Cylinder Sizes" sub="Units sold this week">
              {analyticsLoading || !analytics?.sizeSplit || analytics.sizeSplit.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-8">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={analytics.sizeSplit} margin={{ top: 0, right: 0, left: -28, bottom: 0 }} barSize={44}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="_id" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={TT} formatter={(v: any) => [v, 'Units']} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {(analytics.sizeSplit || []).map((_: any, i: number) => (
                        <Cell key={i} fill={[P.orange, P.blue, P.violet, P.emerald][i % 4]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Order Types" sub="Delivery vs Exchange">
              {analyticsLoading || !analytics?.orderTypeSplit || analytics.orderTypeSplit.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-8">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {analytics.orderTypeSplit.map((ot: any, i: number) => {
                    const total = analytics.orderTypeSplit.reduce((a: number, x: any) => a + x.count, 0);
                    const pct = total > 0 ? Math.round((ot.count / total) * 100) : 0;
                    const colors = [P.orange, P.blue, P.emerald];
                    return (
                      <div key={ot._id}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[i % 3] }} />
                            <span className="font-medium text-[var(--text-primary)] capitalize">{ORDER_TYPE_LABELS[ot._id] || ot._id}</span>
                          </div>
                          <span className="text-[var(--text-muted)] font-semibold">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-[var(--bg-card2)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colors[i % 3] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>
          </div>

          {/* Commission Info */}
          {analytics?.today?.commission > 0 && (
            <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-2xl p-5">
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Platform Commission (Today)</p>
              <p className="text-lg font-bold text-orange-700 dark:text-orange-300 mt-1">− {formatCurrency(analytics.today.commission)}</p>
              <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">Deducted before payout</p>
            </div>
          )}

        </div>
      ) : (
        <div className="space-y-4">

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Incoming', count: pendingOrders.length, icon: Inbox, color: 'text-yellow-600 dark:text-yellow-400' },
              { label: 'Active', count: activeOrders.length, icon: Clock, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Completed', count: completedOrders.length, icon: CheckCircle, color: 'text-green-600 dark:text-green-400' },
            ].map(({ label, count, icon: Icon, color }) => (
              <div key={label} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 shadow-sm text-center">
                <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
                <p className={`text-2xl font-black ${color}`}>{count}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Orders by Status */}
          {[
            { key: 'pending', label: 'Incoming Orders', orders: pendingOrders, icon: Inbox, color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10' },
            { key: 'active', label: 'Active Orders', orders: activeOrders, icon: Clock, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' },
            { key: 'completed', label: 'Completed Orders', orders: completedOrders, icon: CheckCircle, color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10' },
          ].map(({ key, label, orders, icon: Icon, color }) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${color.split(' ')[1]}`}>
                  <Icon className={`w-3.5 h-3.5 ${color.split(' ')[0]}`} />
                </div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">{label}</h2>
                <span className="ml-auto text-xs text-[var(--text-muted)] font-medium">{orders.length}</span>
              </div>
              <div className="space-y-2">
                {orders.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] text-center py-3">No orders</p>
                ) : (
                  orders.map((order) => (
                    <StationOrderCard key={order._id} order={order} onUpdate={() =>
                      queryClient.invalidateQueries({ queryKey: ['station', 'orders'] })
                    } />
                  ))
                )}
              </div>
            </div>
          ))}

        </div>
      )}
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

function StationOrderCard({ order, onUpdate }: { order: Order; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleMarkReady = async () => {
    setLoading(true);
    try {
      toast.success('Marked as ready for pickup');
      onUpdate();
    } catch {
      toast.error('Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const rider = typeof order.riderId === 'object' ? order.riderId : null;

  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 shadow-sm text-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-[var(--text-primary)]">{formatCylinders(order.cylinders)} · {ORDER_TYPE_LABELS[order.orderType]}</p>
          <p className="text-xs text-[var(--text-muted)] font-mono">#{order._id.slice(-6).toUpperCase()}</p>
        </div>
        <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">{order.status}</span>
      </div>
      <div className="text-xs text-[var(--text-muted)] space-y-1 mb-2">
        {rider && <p>Rider: {(rider as any).name}</p>}
        <p>Deliver to: {order.deliveryAddress.street}, {order.deliveryAddress.city}</p>
        <p>{formatRelativeTime(order.createdAt)}</p>
      </div>
      {order.status === 'accepted' && (
        <button
          onClick={handleMarkReady}
          disabled={loading}
          className="w-full text-center text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 py-2 rounded-xl hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
        >
          {loading ? 'Updating...' : 'Mark Ready for Pickup'}
        </button>
      )}
    </div>
  );
}
