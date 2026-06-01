'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  DollarSign, Users, Store, Calendar, 
  CheckCircle, Clock, AlertCircle, Filter 
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { Card, Badge, Input, Button } from '@/components/ui';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

export default function AdminPayoutsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'stations' | 'riders'>('overview');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock payout data - in real app this would come from API
  const mockPayouts = {
    stations: [
      { id: '1', name: 'Kofi Gas Station', amount: 1250.00, status: 'completed', date: new Date(Date.now() - 86400000), orders: 15 },
      { id: '2', name: 'Accra Central Gas', amount: 890.50, status: 'pending', date: new Date(Date.now() - 172800000), orders: 12 },
      { id: '3', name: 'Tema Gas Hub', amount: 2100.75, status: 'processing', date: new Date(Date.now() - 259200000), orders: 28 },
    ],
    riders: [
      { id: '1', name: 'Kwame Asante', amount: 180.00, status: 'completed', date: new Date(Date.now() - 86400000), trips: 12 },
      { id: '2', name: 'Ama Serwaa', amount: 145.50, status: 'pending', date: new Date(Date.now() - 172800000), trips: 9 },
      { id: '3', name: 'John Mensah', amount: 220.25, status: 'failed', date: new Date(Date.now() - 259200000), trips: 15 },
    ]
  };

  const { data: metricsData } = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => adminApi.getMetrics().then((r) => r.data.metrics),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'pending': return Clock;
      case 'processing': return Clock;
      case 'failed': return AlertCircle;
      default: return Clock;
    }
  };

  const totalStationPayouts = mockPayouts.stations.reduce((sum, p) => sum + p.amount, 0);
  const totalRiderPayouts = mockPayouts.riders.reduce((sum, p) => sum + p.amount, 0);
  const pendingPayouts = [...mockPayouts.stations, ...mockPayouts.riders]
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Payout Management</h1>
        
        {/* Tabs */}
        <div className="flex gap-4">
          {[
            { key: 'overview', label: 'Overview', icon: DollarSign },
            { key: 'stations', label: 'Stations', icon: Store },
            { key: 'riders', label: 'Riders', icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="text-center">
                <Store className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-black text-gray-900">
                  {formatCurrency(totalStationPayouts)}
                </p>
                <p className="text-xs text-gray-500">Station Payouts</p>
              </Card>
              
              <Card className="text-center">
                <Users className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-black text-gray-900">
                  {formatCurrency(totalRiderPayouts)}
                </p>
                <p className="text-xs text-gray-500">Rider Payouts</p>
              </Card>
            </div>

            <Card className="text-center bg-yellow-50 border-yellow-200">
              <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-black text-gray-900">
                {formatCurrency(pendingPayouts)}
              </p>
              <p className="text-xs text-gray-500">Pending Payouts</p>
            </Card>

            {/* Payout Schedule */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Payout Schedule</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium text-blue-900">Station Payouts</p>
                    <p className="text-blue-700">Weekly - Every Friday</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">Automated</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div>
                    <p className="font-medium text-purple-900">Rider Payouts</p>
                    <p className="text-purple-700">Per delivery - Instant</p>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700">Automated</Badge>
                </div>
              </div>
            </Card>

            {/* Recent Activity */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Recent Payout Activity</h3>
              <div className="space-y-2">
                {[...mockPayouts.stations.slice(0, 2), ...mockPayouts.riders.slice(0, 2)]
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .map((payout, index) => {
                    const StatusIcon = getStatusIcon(payout.status);
                    const isStation = 'orders' in payout;
                    
                    return (
                      <div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isStation ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                          {isStation ? <Store className="w-4 h-4 text-blue-600" /> : <Users className="w-4 h-4 text-purple-600" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{payout.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(payout.amount)} • {formatRelativeTime(payout.date)}
                          </p>
                        </div>
                        <Badge className={getStatusColor(payout.status)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {payout.status}
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            </Card>
          </div>
        )}

        {(activeTab === 'stations' || activeTab === 'riders') && (
          <div className="space-y-4">
            {/* Filters */}
            <Card>
              <div className="flex gap-3 mb-3">
                <Input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-xl text-sm"
                >
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </Card>

            {/* Payouts List */}
            <div className="space-y-3">
              {mockPayouts[activeTab].map((payout: any) => {
                const StatusIcon = getStatusIcon(payout.status);
                const isStation = activeTab === 'stations';
                
                return (
                  <Card key={payout.id}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isStation ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
                        {isStation ? 
                          <Store className="w-6 h-6 text-blue-600" /> : 
                          <span className="font-bold text-purple-600 text-lg">
                            {payout.name.charAt(0)}
                          </span>
                        }
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900">{payout.name}</p>
                          <Badge className={getStatusColor(payout.status)}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {payout.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-gray-600">
                            <span className="font-medium">{formatCurrency(payout.amount)}</span>
                            <span className="mx-2">•</span>
                            <span>{isStation ? `${payout.orders} orders` : `${payout.trips} trips`}</span>
                          </div>
                          <span className="text-gray-500">
                            {formatRelativeTime(payout.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {payout.status === 'failed' && (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="secondary" className="flex-1">
                          Retry Payout
                        </Button>
                        <Button size="sm" variant="secondary">
                          View Details
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}