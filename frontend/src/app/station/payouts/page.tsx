'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DollarSign, Calendar, CheckCircle, Clock, 
  AlertCircle, Landmark, CreditCard 
} from 'lucide-react';
import { stationsApi } from '@/lib/api';
import { Card, Button, Input, Badge } from '@/components/ui';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATION_ID = typeof window !== 'undefined' ? localStorage.getItem('gasgo_station_id') || '' : '';

export default function StationPayoutsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'bank'>('overview');
  const [bankForm, setBankForm] = useState({
    provider: '',
    accountNumber: '',
    accountName: '',
  });

  const { data: stationData } = useQuery({
    queryKey: ['station', 'details', STATION_ID],
    queryFn: () => stationsApi.getById(STATION_ID).then((r) => r.data.station),
    enabled: !!STATION_ID,
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['station', 'analytics', STATION_ID],
    queryFn: () => stationsApi.getAnalytics(STATION_ID).then((r) => r.data.analytics),
    enabled: !!STATION_ID,
  });

  const updateBankMutation = useMutation({
    mutationFn: (data: any) => stationsApi.updateSettings(STATION_ID, { bankAccount: data }),
    onSuccess: () => {
      toast.success('Bank account updated');
      queryClient.invalidateQueries({ queryKey: ['station', 'details'] });
    },
  });

  const handleSaveBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.provider || !bankForm.accountNumber || !bankForm.accountName) {
      return toast.error('Please fill all fields');
    }
    updateBankMutation.mutate(bankForm);
  };

  // Mock payout data - in real app this would come from API
  const mockPayouts = [
    { id: '1', amount: 450.00, status: 'completed', date: new Date(Date.now() - 86400000) },
    { id: '2', amount: 320.50, status: 'pending', date: new Date(Date.now() - 172800000) },
    { id: '3', amount: 680.75, status: 'completed', date: new Date(Date.now() - 259200000) },
  ];

  const totalEarnings = analyticsData?.period?.revenue || 0;
  const pendingPayouts = mockPayouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const completedPayouts = mockPayouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 pt-12 pb-6">
        <h1 className="text-xl font-bold mb-2">Payouts</h1>
        <p className="text-green-100 text-sm">Track your earnings and manage payouts</p>
        
        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-white/10 rounded-xl p-1">
          {[
            { key: 'overview', label: 'Overview', icon: DollarSign },
            { key: 'history', label: 'History', icon: Calendar },
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
            {/* Earnings Summary */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="text-center">
                <DollarSign className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-black text-gray-900">
                  {formatCurrency(totalEarnings)}
                </p>
                <p className="text-xs text-gray-500">Total Earnings</p>
              </Card>
              
              <Card className="text-center">
                <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-black text-gray-900">
                  {formatCurrency(pendingPayouts)}
                </p>
                <p className="text-xs text-gray-500">Pending Payouts</p>
              </Card>
            </div>

            {/* Payout Schedule */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Payout Schedule</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-xs">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Weekly Payouts</p>
                    <p className="text-gray-500">Every Friday at 6 PM</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold text-xs">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Direct Transfer</p>
                    <p className="text-gray-500">Sent to your registered mobile money account</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-xs">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Commission Deducted</p>
                    <p className="text-gray-500">{stationData?.commissionPct || 15}% platform fee already deducted</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Next Payout */}
            <Card className="bg-blue-50 border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Next Payout</h3>
              </div>
              <p className="text-sm text-blue-700 mb-2">
                Expected: Friday, {new Date(Date.now() + 86400000 * 3).toLocaleDateString()}
              </p>
              <p className="text-lg font-bold text-blue-900">
                {formatCurrency(pendingPayouts)}
              </p>
            </Card>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* Payout Stats */}
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <Card>
                <p className="font-bold text-green-600">
                  {mockPayouts.filter(p => p.status === 'completed').length}
                </p>
                <p className="text-gray-500">Completed</p>
              </Card>
              <Card>
                <p className="font-bold text-yellow-600">
                  {mockPayouts.filter(p => p.status === 'pending').length}
                </p>
                <p className="text-gray-500">Pending</p>
              </Card>
              <Card>
                <p className="font-bold text-gray-600">
                  {formatCurrency(completedPayouts)}
                </p>
                <p className="text-gray-500">Total Paid</p>
              </Card>
            </div>

            {/* Payout History */}
            <div className="space-y-3">
              {mockPayouts.map((payout) => (
                <Card key={payout.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(payout.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Payout #{payout.id.padStart(6, '0')}
                      </p>
                    </div>
                    <Badge className={
                      payout.status === 'completed' ? 'bg-green-100 text-green-700' :
                      payout.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }>
                      {payout.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatRelativeTime(payout.date)}</span>
                    {payout.status === 'completed' && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Transferred</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="space-y-4">
            {/* Current Bank Account */}
            {stationData?.bankAccount ? (
              <Card className="bg-green-50 border-green-200">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <h2 className="font-semibold text-green-900">Bank Account Connected</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provider:</span>
                    <span className="font-medium capitalize">{stationData.bankAccount.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Account:</span>
                    <span className="font-medium">{stationData.bankAccount.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{stationData.bankAccount.accountName}</span>
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
                {stationData?.bankAccount ? 'Update' : 'Add'} Bank Account
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
                    placeholder="Account holder name"
                    value={bankForm.accountName}
                    onChange={(e) => setBankForm(prev => ({ ...prev, accountName: e.target.value }))}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  loading={updateBankMutation.isPending}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {stationData?.bankAccount ? 'Update' : 'Save'} Account
                </Button>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}