'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Bell, Package, Bike, Flame, CheckCircle2,
  XCircle, CreditCard, ArrowLeft, Loader2,
} from 'lucide-react';
import { notificationsApi } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

const TYPE_META: Record<string, { icon: any; iconBg: string; iconColor: string }> = {
  order_placed:   { icon: Package,      iconBg: 'bg-brand-500/15',  iconColor: 'text-brand-500'  },
  rider_assigned: { icon: Bike,         iconBg: 'bg-blue-500/15',   iconColor: 'text-blue-500'   },
  at_station:     { icon: Flame,        iconBg: 'bg-amber-500/15',  iconColor: 'text-amber-500'  },
  en_route:       { icon: Bike,         iconBg: 'bg-brand-500/15',  iconColor: 'text-brand-500'  },
  delivered:      { icon: CheckCircle2, iconBg: 'bg-green-500/15',  iconColor: 'text-green-500'  },
  cancelled:      { icon: XCircle,      iconBg: 'bg-red-500/15',    iconColor: 'text-red-500'    },
  payment:        { icon: CreditCard,   iconBg: 'bg-purple-500/15', iconColor: 'text-purple-500' },
  system:         { icon: Bell,         iconBg: 'bg-[var(--bg-card2)]', iconColor: 'text-[var(--text-muted)]' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    refetchInterval: 30000,
  });

  const readAllMutation = useMutation({
    mutationFn: () => notificationsApi.readAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const readOneMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.readOne(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications: any[] = data?.notifications ?? [];
  const unreadCount: number  = data?.unreadCount ?? 0;

  function handleClick(n: any) {
    if (!n.read) readOneMutation.mutate(n._id);
    if (n.orderId) router.push(`/user/orders/${n.orderId}`);
  }

  return (
    <div className="min-h-full bg-[var(--bg)] pb-24">

      {/* Header */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)] px-4 pt-12 pb-0 lg:pt-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-[var(--bg-card2)] flex items-center justify-center lg:hidden">
              <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-[var(--text-muted)]">{unreadCount} unread</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => readAllMutation.mutate()}
              disabled={readAllMutation.isPending}
              className="text-xs font-semibold text-brand-500 hover:underline disabled:opacity-50"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto lg:max-w-2xl space-y-2">

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Bell className="w-7 h-7 text-brand-500" />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">No notifications yet</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              You'll be notified about your orders here.
            </p>
          </div>
        )}

        {notifications.map((n) => {
          const meta = TYPE_META[n.type] ?? TYPE_META.system;
          const Icon = meta.icon;
          return (
            <button
              key={n._id}
              onClick={() => handleClick(n)}
              className={cn(
                'w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-all active:scale-[0.99]',
                n.read
                  ? 'bg-[var(--bg-card)] border-[var(--border)]'
                  : 'bg-brand-500/5 border-brand-500/20'
              )}
            >
              {/* Icon */}
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', meta.iconBg)}>
                <Icon className={cn('w-5 h-5', meta.iconColor)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-sm font-bold leading-snug', n.read ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]')}>
                    {n.title}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!n.read && (
                      <span className="w-2 h-2 bg-brand-500 rounded-full" />
                    )}
                    <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{n.body}</p>
                {n.orderId && (
                  <p className="text-[10px] font-semibold text-brand-500 mt-1">
                    Order #{typeof n.orderId === 'string' ? n.orderId.slice(-8).toUpperCase() : n.orderId?.toString().slice(-8).toUpperCase()}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
