'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Star, Truck, Phone, LogOut, AlertTriangle } from 'lucide-react';
import { ridersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, Button, Skeleton } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import RiderNav from '@/components/RiderNav';
import toast from 'react-hot-toast';
import SignOutConfirmModal from '@/components/SignOutConfirmModal';

export default function RiderProfilePage() {
  const { logout } = useAuth();
  const router = useRouter();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['rider', 'me'],
    queryFn: () => ridersApi.getMe().then((r) => r.data.rider),
  });

  const rider = data;

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    router.push('/rider/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pt-12 space-y-4">
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {showSignOutConfirm && (
        <SignOutConfirmModal
          onConfirm={handleLogout}
          onCancel={() => setShowSignOutConfirm(false)}
        />
      )}
      {/* Profile Hero */}
      <div className="bg-gray-900 text-white px-4 pt-12 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center text-2xl font-black">
            {rider?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">{rider?.name}</h1>
            <p className="text-gray-400 text-sm">{rider?.phone}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span className="text-sm font-medium">{rider?.ratingAvg?.toFixed(1)}</span>
              <span className="text-gray-500 text-xs">· {rider?.totalTrips} trips</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* KYC Status */}
        <Card className={
          rider?.kycStatus === 'approved' ? 'border-green-200 bg-green-50' :
          rider?.kycStatus === 'pending' ? 'border-yellow-200 bg-yellow-50' :
          'border-red-200 bg-red-50'
        }>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">KYC Status</p>
              <p className={`font-bold mt-0.5 ${
                rider?.kycStatus === 'approved' ? 'text-green-700' :
                rider?.kycStatus === 'pending' ? 'text-yellow-700' : 'text-red-700'
              }`}>
                {rider?.kycStatus === 'approved' ? '✓ Verified' :
                 rider?.kycStatus === 'pending' ? '⏳ Under Review' : '✗ Rejected'}
              </p>
            </div>
          </div>
          {rider?.kycStatus === 'pending' && (
            <p className="text-xs text-yellow-600 mt-2">
              Your KYC documents are being reviewed. You'll be notified within 24 hours.
            </p>
          )}
          {rider?.kycStatus === 'rejected' && rider?.kycRejectionReason && (
            <p className="text-xs text-red-600 mt-2">Reason: {rider.kycRejectionReason}</p>
          )}
        </Card>

        {/* Earnings Summary */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Earnings Summary</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-green-700">{formatCurrency(rider?.totalEarnings || 0)}</p>
              <p className="text-xs text-green-600">Total Earned</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-blue-700">{rider?.totalTrips || 0}</p>
              <p className="text-xs text-blue-600">Total Trips</p>
            </div>
          </div>
        </Card>

        {/* Vehicle Info */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Vehicle</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 capitalize">{rider?.vehicleType}</p>
              <p className="text-sm text-gray-500">{rider?.vehiclePlate}</p>
            </div>
          </div>
        </Card>

        {/* Bank Account */}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Payout Account</h2>
            <button className="text-xs text-brand-600 font-medium">Edit</button>
          </div>
          {rider?.bankAccount ? (
            <div className="mt-2 text-sm text-gray-600">
              <p>{rider.bankAccount.provider}</p>
              <p className="font-mono">{rider.bankAccount.accountNumber}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mt-2">No payout account added yet</p>
          )}
        </Card>

        {/* Logout */}
        <Button variant="danger" className="w-full" onClick={() => setShowSignOutConfirm(true)}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>

      {/* Bottom Nav */}
      <RiderNav />
    </div>
  );
}
