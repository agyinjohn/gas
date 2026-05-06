'use client';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';
import { AlertCircle, TrendingUp, TrendingDown, Package, DollarSign, Store, Bike } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { DashboardMetrics } from '@/types';
import { Skeleton } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';

export default function AdminDashboardPage() {
  return (
    <div className="px-4 lg:px-6 py-6 max-w-6xl mx-auto">
      <OverviewTab />
    </div>
  );
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const P = {
  orange:  '#f97316',
  emerald: '#10b981',
  blue:    '#3b82f6',
  violet:  '#8b5cf6',
  rose:    '#f43f5e',
  amber:   '#f59e0b',
  sky:     '#0ea5e9',
  teal:    '#14b8a6',
};

const TT = {
  borderRadius: 12,
  border: 'none',
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  fontSize: 12,
  padding: '8px 14px',
  backgroundColor: '#fff',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function GrowthChip({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[10px] text-gray-400 font-medium">No prev data</span>;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
      up ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
    }`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(value)}%
    </span>
  );
}

function KpiCard({ label, value, sub, icon: Icon, iconBg, iconColor, valueColor, growth }: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; iconBg: string; iconColor: string; valueColor: string; growth?: number | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        {growth !== undefined && <GrowthChip value={growth ?? null} />}
      </div>
      <p className={`text-2xl font-black leading-none mb-1 ${valueColor}`}>{value}</p>
      <p className="text-xs font-semibold text-gray-700">{label}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function ChartCard({ title, sub, right, children }: {
  title: string; sub?: string; right?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {right && <div>{right}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: metrics, isLoading: mLoading } = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => adminApi.getMetrics().then((r) => r.data.metrics as DashboardMetrics),
    refetchInterval: 60000,
  });

  const { data: analytics, isLoading: aLoading } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => adminApi.getWeeklyTrend().then((r) => r.data),
    refetchInterval: 60000,
  });

  if (mLoading || aLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const trend       = analytics?.trend        || [];
  const growth      = analytics?.growth;
  const fulfillment = analytics?.fulfillment;
  const cylinders   = analytics?.cylinderSizes  || [];
  const payments    = analytics?.paymentMethods || [];
  const topStations = analytics?.topStations    || [];
  const topRiders   = analytics?.topRiders      || [];
  const hourlyData  = analytics?.hourlyData     || [];

  const weekOrders  = trend.reduce((a: number, d: any) => a + d.orders, 0);
  const weekRevenue = trend.reduce((a: number, d: any) => a + d.revenue, 0);
  const peakHour    = hourlyData.reduce(
    (a: any, b: any) => b.orders > a.orders ? b : a,
    { hour: '--', orders: 0 }
  );

  const fulfillRate = fulfillment?.rate ?? 0;

  // Payment pie data
  const payPie = payments.map((p: any, i: number) => ({
    name: p.method,
    value: p.count,
    fill: [P.orange, P.blue, P.teal][i % 3],
  }));

  return (
    <div className="space-y-5 pb-8">

      {/* ── Alerts ── */}
      {(metrics.stations.pending > 0 || metrics.riders.pendingKYC > 0) && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700 space-y-0.5">
            {metrics.stations.pending > 0 && (
              <p className="font-semibold">{metrics.stations.pending} station{metrics.stations.pending > 1 ? 's' : ''} awaiting approval</p>
            )}
            {metrics.riders.pendingKYC > 0 && (
              <p className="font-semibold">{metrics.riders.pendingKYC} rider{metrics.riders.pendingKYC > 1 ? 's' : ''} awaiting KYC</p>
            )}
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Today's Orders"  value={metrics.orders.today}                        sub={`${metrics.orders.total} all time`}                              icon={Package}   iconBg="bg-orange-100"  iconColor="text-orange-500"  valueColor="text-orange-600"  growth={growth?.ordersGrowth} />
        <KpiCard label="Month Revenue"   value={formatCurrency(metrics.financials.monthGMV)} sub={`${formatCurrency(metrics.financials.monthCommission)} commission`} icon={DollarSign} iconBg="bg-emerald-100" iconColor="text-emerald-500" valueColor="text-emerald-600" growth={growth?.revenueGrowth} />
        <KpiCard label="Active Stations" value={metrics.stations.active}                     sub={`${metrics.stations.pending} pending`}                            icon={Store}     iconBg="bg-blue-100"   iconColor="text-blue-500"   valueColor="text-blue-600" />
        <KpiCard label="Active Riders"   value={metrics.riders.active}                       sub={`${metrics.riders.pendingKYC} pending KYC`}                       icon={Bike}      iconBg="bg-violet-100" iconColor="text-violet-500" valueColor="text-violet-600" />
      </div>

      {/* ── Revenue & Orders Trend ── */}
      <ChartCard
        title="Revenue & Orders — Last 7 Days"
        sub="Delivered orders only"
        right={
          <div className="text-right">
            <p className="text-sm font-black text-gray-900">{weekOrders} orders</p>
            <p className="text-xs text-emerald-600 font-semibold">{formatCurrency(weekRevenue)}</p>
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trend} margin={{ top: 5, right: 0, left: -28, bottom: 0 }}>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="r" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="o" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TT} formatter={(v: any, name: string) =>
              name === 'revenue' ? [`GH₵${Number(v).toFixed(0)}`, 'Revenue'] : [v, 'Orders']
            } />
            <Area yAxisId="r" type="monotone" dataKey="revenue" stroke={P.emerald} strokeWidth={2.5} fill="url(#gRev)" dot={false} />
            <Area yAxisId="o" type="monotone" dataKey="orders"  stroke={P.orange}  strokeWidth={2.5} fill="url(#gOrd)" dot={{ r: 4, fill: P.orange, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-5 mt-1 justify-center">
          <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: P.emerald }} /><span className="text-[11px] text-gray-400">Revenue</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: P.orange }} /><span className="text-[11px] text-gray-400">Orders</span></div>
        </div>
      </ChartCard>

      {/* ── Fulfillment + Payment Methods ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Fulfillment radial */}
        <ChartCard title="Order Fulfillment" sub="Delivered vs total orders">
          <div className="flex items-center gap-6">
            {/* Custom SVG circle instead of recharts radial */}
            <div className="relative shrink-0 w-28 h-28">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="38" fill="none"
                  stroke={P.emerald} strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 38}`}
                  strokeDashoffset={`${2 * Math.PI * 38 * (1 - fulfillRate / 100)}`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-lg font-black text-emerald-600 leading-none">{fulfillRate}%</p>
                <p className="text-[10px] text-gray-400 mt-0.5">fulfilled</p>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {[
                { label: 'Delivered', value: fulfillment?.delivered ?? 0, color: 'bg-emerald-500' },
                { label: 'Cancelled', value: fulfillment?.cancelled ?? 0, color: 'bg-rose-400' },
                { label: 'Pending',   value: (fulfillment?.total ?? 0) - (fulfillment?.delivered ?? 0) - (fulfillment?.cancelled ?? 0), color: 'bg-amber-400' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.color}`} />
                  <span className="text-xs text-gray-600 flex-1">{s.label}</span>
                  <span className="text-xs font-bold text-gray-900">{s.value}</span>
                </div>
              ))}
              <div className="pt-1 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Avg order value</span>
                  <span className="font-bold text-gray-900">{formatCurrency(metrics.financials.avgOrderValue)}</span>
                </div>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* Payment methods pie */}
        <ChartCard title="Payment Methods" sub="By order count">
          {payPie.length === 0
            ? <p className="text-xs text-gray-400 text-center py-8">No data yet</p>
            : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={payPie} cx="50%" cy="50%" innerRadius={38} outerRadius={60}
                      dataKey="value" paddingAngle={3}>
                      {payPie.map((p: any, i: number) => <Cell key={i} fill={p.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={TT} formatter={(v: any, name: string) => [v, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2.5">
                  {payments.map((p: any, i: number) => {
                    const total = payments.reduce((a: number, x: any) => a + x.count, 0);
                    const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
                    const colors = [P.orange, P.blue, P.teal];
                    return (
                      <div key={p.method}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[i % 3] }} />
                            <span className="font-medium text-gray-700 capitalize">{p.method}</span>
                          </div>
                          <span className="text-gray-400 font-semibold">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colors[i % 3] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          }
        </ChartCard>
      </div>

      {/* ── Cylinder Sizes + Peak Hours ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <ChartCard title="Popular Cylinder Sizes" sub="Units sold all time">
          {cylinders.length === 0
            ? <p className="text-xs text-gray-400 text-center py-8">No data yet</p>
            : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={cylinders} margin={{ top: 0, right: 0, left: -28, bottom: 0 }} barSize={44}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="size" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TT} formatter={(v: any) => [v, 'Units sold']} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {cylinders.map((_: any, i: number) => (
                      <Cell key={i} fill={[P.orange, P.blue, P.violet][i % 3]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </ChartCard>

        <ChartCard
          title="Order Activity by Hour"
          sub="Last 30 days"
          right={
            <span className="text-[11px] bg-orange-50 text-orange-500 font-bold px-2.5 py-1 rounded-full border border-orange-100">
              Peak {peakHour.hour}
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -28, bottom: 0 }} barSize={7}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 9, fill: '#9ca3af' }}
                tickLine={false} axisLine={false}
                tickFormatter={(v) => Number(v.split(':')[0]) % 6 === 0 ? v : ''}
              />
              <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TT} formatter={(v: any) => [v, 'Orders']} />
              <Bar dataKey="orders" radius={[3, 3, 0, 0]}>
                {hourlyData.map((d: any, i: number) => (
                  <Cell key={i} fill={d.orders === peakHour.orders && d.orders > 0 ? P.orange : '#fed7aa'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Top Stations + Top Riders ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <ChartCard title="Top Stations" sub="By revenue">
          {topStations.length === 0
            ? <p className="text-xs text-gray-400 text-center py-6">No data yet</p>
            : (
              <div className="space-y-3">
                {topStations.map((s: any, i: number) => {
                  const maxRev = topStations[0]?.revenue || 1;
                  const pct = Math.round((s.revenue / maxRev) * 100);
                  const colors = [P.emerald, P.teal, P.sky, P.blue, P.violet];
                  return (
                    <div key={s.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                            style={{ backgroundColor: colors[i % 5] }}>
                            {i + 1}
                          </span>
                          <span className="font-semibold text-gray-800 truncate">{s.name}</span>
                        </div>
                        <span className="text-gray-500 shrink-0 ml-2 font-semibold">{formatCurrency(s.revenue)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-7">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colors[i % 5] }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 ml-7">{s.orders} orders · {s.city}</p>
                    </div>
                  );
                })}
              </div>
            )
          }
        </ChartCard>

        <ChartCard title="Top Riders" sub="By trips completed">
          {topRiders.length === 0
            ? <p className="text-xs text-gray-400 text-center py-6">No data yet</p>
            : (
              <div className="space-y-2">
                {topRiders.map((r: any, i: number) => {
                  const colors = [P.violet, P.blue, P.sky, P.teal, P.emerald];
                  return (
                    <div key={r.name} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-black"
                        style={{ backgroundColor: colors[i % 5] }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{r.name}</p>
                        <p className="text-[11px] text-gray-400">{r.trips} trips · ⭐ {r.rating}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-emerald-600">{formatCurrency(r.earnings)}</p>
                        <p className="text-[10px] text-gray-400">earned</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </ChartCard>
      </div>

      {/* ── Month over Month ── */}
      {growth && (
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-blue-100 p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Month over Month</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] text-slate-400 mb-1">Orders this month</p>
              <p className="text-3xl font-black text-slate-800">{growth.thisMonthOrders}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">vs {growth.lastMonthOrders} last month</p>
              <div className="mt-2"><GrowthChip value={growth.ordersGrowth} /></div>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 mb-1">Revenue this month</p>
              <p className="text-3xl font-black text-slate-800">{formatCurrency(growth.thisMonthRev)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">vs {formatCurrency(growth.lastMonthRev)} last month</p>
              <div className="mt-2"><GrowthChip value={growth.revenueGrowth} /></div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Stub tabs (moved to own pages) ──────────────────────────────────────────

function StationsTab() { return null; }
function RidersTab()   { return null; }
function OrdersTab()   { return null; }
