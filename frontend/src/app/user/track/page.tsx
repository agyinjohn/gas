'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { MapPin, Package } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

const ACTIVE_STATUSES = ['pending', 'accepted', 'at_station', 'en_route'];

export default function TrackIndexPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'user'],
    queryFn:  () => ordersApi.list().then((r) => r.data),
    enabled:  !authLoading,
  });

  const activeOrder = data?.orders?.find((o: any) => ACTIVE_STATUSES.includes(o.status));

  // Auto-redirect to active order tracking page
  useEffect(() => {
    if (activeOrder) {
      router.replace(`/user/track/${activeOrder._id}`);
    }
  }, [activeOrder, router]);

  if (isLoading || authLoading || activeOrder) {
    return (
      <div className="min-h-full bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--bg)] flex flex-col">
      {/* Header */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)] px-4 pt-12 pb-4 lg:pt-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Track Order</h1>
      </div>

      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-24">
        <div className="w-20 h-20 bg-brand-500/10 rounded-3xl flex items-center justify-center mb-5">
          <MapPin className="w-10 h-10 text-brand-500" />
        </div>
        <p className="text-lg font-black text-[var(--text-primary)] mb-2">No Active Orders</p>
        <p className="text-sm text-[var(--text-muted)] mb-8 max-w-xs">
          You don't have any orders being delivered right now. Place an order to start tracking.
        </p>
        <Link
          href="/user"
          className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm px-8 py-4 rounded-2xl transition-colors"
        >
          Order Gas Now
        </Link>
        <Link
          href="/user/orders"
          className="mt-3 text-sm text-[var(--text-muted)] hover:text-brand-500 transition-colors"
        >
          View past orders
        </Link>
      </div>
    </div>
  );
}
