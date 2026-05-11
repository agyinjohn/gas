'use client';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, DollarSign, Package, Banknote, AlertCircle } from 'lucide-react';
import { stationsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts';

function getStationId(): string {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('gasgo_token') : null;
    if (!token) return '';
    return JSON.parse(atob(token.split('.')[1])).stationId || '';
  } catch { return ''; }
}

const P = { emerald: '#10b981', orange: '#f97316', blue: '#3b82f6', violet: '#8b5cf6' };
const TT = { borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12, padding: '8px 14px', backgroundColor: 'var(--bg-card)' };

export default function StationAnalyticsPage() {
  const stationId = useMemo(() => getStationId(), []);

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['station', 'analytics', stationId],
    queryFn: () => stationsApi.getAnalytics(stationId).then((r) => r.data.analytics),
    enabled: !!stationId,
    refetchInterval: 120000,
  });

  const analytics = analyticsData;
  const today = analytics?.today || { count: 0, revenue: 0, commission: 0 };
  const dailyChart = analytics?.dailyChart || [];
  const sizeSplit = analytics?.sizeSplit || [];

  return (
    <div className="px-4 lg:px-6 py-6 max-w-6xl mx-auto pb-8">
      <div className="space-y-6">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Today's Orders",  value: today.count,                                    icon: Package,   iconBg: 'bg-orange-100 dark:bg-orange-500/10', iconColor: 'text-orange-500', valueColor: 'text-orange-600 dark:text-orange-400' },
              { label: "Today's Revenue", value: formatCurrency(today.revenue),                  icon: DollarSign, iconBg: 'bg-emerald-100 dark:bg-emerald-500/10', iconColor: 'text-emerald-500', valueColor: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Week Orders',     value: analytics?.period?.count ?? 0,                  icon: TrendingUp, iconBg: 'bg-blue-100 dark:bg-blue-500/10',    iconColor: 'text-blue-500',    valueColor: 'text-blue-600 dark:text-blue-400'    },
              { label: 'Net Payout',      value: formatCurrency(today.revenue - today.commission), icon: Banknote,  iconBg: 'bg-violet-100 dark:bg-violet-500/10', iconColor: 'text-violet-500', valueColor: 'text-violet-600 dark:text-violet-400' },
            ].map(({ label, value, icon: Icon, iconBg, iconColor, valueColor }) => (
              <div key={label} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 shadow-sm">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg} mb-3`}>
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
                <p className={`text-2xl font-black leading-none mb-1 ${valueColor}`}>{value}</p>
                <p className="text-xs font-semibold text-[var(--text-muted)]">{label}</p>
              </div>
            ))}
          </div>

          {/* Revenue & Orders Trend */}
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-bold text-[var(--text-primary)]">Revenue & Orders — Last 7 Days</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Delivered orders only</p>
            </div>
            {isLoading || !dailyChart || dailyChart.length === 0 ? (
              <div className="h-56 bg-[var(--bg-card2)] rounded-lg animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailyChart} margin={{ top: 5, right: 0, left: -28, bottom: 0 }}>
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
          </div>

          {/* Cylinder Sizes Performance */}
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-bold text-[var(--text-primary)]">Popular Cylinder Sizes</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Units sold this week</p>
            </div>
            {isLoading || !sizeSplit || sizeSplit.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-8">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={sizeSplit} margin={{ top: 0, right: 0, left: -28, bottom: 0 }} barSize={44}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="_id" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TT} formatter={(v: any) => [v, 'Units']} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} fill={P.blue} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Daily Breakdown Table */}
          {dailyChart && dailyChart.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
              <div className="p-5 border-b border-[var(--border)]">
                <p className="text-sm font-bold text-[var(--text-primary)]">Daily Breakdown</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-card2)]">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-muted)]">Date</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-muted)]">Orders</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-muted)]">Revenue</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-muted)]">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyChart.map((row: any, i: number) => (
                      <tr key={row._id} className={i % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-card2)]'}>
                        <td className="px-5 py-3 text-[var(--text-primary)] font-medium">{row._id}</td>
                        <td className="px-5 py-3 text-right font-semibold text-blue-600">{row.orders}</td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-600">GH₵{Number(row.revenue).toFixed(0)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-orange-600">GH₵{Number(row.commission || 0).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
    </div>
  );
}
