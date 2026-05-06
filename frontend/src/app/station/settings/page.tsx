'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Store, Clock, Bell, LogOut } from 'lucide-react';
import { stationsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, Button, Input } from '@/components/ui';
import { Station } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const STATION_ID = typeof window !== 'undefined' ? localStorage.getItem('gasgo_station_id') || '' : '';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

export default function StationSettingsPage() {
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['station', STATION_ID],
    queryFn: () => stationsApi.getById(STATION_ID).then((r) => r.data.station as Station),
  });

  const station = data;

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    router.push('/station/login');
  };

  if (isLoading || !station) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/station" className="p-1.5 rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <h1 className="text-base font-semibold text-gray-900">Settings</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Station Info */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Store className="w-4 h-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-gray-700">Station Info</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium">{station.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Address</span>
              <span className="font-medium text-right max-w-[55%]">{station.address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">City</span>
              <span className="font-medium">{station.city}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={`font-medium capitalize ${
                station.status === 'active' ? 'text-green-600' :
                station.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
              }`}>{station.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Commission Rate</span>
              <span className="font-medium">{station.commissionPct}%</span>
            </div>
          </div>
        </Card>

        {/* Operating Hours */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-gray-700">Operating Hours</h2>
          </div>
          <div className="space-y-2">
            {DAYS.map((day) => {
              const hours = station.operatingHours?.[day];
              return (
                <div key={day} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 w-24">{DAY_LABELS[day]}</span>
                  <div className="flex items-center gap-2">
                    {hours?.isOpen !== false ? (
                      <span className="text-gray-600">
                        {hours?.open || '08:00'} – {hours?.close || '18:00'}
                      </span>
                    ) : (
                      <span className="text-red-500">Closed</span>
                    )}
                    <div
                      className={`w-10 h-5 rounded-full relative transition-colors ${
                        hours?.isOpen !== false ? 'bg-brand-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          hours?.isOpen !== false ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Contact support to update your operating hours.
          </p>
        </Card>

        {/* Payout Account */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Payout Account</h2>
          {station.bankAccount ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Provider</span>
                <span className="font-medium">{station.bankAccount.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Account No.</span>
                <span className="font-medium font-mono">{station.bankAccount.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Account Name</span>
                <span className="font-medium">{station.bankAccount.accountName}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400 mb-3">No payout account configured</p>
              <button className="text-sm text-brand-600 font-medium">Add Account</button>
            </div>
          )}
        </Card>

        {/* Notifications */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-gray-700">Notifications</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: 'New order alerts', desc: 'Sound & vibration on new incoming orders', enabled: true },
              { label: 'Low stock alerts', desc: 'When cylinder stock falls below threshold', enabled: true },
              { label: 'Payout notifications', desc: 'When payouts are processed', enabled: true },
            ].map(({ label, desc, enabled }) => (
              <div key={label} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <div
                  className={`w-10 h-5 rounded-full relative shrink-0 transition-colors ${enabled ? 'bg-brand-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Button variant="danger" className="w-full" onClick={handleLogout}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
}
