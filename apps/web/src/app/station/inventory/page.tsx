'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Flame, Loader2 } from 'lucide-react';
import { stationsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatCurrency, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function StationInventoryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const stationId = user?.stationId || (() => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gasgo_token') : null;
      if (!token) return '';
      return JSON.parse(atob(token.split('.')[1])).stationId || '';
    } catch { return ''; }
  })();

  const { data: station, isLoading } = useQuery({
    queryKey: ['station', 'details', stationId],
    queryFn: () => stationsApi.getById(stationId).then((r) => r.data.station),
    enabled: !!stationId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ size, isAvailable }: { size: number; isAvailable: boolean }) =>
      stationsApi.updateInventory(stationId, size, isAvailable),
    onSuccess: (_, { isAvailable }) => {
      toast.success(isAvailable ? 'Marked as available' : 'Marked as unavailable');
      queryClient.invalidateQueries({ queryKey: ['station', 'details', stationId] });
    },
    onError: () => toast.error('Failed to update availability'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  const listings = station?.cylinderListings ?? [];

  if (listings.length === 0) {
    return (
      <div className="px-4 lg:px-6 py-6 max-w-4xl mx-auto">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-16 text-center">
          <Flame className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[var(--text-muted)]">No cylinders set up yet</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Add cylinder sizes and prices in the Pricing tab first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6 py-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h2 className="text-base font-bold text-[var(--text-primary)]">Cylinder Availability</h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">Toggle each size on or off to control what customers can order.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {listings.map((l: any) => {
          const isOn = l.isAvailable;
          const isPending = toggleMutation.isPending && (toggleMutation.variables as any)?.size === l.size;

          return (
            <div
              key={l.size}
              className={cn(
                'bg-[var(--bg-card)] rounded-2xl border-2 p-4 flex items-center gap-4 transition-all',
                isOn ? 'border-green-500/40' : 'border-[var(--border)] opacity-60'
              )}
            >
              {/* Icon */}
              <div className={cn(
                'w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0',
                isOn ? 'bg-brand-500' : 'bg-[var(--bg-card2)]'
              )}>
                <span className={cn('text-lg font-black leading-none', isOn ? 'text-white' : 'text-[var(--text-primary)]')}>{l.size}</span>
                <span className={cn('text-[10px] font-bold', isOn ? 'text-white/70' : 'text-[var(--text-muted)]')}>kg</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)]">{l.size}kg</p>
                <p className="text-xs text-[var(--text-muted)]">Fill: {formatCurrency(l.fillPrice)}</p>
                <span className={cn(
                  'inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1',
                  isOn ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'
                )}>
                  {isOn ? 'Available' : 'Unavailable'}
                </span>
              </div>

              {/* Toggle */}
              <button
                onClick={() => toggleMutation.mutate({ size: l.size, isAvailable: !isOn })}
                disabled={isPending}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50',
                  isOn ? 'bg-green-500' : 'bg-[var(--border)]'
                )}
                aria-label={isOn ? 'Mark unavailable' : 'Mark available'}
              >
                <span className={cn(
                  'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                  isOn ? 'translate-x-6' : 'translate-x-0.5'
                )} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
