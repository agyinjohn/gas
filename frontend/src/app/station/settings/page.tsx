'use client';
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Clock, CreditCard, Bell, LogOut, Wifi, WifiOff, AlertCircle, PackageX } from 'lucide-react';
import { stationsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

function getStationId(): string {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('gasgo_token') : null;
    if (!token) return '';
    return JSON.parse(atob(token.split('.')[1])).stationId || '';
  } catch { return ''; }
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

export default function StationSettingsPage() {
  const stationId = useMemo(() => getStationId(), []);
  const { logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: station, isLoading } = useQuery({
    queryKey: ['station', stationId],
    queryFn: () => stationsApi.getById(stationId).then((r) => r.data.station),
    enabled: !!stationId,
  });

  const stockMutation = useMutation({
    mutationFn: (outOfStock: boolean) => stationsApi.setStockStatus(stationId, outOfStock),
    onSuccess: (_data, outOfStock) => {
      queryClient.invalidateQueries({ queryKey: ['station', stationId] });
      toast.success(outOfStock ? 'Station marked as out of stock' : 'Station is now available');
    },
    onError: () => toast.error('Failed to update stock status'),
  });

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    router.push('/staff/login');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!station) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-[var(--text-muted)]">Station not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6 py-6 max-w-6xl mx-auto pb-8">
        <div className="space-y-6">

          {/* Station Info */}
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center">
                <Store className="w-5 h-5 text-brand-500" />
              </div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Station Information</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-muted)]">Station Name</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{station.name}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-muted)]">Address</span>
                <span className="text-sm font-semibold text-[var(--text-primary)] text-right max-w-xs">{station.address}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-muted)]">City</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{station.city}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-muted)]">Status</span>
                <div className="flex items-center gap-2">
                  {station.status === 'active' ? (
                    <>
                      <Wifi className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-semibold text-emerald-600">Active</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-semibold text-red-600 capitalize">{station.status}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-muted)]">Commission Rate</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{station.commissionPct}%</span>
              </div>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Operating Hours</h2>
            </div>
            <div className="space-y-2">
              {DAYS.map((day) => {
                const hours = station.operatingHours?.[day];
                const isOpen = hours?.isOpen !== false;
                return (
                  <div key={day} className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
                    <span className="text-sm font-medium text-[var(--text-primary)] w-24">{DAY_LABELS[day]}</span>
                    <div className="flex items-center gap-3">
                      {isOpen ? (
                        <span className="text-sm text-[var(--text-muted)]">
                          {hours?.open || '08:00'} – {hours?.close || '18:00'}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-red-600">Closed</span>
                      )}
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${isOpen ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isOpen ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-4">Contact support to update your operating hours.</p>
          </div>

          {/* Payout Account */}
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-purple-500" />
              </div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Payout Account</h2>
            </div>
            {station.bankAccount ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                  <span className="text-sm text-[var(--text-muted)]">Provider</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{station.bankAccount.provider}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                  <span className="text-sm text-[var(--text-muted)]">Account Number</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)] font-mono">{station.bankAccount.accountNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-muted)]">Account Name</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{station.bankAccount.accountName}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <CreditCard className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-muted)] mb-3">No payout account configured</p>
                <button className="text-sm text-brand-600 font-semibold hover:text-brand-700">Add Bank Account</button>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5 text-orange-500" />
              </div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Notifications</h2>
            </div>
            <div className="space-y-4">
              {[
                { label: 'New Order Alerts', desc: 'Sound & vibration on incoming orders', enabled: true },
                { label: 'Low Stock Alerts', desc: 'When cylinder stock falls below threshold', enabled: true },
                { label: 'Payout Notifications', desc: 'When payouts are processed', enabled: true },
              ].map(({ label, desc, enabled }) => (
                <div key={label} className="flex items-start justify-between gap-3 pb-4 border-b border-[var(--border)] last:border-0 last:pb-0">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative shrink-0 transition-colors ${enabled ? 'bg-brand-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Out of Stock */}
          <div className={cn(
            'flex items-center justify-between p-4 rounded-2xl border-2 transition-all',
            station.outOfStock ? 'border-red-300 bg-red-500/10' : 'border-[var(--border)] bg-[var(--bg-card)]'
          )}>
            <div className="flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                station.outOfStock ? 'bg-red-500' : 'bg-[var(--bg-card2)]'
              )}>
                <PackageX className={cn('w-4 h-4', station.outOfStock ? 'text-white' : 'text-[var(--text-muted)]')} />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">Out of Stock</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {station.outOfStock ? 'Customers cannot place orders' : 'Station is accepting orders'}
                </p>
              </div>
            </div>
            <button
              onClick={() => stockMutation.mutate(!station.outOfStock)}
              disabled={stockMutation.isPending}
              className={cn(
                'w-12 h-6 rounded-full relative transition-colors shrink-0',
                station.outOfStock ? 'bg-red-500' : 'bg-[var(--border)]'
              )}
            >
              <div className={cn(
                'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                station.outOfStock ? 'translate-x-6' : 'translate-x-0.5'
              )} />
            </button>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleLogout}
            className="w-full h-12 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>

        </div>
    </div>
  );
}
