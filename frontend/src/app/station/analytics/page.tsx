'use client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, DollarSign, Package, Clock } from 'lucide-react';
import { stationsApi } from '@/lib/api';
import { Card, Skeleton } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts';
import Link from 'next/link';

const STATION_ID = typeof window !== 'undefined' ? localStorage.getItem('gasgo_station_id') || '' : '';

export default function StationAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['station', 'analytics', STATION_ID],
    queryFn: () => stationsApi.getAnalytics(STATION_ID).then((r) => r.data.analytics),
    refetchInterval: 120000,
  });

  const analytics = data;
  const weekly = analytics?.weekly || [];
  const today = analytics?.today || { count: 0, revenue: 0, commission: 0 };

  const statCards = [
    {
      label: "Today's Revenue",
      value: formatCurrency(today.revenue),
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: "Today's Orders",
      value: today.count,
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Commission Deducted',
      value: formatCurrency(today.commission),
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Net Payout Today',
      value: formatCurrency(today.revenue - today.commission),
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/station" className="p-1.5 rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <h1 className="text-base font-semibold text-gray-900">Analytics</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Today's Stats */}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Today</h2>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {statCards.map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="flex flex-col gap-2">
                <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className={`text-xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Weekly Revenue Chart */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Weekly Revenue</h2>
          {isLoading ? (
            <Skeleton className="h-48" />
          ) : weekly.length > 0 ? (
            <Card className="p-2">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weekly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="_id"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.1)' }}
                  />
                  <Bar dataKey="revenue" fill="#f97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          ) : (
            <Card className="text-center py-8">
              <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No data yet this week</p>
            </Card>
          )}
        </div>

        {/* Weekly Orders Chart */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Weekly Orders</h2>
          {!isLoading && weekly.length > 0 ? (
            <Card className="p-2">
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={weekly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="_id"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.1)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          ) : null}
        </div>

        {/* Summary Table */}
        {weekly.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Daily Breakdown</h2>
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Date</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Orders</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {weekly.map((row: any, i: number) => (
                    <tr key={row._id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-4 py-2.5 text-gray-700">{row._id}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-blue-600">{row.orders}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-green-600">{formatCurrency(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
