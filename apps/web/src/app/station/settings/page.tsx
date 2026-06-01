'use client';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Clock, CreditCard, Bell, LogOut, Wifi, WifiOff, AlertCircle, PackageX, X } from 'lucide-react';
import { stationsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import SignOutConfirmModal from '@/components/SignOutConfirmModal';

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
  const [pendingClose, setPendingClose] = useState<string | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    newOrderAlerts: true,
    lowStockAlerts: true,
    payoutNotifications: true,
  });

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

  const hoursUpdateMutation = useMutation({
    mutationFn: ({ day, isOpen }: { day: string; isOpen: boolean }) =>
      stationsApi.updateOperatingHours(stationId, { operatingHours: { [day]: { isOpen } } }),
    onSuccess: (_data, { day, isOpen }) => {
      queryClient.invalidateQueries({ queryKey: ['station', stationId] });
      toast.success(isOpen ? `${DAY_LABELS[day as keyof typeof DAY_LABELS]} is now open` : `${DAY_LABELS[day as keyof typeof DAY_LABELS]} is now closed`);
    },
    onError: () => toast.error('Failed to update operating hours'),
  });

  const notificationMutation = useMutation({
    mutationFn: (prefs: typeof notificationPrefs) =>
      stationsApi.updateSettings(stationId, { notificationPrefs: prefs }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['station', stationId] });
      toast.success('Notification preferences updated');
    },
    onError: () => toast.error('Failed to update notification preferences'),
  });

  const handleToggleNotification = (key: keyof typeof notificationPrefs) => {
    const newPrefs = { ...notificationPrefs, [key]: !notificationPrefs[key] };
    setNotificationPrefs(newPrefs);
    notificationMutation.mutate(newPrefs);
  };

  const handleToggleHours = (day: string, currentIsOpen: boolean) => {
    // If turning on, save immediately without confirmation
    if (!currentIsOpen) {
      hoursUpdateMutation.mutate({ day, isOpen: true });
      return;
    }
    
    // If turning off, ask for confirmation
    setPendingClose(day);
  };

  const confirmClose = () => {
    if (pendingClose) {
      hoursUpdateMutation.mutate({ day: pendingClose, isOpen: false });
      setPendingClose(null);
    }
  };

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
        {showSignOutConfirm && (
          <SignOutConfirmModal
            onConfirm={handleLogout}
            onCancel={() => setShowSignOutConfirm(false)}
          />
        )}
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
                const hours = station?.operatingHours?.[day];
                const isOpen = hours?.isOpen !== false;
                const isSaving = hoursUpdateMutation.isPending;
                return (
                  <div key={day} className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-card2)] transition-colors">
                    <span className="text-sm font-medium text-[var(--text-primary)] w-24">{DAY_LABELS[day]}</span>
                    <div className="flex items-center gap-3">
                      {isOpen ? (
                        <span className="text-sm text-[var(--text-muted)]">
                          {hours?.open || '08:00'} – {hours?.close || '18:00'}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-red-600">Closed</span>
                      )}
                      <button
                        onClick={() => handleToggleHours(day, isOpen)}
                        disabled={isSaving}
                        className={cn(
                          'w-10 h-5 rounded-full relative transition-colors shrink-0 cursor-pointer',
                          isOpen ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-300 hover:bg-gray-400',
                          isSaving && 'opacity-60 cursor-not-allowed'
                        )}
                      >
                        <div className={cn(
                          'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                          isOpen ? 'translate-x-5' : 'translate-x-0.5'
                        )} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
                { key: 'newOrderAlerts', label: 'New Order Alerts', desc: 'Sound & vibration on incoming orders' },
                { key: 'lowStockAlerts', label: 'Low Stock Alerts', desc: 'When cylinder stock falls below threshold' },
                { key: 'payoutNotifications', label: 'Payout Notifications', desc: 'When payouts are processed' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-start justify-between gap-3 pb-4 border-b border-[var(--border)] last:border-0 last:pb-0">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>
                  </div>
                  <button
                    onClick={() => handleToggleNotification(key as keyof typeof notificationPrefs)}
                    disabled={notificationMutation.isPending}
                    className={cn(
                      'w-10 h-5 rounded-full relative shrink-0 transition-colors cursor-pointer disabled:opacity-60',
                      notificationPrefs[key as keyof typeof notificationPrefs] ? 'bg-brand-500 hover:bg-brand-600' : 'bg-gray-300 hover:bg-gray-400'
                    )}
                  >
                    <div className={cn(
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                      notificationPrefs[key as keyof typeof notificationPrefs] ? 'translate-x-5' : 'translate-x-0.5'
                    )} />
                  </button>
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
            onClick={() => setShowSignOutConfirm(true)}
            className="w-full h-12 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Confirmation Modal */}
        {pendingClose && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-sm w-full space-y-6 p-6 border border-[var(--border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-[var(--text-primary)]">Close on {DAY_LABELS[pendingClose as keyof typeof DAY_LABELS]}?</h2>
                <button
                  onClick={() => setPendingClose(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-4">
                <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                  Closing on this day means customers won't be able to place orders. Are you sure?
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setPendingClose(null)}
                  className="flex-1 h-10 rounded-lg border border-[var(--border)] text-[var(--text-primary)] font-bold hover:bg-[var(--bg-card2)] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClose}
                  disabled={hoursUpdateMutation.isPending}
                  className="flex-1 h-10 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {hoursUpdateMutation.isPending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Closing...
                    </>
                  ) : (
                    'Yes, Close'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
