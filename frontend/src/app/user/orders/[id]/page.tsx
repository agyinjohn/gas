'use client';
import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Bike, ClipboardList, Store, MapPin, Star,
  AlertTriangle, Map, CheckCircle2, Phone, Flame,
} from 'lucide-react';
import { ordersApi, paymentsApi } from '@/lib/api';
import { useOrderTracking } from '@/hooks/useSocket';
import { useAuth } from '@/lib/auth';
import { Order } from '@/types';
import { BottomSheet } from '@/components/ui';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const TIMELINE = [
  { status: 'pending',   label: 'Order Placed',     icon: ClipboardList },
  { status: 'accepted',  label: 'Rider Assigned',   icon: Store         },
  { status: 'en_route',  label: 'Out for Delivery', icon: Bike          },
  { status: 'delivered', label: 'Delivered',         icon: MapPin        },
];

const STATUS_ORDER = ['pending', 'accepted', 'at_station', 'en_route', 'delivered'];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Order Placed',   color: 'text-amber-500',  bg: 'bg-amber-500/10'  },
  accepted:   { label: 'Rider Assigned', color: 'text-blue-500',   bg: 'bg-blue-500/10'   },
  at_station: { label: 'Being Prepared', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  en_route:   { label: 'On the Way',     color: 'text-brand-500',  bg: 'bg-brand-500/10'  },
  delivered:  { label: 'Delivered',      color: 'text-green-500',  bg: 'bg-green-500/10'  },
  cancelled:  { label: 'Cancelled',      color: 'text-red-500',    bg: 'bg-red-500/10'    },
};

const PAYMENT_LABEL: Record<string, string> = {
  mobile_money: 'MoMo',
  card: 'Card',
  cash: 'Cash',
};

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden', className)}>
      {children}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-xs text-[var(--text-muted)] shrink-0">{label}</span>
      <span className={cn('text-xs text-right break-words max-w-[60%]', bold ? 'font-bold text-[var(--text-primary)]' : 'text-[var(--text-primary)]')}>
        {value}
      </span>
    </div>
  );
}

export default function OrderDetailsPage() {
  const { id }       = useParams<{ id: string }>();
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const searchParams = useSearchParams();
  const { isLoading: authLoading } = useAuth();

  const isPaymentCallback = searchParams.get('payment') === 'callback';

  // When Paystack redirects back, verify the payment and update order status
  useEffect(() => {
    if (!isPaymentCallback || !order?.paystackReference) return;
    paymentsApi.verify(order.paystackReference)
      .then(() => refetch())
      .catch(console.error);
  }, [isPaymentCallback, order?.paystackReference]);

  const [showOTPSheet,     setShowOTPSheet]     = useState(false);
  const [showRatingSheet,  setShowRatingSheet]  = useState(false);
  const [showIssueSheet,   setShowIssueSheet]   = useState(false);
  const [otp,              setOtp]              = useState('');
  const [rating,           setRating]           = useState(5);
  const [ratingComment,    setRatingComment]    = useState('');
  const [issueCategory,    setIssueCategory]    = useState('not_delivered');
  const [issueDescription, setIssueDescription] = useState('');
  const [otpLoading,       setOtpLoading]       = useState(false);
  const [ratingLoading,    setRatingLoading]    = useState(false);
  const [issueLoading,     setIssueLoading]     = useState(false);

  const { data: order, refetch, error } = useQuery({
    queryKey: ['order', id],
    queryFn:  () => ordersApi.getById(id).then((r) => r.data.order as Order),
    enabled:  !authLoading && !!id,
    retry:    (failureCount, err: any) => err?.response?.status === 403 && failureCount < 1,
    retryDelay: 800,
    staleTime: 0,
    refetchInterval: 30000,
  });

  const handleStatusChange = useCallback((status: string) => {
    queryClient.invalidateQueries({ queryKey: ['order', id] });
    if (status === 'en_route')  setShowOTPSheet(true);
    if (status === 'delivered') setShowRatingSheet(true);
  }, [id, queryClient]);

  useOrderTracking(id, handleStatusChange, () => {});

  async function handleConfirmDelivery() {
    if (otp.length !== 4) { toast.error('Enter the 4-digit OTP'); return; }
    setOtpLoading(true);
    try {
      await ordersApi.confirmDelivery(id, otp);
      setShowOTPSheet(false);
      setShowRatingSheet(true);
      toast.success('Delivery confirmed!');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally { setOtpLoading(false); }
  }

  async function handleSubmitIssue() {
    if (issueDescription.trim().length < 10) { toast.error('Describe the issue (min 10 chars)'); return; }
    setIssueLoading(true);
    try {
      await ordersApi.reportIssue(id, issueCategory, issueDescription.trim());
      setShowIssueSheet(false);
      toast.success('Issue reported.');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to report issue');
    } finally { setIssueLoading(false); }
  }

  async function handleSubmitRating() {
    setRatingLoading(true);
    try {
      await ordersApi.rate(id, rating, ratingComment);
      setShowRatingSheet(false);
      toast.success('Thank you for your feedback!');
      refetch();
    } catch { toast.error('Failed to submit rating'); }
    finally { setRatingLoading(false); }
  }

  if (authLoading || (!order && !error)) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    if ((error as any)?.response?.status === 403) {
      return <div className="min-h-screen bg-[var(--bg)]"
        ref={(el) => { if (el) router.replace('/user/orders'); }} />;
    }
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-4 gap-4">
        <p className="text-sm font-bold text-[var(--text-primary)]">Order not found</p>
        <button onClick={() => router.push('/user/orders')}
          className="bg-brand-500 text-white text-sm font-bold px-5 py-3 rounded-xl">
          Back to Orders
        </button>
      </div>
    );
  }

  if (!order) return null;

  const meta             = STATUS_META[order.status] ?? STATUS_META.pending;
  const currentStatusIdx = STATUS_ORDER.indexOf(order.status);
  const rider            = typeof order.riderId   === 'object' ? order.riderId   as any : null;
  const station          = typeof order.stationId === 'object' ? order.stationId as any : null;
  const momoCharge       = order.paymentMethod === 'mobile_money'
    ? parseFloat((order.totalAmount * 0.01).toFixed(2)) : 0;

  const ISSUE_CATEGORIES = order.status === 'delivered'
    ? [
        { value: 'wrong_item',    label: 'Wrong item received' },
        { value: 'damaged',       label: 'Item was damaged'    },
        { value: 'late_delivery', label: 'Very late delivery'  },
        { value: 'payment_issue', label: 'Payment problem'     },
        { value: 'other',         label: 'Other'               },
      ]
    : [
        { value: 'late_delivery',       label: 'Delivery time exceeded'        },
        { value: 'rider_not_reachable', label: 'Rider not picking calls'       },
        { value: 'wrong_location',      label: 'Rider going to wrong location' },
        { value: 'not_delivered',       label: 'Order not moving / stuck'      },
        { value: 'other',               label: 'Other'                         },
      ];

  return (
    <div className="min-h-full bg-[var(--bg)] pb-28">

      {/* ── Header ── */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)] px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-[var(--bg-card2)] flex items-center justify-center shrink-0">
          <ArrowLeft className="w-4 h-4 text-[var(--text-primary)]" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--text-primary)] truncate">
            Order #{id.slice(-8).toUpperCase()}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {new Date(order.createdAt).toLocaleDateString('en-GH', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </p>
        </div>
        <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0', meta.color, meta.bg)}>
          {meta.label}
        </span>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">

        {/* Payment success */}
        {isPaymentCallback && (
          <SectionCard>
            <div className="flex items-center gap-3 p-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-green-500">Payment Successful!</p>
                <p className="text-xs text-[var(--text-muted)]">Your order is being processed.</p>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Live tracking */}
        {['accepted', 'at_station', 'en_route'].includes(order.status) && (
          <Link href={`/user/track/${id}`}>
            <div className="flex items-center justify-between bg-brand-500 rounded-2xl px-4 py-3">
              <div className="min-w-0 mr-3">
                <p className="text-sm font-bold text-white">Track your order</p>
                <p className="text-xs text-white/70">See rider location live</p>
              </div>
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <Map className="w-4 h-4 text-white" />
              </div>
            </div>
          </Link>
        )}

        {/* OTP CTA */}
        {order.status === 'en_route' && !order.otpVerifiedAt && (
          <button onClick={() => setShowOTPSheet(true)}
            className="w-full h-11 bg-[var(--bg-card)] border-2 border-brand-500 text-brand-500 rounded-2xl font-bold text-sm">
            Enter Delivery OTP
          </button>
        )}

        {/* Rider */}
        {rider && ['accepted', 'at_station', 'en_route', 'delivered'].includes(order.status) && (
          <SectionCard>
            <div className="flex items-center gap-3 p-3">
              <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                {rider.profilePhoto
                  ? <img src={rider.profilePhoto} alt="Rider" className="w-full h-full object-cover" />
                  : <span className="text-brand-500 font-black text-base">{rider.name?.charAt(0)}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)] truncate">{rider.name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate capitalize">
                  {rider.vehicleType} · {rider.vehiclePlate}
                </p>
                {rider.ratingAvg > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-3 h-3 text-amber-400 fill-current" />
                    <span className="text-xs text-[var(--text-muted)]">{rider.ratingAvg.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <a href={`tel:${rider.phone}`}
                className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-white" />
              </a>
            </div>
          </SectionCard>
        )}

        {/* Timeline */}
        <SectionCard>
          <div className="p-4">
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">
              Order Progress
            </p>
            <div className="space-y-0">
              {TIMELINE.map((step, i) => {
                const done   = currentStatusIdx >= STATUS_ORDER.indexOf(step.status);
                const event  = order.statusHistory?.find((h: any) => h.status === step.status);
                const Icon   = step.icon;
                const isLast = i === TIMELINE.length - 1;
                return (
                  <div key={step.status} className="flex gap-3">
                    {/* dot + line */}
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                        done ? 'bg-brand-500' : 'bg-[var(--bg-card2)]'
                      )}>
                        <Icon className={cn('w-3.5 h-3.5', done ? 'text-white' : 'text-[var(--text-muted)]')} />
                      </div>
                      {!isLast && (
                        <div className={cn('w-px flex-1 my-1', done ? 'bg-brand-500' : 'bg-[var(--border)]')}
                          style={{ minHeight: 16 }} />
                      )}
                    </div>
                    {/* text */}
                    <div className={cn('flex-1 min-w-0 pt-1', !isLast && 'pb-3')}>
                      <p className={cn('text-sm font-semibold leading-tight',
                        done ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]')}>
                        {step.label}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {event
                          ? new Date(event.timestamp).toLocaleString('en-GH', {
                              hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric',
                            })
                          : done ? 'Completed' : 'Pending'
                        }
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {/* Delivery info */}
        <SectionCard>
          <div className="p-4">
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">
              Delivery Info
            </p>
            <div className="divide-y divide-[var(--border)]">
              <Row label="Deliver to" value={`${order.deliveryAddress.street}, ${order.deliveryAddress.city}`} />
              {station && <Row label="Station" value={station.name} />}
              <Row label="Order type" value={order.orderType} />
            </div>
          </div>
        </SectionCard>

        {/* Receipt */}
        <SectionCard>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                Receipt
              </p>
              <span className="text-[11px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
              </span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {order.cylinders?.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 bg-brand-500/10 rounded-lg flex items-center justify-center shrink-0">
                      <Flame className="w-3 h-3 text-brand-500" />
                    </div>
                    <span className="text-xs text-[var(--text-muted)] truncate">
                      {c.size}kg × {c.quantity}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] shrink-0">
                    GHS {c.subtotal?.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="pt-2 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Subtotal</span>
                  <span className="text-xs text-[var(--text-primary)]">GHS {order.cylinderSubtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Delivery fee</span>
                  <span className="text-xs text-[var(--text-primary)]">GHS {order.deliveryFee?.toFixed(2)}</span>
                </div>
                {momoCharge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-[var(--text-muted)]">MoMo charge</span>
                    <span className="text-xs text-[var(--text-primary)]">GHS {momoCharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-[var(--border)]">
                  <span className="text-sm font-bold text-[var(--text-primary)]">Total</span>
                  <span className="text-sm font-black text-brand-500">GHS {order.totalAmount?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

      </div>

      {/* ── Bottom bar ── */}
      {order.status !== 'cancelled' && (
        <div className="fixed bottom-0 inset-x-0 bg-[var(--bg-card)] border-t border-[var(--border)] px-4 pt-3 pb-6 z-20">
          <div className="max-w-lg mx-auto flex gap-2">
            <button
              onClick={() => setShowIssueSheet(true)}
              disabled={!!(order as any).issue?.reportedAt}
              className="flex-1 h-11 bg-[var(--bg-card2)] border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{(order as any).issue?.reportedAt ? 'Reported' : 'Report'}</span>
            </button>
            <button
              onClick={() => order.status === 'delivered' && setShowRatingSheet(true)}
              disabled={order.status !== 'delivered' || !!order.riderRating}
              className="flex-1 h-11 bg-[var(--bg-card2)] border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Star className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{order.riderRating ? 'Rated' : 'Rate'}</span>
            </button>
            <button
              onClick={() => router.push('/user/orders')}
              className="flex-1 h-11 bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center justify-center"
            >
              My Orders
            </button>
          </div>
        </div>
      )}

      {/* ── Issue Sheet ── */}
      <BottomSheet open={showIssueSheet} onClose={() => setShowIssueSheet(false)} title="Report an Issue">
        <div className="space-y-2 mb-4">
          {ISSUE_CATEGORIES.map(({ value, label }) => (
            <button key={value} type="button" onClick={() => setIssueCategory(value)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-all',
                issueCategory === value
                  ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                  : 'border-[var(--border)] text-[var(--text-primary)]'
              )}>
              <span className="truncate mr-2">{label}</span>
              {issueCategory === value && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            </button>
          ))}
        </div>
        <textarea value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)}
          placeholder="Describe the issue… (min 10 characters)" rows={3}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card2)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4 resize-none" />
        <button onClick={handleSubmitIssue} disabled={issueLoading}
          className="w-full h-12 bg-brand-500 text-white rounded-xl font-bold text-sm disabled:opacity-60 flex items-center justify-center">
          {issueLoading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : 'Submit Report'}
        </button>
      </BottomSheet>

      {/* ── OTP Sheet ── */}
      <BottomSheet open={showOTPSheet} onClose={() => setShowOTPSheet(false)} title="Confirm Delivery">
        <p className="text-sm text-[var(--text-muted)] mb-5">
          Enter the 4-digit OTP to confirm you received your gas.
        </p>
        <input type="text" inputMode="numeric" maxLength={4} value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="0000"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card2)] px-4 py-4 text-center text-3xl tracking-[1em] font-mono text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 mb-5" />
        <button onClick={handleConfirmDelivery} disabled={otpLoading}
          className="w-full h-12 bg-brand-500 text-white rounded-xl font-bold text-sm disabled:opacity-60 flex items-center justify-center">
          {otpLoading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : 'Confirm Delivery'}
        </button>
      </BottomSheet>

      {/* ── Rating Sheet ── */}
      <BottomSheet open={showRatingSheet} onClose={() => setShowRatingSheet(false)} title="Rate Your Rider">
        <p className="text-sm text-[var(--text-muted)] mb-4">How was your experience?</p>
        <div className="flex justify-center gap-3 mb-5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => setRating(star)}>
              <Star className={cn('w-9 h-9 transition-colors',
                star <= rating ? 'text-amber-400 fill-current' : 'text-[var(--border)]')} />
            </button>
          ))}
        </div>
        <textarea value={ratingComment} onChange={(e) => setRatingComment(e.target.value)}
          placeholder="Any comments? (optional)" rows={3}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card2)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4 resize-none" />
        <button onClick={handleSubmitRating} disabled={ratingLoading}
          className="w-full h-12 bg-brand-500 text-white rounded-xl font-bold text-sm disabled:opacity-60 flex items-center justify-center">
          {ratingLoading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : 'Submit Rating'}
        </button>
        <button className="w-full text-center text-sm text-[var(--text-muted)] mt-3"
          onClick={() => setShowRatingSheet(false)}>
          Skip
        </button>
      </BottomSheet>
    </div>
  );
}
