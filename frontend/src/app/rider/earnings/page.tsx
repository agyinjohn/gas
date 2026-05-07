'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DollarSign, CreditCard, Landmark, Calendar, 
  TrendingUp, Clock, CheckCircle, AlertCircle, Package, Star
} from 'lucide-react';
import Link from 'next/link';
import RiderNav from '@/components/RiderNav';
import { ridersApi } from '@/lib/api';
import { Card, Button, Input, Badge } from '@/components/ui';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function RiderEarningsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'payouts' | 'bank'>('overview');
  const [bankForm, setBankForm] = useState({
    provider: '',
    accountNumber: '',
    accountName: '',
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['rider', 'dashboard'],
    queryFn: () => ridersApi.getDashboard().then((r) => r.data.dashboard),
  });

  const { data: payoutsData } = useQuery({
    queryKey: ['rider', 'payouts'],
    queryFn: () => ridersApi.getPayouts().then((r) => r.data),
    enabled: activeTab === 'payouts',
  });

  const { data: riderData } = useQuery({
    queryKey: ['rider', 'me'],
    queryFn: () => ridersApi.getMe().then((r) => r.data.rider),
    enabled: activeTab === 'bank',
  });

  const bankAccountMutation = useMutation({
    mutationFn: (data: any) => ridersApi.updateBankAccount(data),
    onSuccess: () => {
      toast.success('Bank account updated');
      queryClient.invalidateQueries({ queryKey: ['rider', 'me'] });
    },
  });

  const handleSaveBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.provider || !bankForm.accountNumber || !bankForm.accountName) {
      return toast.error('Please fill all fields');
    }
    bankAccountMutation.mutate(bankForm);
  };

  const dashboard = dashboardData || {};
  const payouts = payoutsData?.payouts || [];
  const rider = riderData || {};

  // Calculate weekly earnings
  const weeklyEarnings = dashboard.todayEarnings * 7; // Simplified calculation

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 pt-12 pb-6">
        <h1 className="text-xl font-bold mb-2">Earnings</h1>
        <p className="text-green-100 text-sm">Track your income and manage payouts</p>
        
        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-white/10 rounded-xl p-1">
          {[
            { key: 'overview', label: 'Overview', icon: TrendingUp },
            { key: 'payouts', label: 'Payouts', icon: DollarSign },
            { key: 'bank', label: 'Bank Account', icon: Landmark },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-white text-green-600'
                  : 'text-white/80 hover:text-white'
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
            {/* Today's Earnings */}
            <Card className="text-center bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <DollarSign className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-3xl font-black text-gray-900 mb-1">
                {formatCurrency(dashboard.todayEarnings || 0)}
              </p>
              <p className="text-sm text-gray-600 mb-2">Today's Earnings</p>
              <p className="text-xs text-green-600">
                From {dashboard.todayTrips || 0} completed trips
              </p>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(weeklyEarnings)}
                </p>
                <p className="text-xs text-gray-500">This Week (Est.)</p>
              </Card>
              
              <Card className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(dashboard.totalEarnings || 0)}
                </p>
                <p className="text-xs text-gray-500">Total Earnings</p>
              </Card>
              
              <Card className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {dashboard.totalTrips || 0}
                </p>
                <p className="text-xs text-gray-500">Total Trips</p>
              </Card>
              
              <Card className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {dashboard.totalTrips > 0 
                    ? formatCurrency((dashboard.totalEarnings || 0) / dashboard.totalTrips)
                    : formatCurrency(0)
                  }
                </p>
                <p className="text-xs text-gray-500">Avg per Trip</p>
              </Card>
            </div>

            {/* Earnings Breakdown */}
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">How Earnings Work</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold text-xs">15%</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Commission Rate</p>
                    <p className="text-gray-500">You earn 15% of each order's station payout</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Instant Payouts</p>
                    <p className="text-gray-500">Earnings are paid out after each completed delivery</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Mobile Money</p>
                    <p className="text-gray-500">Payments sent directly to your mobile money account</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="space-y-4">
            {/* Payout Summary */}
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">Payout History</h2>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <p className="font-bold text-green-600">
                    {payouts.filter((p: any) => p.status === 'completed').length}
                  </p>
                  <p className="text-gray-500">Completed</p>
                </div>
                <div>
                  <p className="font-bold text-yellow-600">
                    {payouts.filter((p: any) => p.status === 'pending').length}
                  </p>
                  <p className="text-gray-500">Pending</p>
                </div>
                <div>
                  <p className="font-bold text-red-600">
                    {payouts.filter((p: any) => p.status === 'failed').length}
                  </p>
                  <p className="text-gray-500">Failed</p>
                </div>
              </div>
            </Card>

            {/* Payout List */}
            {payouts.length > 0 ? (
              <div className="space-y-3">
                {payouts.map((payout: any) => (
                  <Card key={payout._id}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(payout.amountGHS)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Order #{payout.orderId?.slice(-6).toUpperCase()}
                        </p>
                      </div>
                      <Badge className={
                        payout.status === 'completed' ? 'bg-green-100 text-green-700' :
                        payout.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        payout.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }>
                        {payout.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatRelativeTime(payout.createdAt)}</span>
                      {payout.status === 'completed' && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>Paid</span>
                        </div>
                      )}
                      {payout.status === 'failed' && (
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-red-500" />
                          <span>Failed</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-8">
                <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No payouts yet</p>
                <p className="text-sm text-gray-400">
                  Complete your first delivery to see payouts here
                </p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="space-y-4">
            {/* Current Bank Account */}
            {rider.bankAccount ? (
              <Card className="bg-green-50 border-green-200">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <h2 className="font-semibold text-green-900">Bank Account Connected</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provider:</span>
                    <span className="font-medium capitalize">{rider.bankAccount.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Account:</span>
                    <span className="font-medium">{rider.bankAccount.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{rider.bankAccount.accountName}</span>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="bg-yellow-50 border-yellow-200">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="w-6 h-6 text-yellow-500" />
                  <h2 className="font-semibold text-yellow-900">Setup Required</h2>
                </div>
                <p className="text-sm text-yellow-700">
                  Add your mobile money account to receive automatic payouts
                </p>
              </Card>
            )}

            {/* Bank Account Form */}
            <Card>
              <h2 className="font-semibold text-gray-900 mb-4">
                {rider.bankAccount ? 'Update' : 'Add'} Bank Account
              </h2>
              
              <form onSubmit={handleSaveBankAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Money Provider
                  </label>
                  <select
                    value={bankForm.provider}
                    onChange={(e) => setBankForm(prev => ({ ...prev, provider: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Provider</option>
                    <option value="mtn">MTN Mobile Money</option>
                    <option value="vod">Vodafone Cash</option>
                    <option value="tgo">AirtelTigo Money</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    placeholder="0244123456"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Your full name as registered"
                    value={bankForm.accountName}
                    onChange={(e) => setBankForm(prev => ({ ...prev, accountName: e.target.value }))}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  loading={bankAccountMutation.isPending}
                >
                  <Landmark className="w-4 h-4 mr-2" />
                  {rider.bankAccount ? 'Update' : 'Save'} Account
                </Button>
              </form>
            </Card>

            {/* Info */}
            <Card className="bg-blue-50 border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2">Important Notes</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Payouts are processed automatically after each delivery</li>
                <li>• Ensure your mobile money account is active and verified</li>
                <li>• Contact support if you experience payout delays</li>
                <li>• Account name must match your mobile money registration</li>
              </ul>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <RiderNav />
    </div>
  );
}