'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gift, Star, Users, ArrowRight, Copy, Share } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { Card, Button, Badge } from '@/components/ui';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function UserLoyaltyPage() {
  const [activeTab, setActiveTab] = useState<'points' | 'referral'>('points');

  const { data: loyaltyData } = useQuery({
    queryKey: ['user', 'loyalty'],
    queryFn: () => usersApi.getLoyalty().then((r) => r.data),
  });

  const { data: referralData } = useQuery({
    queryKey: ['user', 'referral'],
    queryFn: () => usersApi.getReferral().then((r) => r.data),
  });

  const handleCopyReferralCode = () => {
    if (referralData?.referralCode) {
      navigator.clipboard.writeText(referralData.referralCode);
      toast.success('Referral code copied!');
    }
  };

  const handleShareReferral = () => {
    if (referralData?.shareUrl) {
      if (navigator.share) {
        navigator.share({
          title: 'Join GasGo with my referral code',
          text: `Get GH₵2 bonus when you join GasGo with my code: ${referralData.referralCode}`,
          url: referralData.shareUrl,
        });
      } else {
        navigator.clipboard.writeText(referralData.shareUrl);
        toast.success('Referral link copied!');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white px-4 pt-12 pb-6">
        <h1 className="text-xl font-bold mb-2">Rewards & Referrals</h1>
        <p className="text-brand-100 text-sm">
          Earn points with every order and refer friends for bonuses
        </p>
        
        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-white/10 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('points')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'points'
                ? 'bg-white text-brand-600'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Star className="w-4 h-4 inline mr-1" />
            Points
          </button>
          <button
            onClick={() => setActiveTab('referral')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'referral'
                ? 'bg-white text-brand-600'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 inline mr-1" />
            Referrals
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
        {activeTab === 'points' && (
          <div className="space-y-4">
            {/* Points Balance */}
            <Card className="text-center bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
              <div className="flex items-center justify-center mb-2">
                <Star className="w-8 h-8 text-yellow-500 mr-2" />
                <span className="text-3xl font-black text-gray-900">
                  {loyaltyData?.balance || 0}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Available Points</p>
              <p className="text-xs text-gray-500">
                {Math.floor((loyaltyData?.balance || 0) / 100)} GH₵ discount available
              </p>
            </Card>

            {/* How it Works */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">How Points Work</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Earn Points</p>
                    <p className="text-xs text-gray-500">1 point per GH₵1 spent on orders</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Redeem Rewards</p>
                    <p className="text-xs text-gray-500">100 points = GH₵1 discount</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Bonus Points</p>
                    <p className="text-xs text-gray-500">200 points for each successful referral</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Transaction History */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Activity</h2>
              {loyaltyData?.transactions?.length > 0 ? (
                <div className="space-y-3">
                  {loyaltyData.transactions.slice(0, 5).map((transaction: any) => (
                    <div key={transaction._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatRelativeTime(transaction.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${
                          transaction.points > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.points > 0 ? '+' : ''}{transaction.points}
                        </p>
                        <Badge className={
                          transaction.type === 'earn' ? 'bg-green-100 text-green-700' :
                          transaction.type === 'redeem' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {transaction.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4 text-sm">
                  No transactions yet. Start ordering to earn points!
                </p>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'referral' && (
          <div className="space-y-4">
            {/* Referral Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="text-center">
                <p className="text-2xl font-black text-brand-600">
                  {referralData?.referralCount || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Friends Referred</p>
              </Card>
              <Card className="text-center">
                <p className="text-2xl font-black text-green-600">
                  {formatCurrency((referralData?.referralCount || 0) * 2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Bonus Earned</p>
              </Card>
            </div>

            {/* Referral Code */}
            <Card className="bg-gradient-to-br from-brand-50 to-purple-50 border-brand-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Referral Code</h2>
              <div className="bg-white rounded-xl p-4 border-2 border-dashed border-brand-300 mb-4">
                <p className="text-center text-2xl font-black text-brand-600 tracking-wider">
                  {referralData?.referralCode || 'Loading...'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={handleCopyReferralCode}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Code
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleShareReferral}
                >
                  <Share className="w-4 h-4 mr-1" />
                  Share Link
                </Button>
              </div>
            </Card>

            {/* How Referrals Work */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">How Referrals Work</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-brand-600 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Share Your Code</p>
                    <p className="text-xs text-gray-500">
                      Send your referral code to friends and family
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">They Sign Up</p>
                    <p className="text-xs text-gray-500">
                      Your friend registers using your code
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-yellow-600 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Both Get Rewarded</p>
                    <p className="text-xs text-gray-500">
                      You both receive 200 points (GH₵2 value)
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Terms */}
            <Card className="bg-gray-50">
              <p className="text-xs text-gray-600 leading-relaxed">
                <strong>Terms:</strong> Referral bonuses are awarded when your friend completes their first order. 
                Points expire after 12 months of inactivity. Maximum 10 referrals per month.
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}