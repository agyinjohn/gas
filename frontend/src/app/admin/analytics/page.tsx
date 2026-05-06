'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, TrendingUp, Users, Store, 
  Package, DollarSign, Calendar, MapPin 
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { Card, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';

export default function AdminAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  const { data: metricsData } = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => adminApi.getMetrics().then((r) => r.data.metrics),
  });

  // Mock analytics data - in real app this would come from API
  const mockAnalytics = {
    orderTrends: [
      { date: '2024-01-01', orders: 45, revenue: 2250 },
      { date: '2024-01-02', orders: 52, revenue: 2600 },
      { date: '2024-01-03', orders: 38, revenue: 1900 },
      { date: '2024-01-04', orders: 61, revenue: 3050 },
      { date: '2024-01-05', orders: 48, revenue: 2400 },
      { date: '2024-01-06', orders: 55, revenue: 2750 },
      { date: '2024-01-07', orders: 42, revenue: 2100 },
    ],
    topStations: [
      { name: 'Kofi Gas Station', orders: 156, revenue: 7800, city: 'Accra' },
      { name: 'Tema Gas Hub', orders: 142, revenue: 7100, city: 'Tema' },
      { name: 'Kumasi Central', orders: 128, revenue: 6400, city: 'Kumasi' },
      { name: 'Takoradi Gas', orders: 98, revenue: 4900, city: 'Takoradi' },
    ],
    topRiders: [
      { name: 'Kwame Asante', trips: 89, rating: 4.8, earnings: 1335 },
      { name: 'Ama Serwaa', trips: 76, rating: 4.9, earnings: 1140 },
      { name: 'John Mensah', trips: 71, rating: 4.7, earnings: 1065 },
      { name: 'Grace Osei', trips: 68, rating: 4.6, earnings: 1020 },
    ],
    cylinderSizes: [
      { size: '6kg', orders: 245, percentage: 45 },
      { size: '12kg', orders: 189, percentage: 35 },
      { size: '3kg', orders: 108, percentage: 20 },
    ],
    orderTypes: [
      { type: 'delivery', orders: 412, percentage: 76 },
      { type: 'exchange', orders: 130, percentage: 24 },
    ]
  };

  const metrics = metricsData || {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Platform Analytics</h1>
            <p className="text-sm text-gray-500">Comprehensive business insights</p>
          </div>
          
          <div className="flex gap-2">
            {['day', 'week', 'month'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range as any)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center">
            <Package className="w-8 h-8 text-brand-500 mx-auto mb-2" />
            <p className="text-2xl font-black text-gray-900">
              {metrics.orders?.total || 0}
            </p>
            <p className="text-xs text-gray-500">Total Orders</p>
            <p className="text-xs text-green-600 mt-1">
              +{metrics.orders?.today || 0} today
            </p>
          </Card>
          
          <Card className="text-center">
            <DollarSign className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-black text-gray-900">
              {formatCurrency(metrics.financials?.monthGMV || 0)}
            </p>
            <p className="text-xs text-gray-500">Monthly GMV</p>
            <p className="text-xs text-green-600 mt-1">
              {formatCurrency(metrics.financials?.monthCommission || 0)} commission
            </p>
          </Card>
        </div>

        {/* Order Trends Chart */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Order Trends (Last 7 Days)</h3>
          </div>
          
          <div className="space-y-2">
            {mockAnalytics.orderTrends.map((day, index) => {
              const maxOrders = Math.max(...mockAnalytics.orderTrends.map(d => d.orders));
              const width = (day.orders / maxOrders) * 100;
              
              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-500 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${width}%` }}
                    >
                      <span className="text-xs text-white font-medium">{day.orders}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 w-20">
                    {formatCurrency(day.revenue)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top Performing Stations */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Top Performing Stations</h3>
          </div>
          
          <div className="space-y-3">
            {mockAnalytics.topStations.map((station, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{station.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span>{station.city}</span>
                    <span>•</span>
                    <span>{station.orders} orders</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatCurrency(station.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Riders */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Top Performing Riders</h3>
          </div>
          
          <div className="space-y-3">
            {mockAnalytics.topRiders.map((rider, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-bold text-sm">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{rider.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{rider.trips} trips</span>
                    <span>•</span>
                    <span>⭐ {rider.rating}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-purple-600">{formatCurrency(rider.earnings)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Order Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          {/* Cylinder Sizes */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-3">Popular Cylinder Sizes</h3>
            <div className="space-y-2">
              {mockAnalytics.cylinderSizes.map((cylinder, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-brand-500 rounded-full"></div>
                    <span className="text-sm font-medium">{cylinder.size}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{cylinder.orders}</p>
                    <p className="text-xs text-gray-500">{cylinder.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Order Types */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-3">Order Types</h3>
            <div className="space-y-2">
              {mockAnalytics.orderTypes.map((type, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      type.type === 'delivery' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <span className="text-sm font-medium capitalize">{type.type}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{type.orders}</p>
                    <p className="text-xs text-gray-500">{type.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Platform Health */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Platform Health</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Active Stations</p>
              <div className="flex items-center gap-2">
                <p className="font-bold text-2xl text-green-600">{metrics.stations?.active || 0}</p>
                <Badge className="bg-green-100 text-green-700">
                  {metrics.stations?.pending || 0} pending
                </Badge>
              </div>
            </div>
            
            <div>
              <p className="text-gray-500 mb-1">Active Riders</p>
              <div className="flex items-center gap-2">
                <p className="font-bold text-2xl text-purple-600">{metrics.riders?.active || 0}</p>
                <Badge className="bg-yellow-100 text-yellow-700">
                  {metrics.riders?.pendingKYC || 0} pending KYC
                </Badge>
              </div>
            </div>
            
            <div>
              <p className="text-gray-500 mb-1">Avg Order Value</p>
              <p className="font-bold text-2xl text-blue-600">
                {formatCurrency(metrics.financials?.avgOrderValue || 0)}
              </p>
            </div>
            
            <div>
              <p className="text-gray-500 mb-1">New Users Today</p>
              <p className="font-bold text-2xl text-brand-600">
                {metrics.users?.newToday || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}