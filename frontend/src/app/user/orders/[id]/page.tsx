'use client';
import { useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bike, ClipboardList, Store, MapPin, Star, AlertTriangle, Map, ChevronRight, CheckCircle2, Phone } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { useOrderTracking } from '@/hooks/useSocket';
import { useAuth } from '@/lib/auth';
import { Order } from '@/types';
import { BottomSheet } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const TIMELINE = [
  { status: 'pending',   label: 'Order Placed',     icon: ClipboardList },
  { status: 'accepted',  label: 'Vendor Accepted',  icon: Store         },
  { status: 'en_route',  label: 'Out for Delivery', icon: Bike          },
  { status: 'delivered', label: 'Delivered',         icon: MapPin        },
];

const STATUS_ORDER = ['pending', 'accepted', 'at_station', 'en_route', 'delivered'];

const PAYMENT_LABEL: Record<string, string> = {
  mobile_money: 'Paid via MoMO',
  card:         'Paid via Card',
  cash:         'Cash on Delivery',
};

const STATUS_DISPLAY: Record<string, string> = {
  pending:    'Order Placed',
  accepted:   'Vendor Accepted',
  at_station: 'Being Prepared',
  en_route:   'On Route',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
};

export default function OrderDetailsPage() {
  const { id }        = useParams<{ id: string }>();
  const router        = useRouter();
  const queryClient   = useQueryClient();
  const searchParams  = useSearchParams();
  const { isLoading: authLoading } = useAuth();

  const isPaymentCallback = searchParams.get('payment') === 'callback';

  const [showOTPSheet,      setShowOTPSheet]      = useState(false);
  const [showRatingSheet,   setShowRatingSheet]   = useState(false);
  const [showIssueSheet,    setShowIssueSheet]    = useState(false);
  const [otp,               setOtp]               = useState('');
  const [rating,            setRating]            = useState(5);
  const [ratingComment,     setRatingComment]     = useState('');
  const [issueCategory,     setIssueCategory]     = useState('not_delivered');
  const [issueDescription,  setIssueDescription]  = useState('');
  const [otpLoading,        setOtpLoading]        = useState(false);
  const [ratingLoading,     setRatingLoading]     = useState(false);
  const [issueLoading,      setIssueLoading]      = useState(false);

  const { data: order, refetch, error } = useQuery({
    queryKey: ['order', id],
    queryFn:  () => ordersApi.getById(id).then((r) => r.data.order as Order),
    enabled:  !authLoading && !!id,
    retry:    (failureCount, err: any) => {
      // Retry once on 403 in case auth wasn't ready yet
      if (err?.response?.status === 403 && failureCount < 1) return true;
      return false;
    },
    retryDelay: 800,
    staleTime:  0,
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
    if (issueDescription.trim().length < 10) { toast.error('Please describe the issue (min 10 characters)'); return; }
    setIssueLoading(true);
    try {
      await ordersApi.reportIssue(id, issueCategory, issueDescription.trim());
      setShowIssueSheet(false);
      toast.success('Issue reported. Our team will contact you shortly.');
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

  // ── Loading state ──────────────────────────────────────────────────────────
  if (authLoading || (!order && !error)) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Error / 403 state ──────────────────────────────────────────────────────
  if (error) {
    const is403 = (error as any)?.response?.status === 403;
    if (is403) {
      // Use useEffect-style redirect to avoid setState-during-render warning
      return (
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"
            ref={(el) => { if (el) router.replace('/user/orders'); }}
          />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-4">
        <div className="w-14 h-14 bg-brand-500/10 rounded-2xl flex items-center justify-center mb-4">
          <ArrowLeft className="w-7 h-7 text-brand-500" />
        </div>
        <p className="text-sm font-bold text-[var(--text-primary)] mb-1">Order not found</p>
        <p className="text-xs text-[var(--text-muted)] mb-5 text-center">This order could not be loaded.</p>
        <button onClick={() => router.push('/user/orders')}
          className="bg-brand-500 text-white text-sm font-bold px-5 py-3 rounded-xl">
          Back to Orders
        </button>
      </div>
    );
  }

  if (!order) return null;

  const isDelivered = order.status === 'delivered';
  const isActive    = ['pending', 'accepted', 'at_station', 'en_route'].includes(order.status);

  const ISSUE_CATEGORIES = isDelivered
    ? [
        { value: 'wrong_item',    label: 'Wrong item received' },
        { value: 'damaged',       label: 'Item was damaged' },
        { value: 'late_delivery', label: 'Very late delivery' },
        { value: 'payment_issue', label: 'Payment problem' },
        { value: 'other',         label: 'Other' },
      ]
    : [
        { value: 'late_delivery',       label: 'Delivery time exceeded' },
        { value: 'rider_not_reachable', label: 'Rider not picking calls' },
        { value: 'wrong_location',      label: 'Rider going to wrong location' },
        { value: 'not_delivered',       label: 'Order not moving / stuck' },
        { value: 'other',               label: 'Other' },
      ];

  const rider          = typeof order.riderId   === 'object' ? order.riderId   : null;
  const station        = typeof order.stationId === 'object' ? order.stationId : null;
  const currentStatusIdx = STATUS_ORDER.indexOf(order.status);

  const momoCharge = order.paymentMethod === 'mobile_money'
    ? parseFloat((order.totalAmount * 0.01).toFixed(2))
    : 0;

  return (
    <div className="min-h-full bg-[var(--bg)] pb-32">

      {/* Header */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)] px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-[var(--bg-card2)] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
        <h1 className="text-base font-bold text-[var(--text-primary)]">Order Details</h1>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">

        {/* Payment success banner */}
        {isPaymentCallback && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-lg font-bold">✓</span>
            </div>
            <div>
              <p className="text-sm font-bold text-green-500">Payment Successful!</p>
              <p className="text-xs text-[var(--text-muted)]">Your order has been placed and is being processed.</p>
            </div>
          </div>
        )}

        {/* Status card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs font-bold text-brand-500 bg-brand-500/10 px-2.5 py-1 rounded-full">
              Order #{id.slice(-8).toUpperCase()}
            </span>
            <div className="w-9 h-9 bg-brand-500/10 rounded-full flex items-center justify-center">
              <Bike className="w-5 h-5 text-brand-500" />
            </div>
          </div>
          <p className="text-2xl font-black text-[var(--text-primary)] mt-1">
            {STATUS_DISPLAY[order.status] ?? order.status}
          </p>
          {order.status === 'en_route' && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Estimated delivery: 12:45 PM
            </p>
          )}
          {['accepted', 'at_station', 'en_route'].includes(order.status) && (
            <Link href={`/user/track/${id}`}
              className="mt-3 w-full h-12 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
              <Map className="w-4 h-4" /> Live Tracking
            </Link>
          )}
        </div>

        {/* Rider card — shown when rider is assigned */}
        {rider && ['accepted', 'at_station', 'en_route', 'delivered'].includes(order.status) && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0 overflow-hidden">
              {(rider as any).profilePhoto
                ? <img src={(rider as any).profilePhoto} alt="Rider" className="w-full h-full object-cover" />
                : <span className="text-brand-500 font-black text-lg">{(rider as any).name?.charAt(0)}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--text-primary)] truncate">{(rider as any).name}</p>
              <p className="text-xs text-[var(--text-muted)] capitalize">{(rider as any).vehicleType} Motor Bike</p>
              <p className="text-xs font-bold text-brand-500">{(rider as any).vehiclePlate}</p>
            </div>
            <a href={`tel:${(rider as any).phone}`}
              className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-white" />
            </a>
          </div>
        )}

        {/* Order Status timeline */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
          <p className="text-sm font-bold text-[var(--text-primary)] mb-4">Order Status</p>
          <div>
            {TIMELINE.map((step, i) => {
              const stepIdx = STATUS_ORDER.indexOf(step.status);
              const done    = currentStatusIdx >= stepIdx;
              const event   = order.statusHistory?.find((h: any) => h.status === step.status);
              const Icon    = step.icon;
              const isLast  = i === TIMELINE.length - 1;

              return (
                <div key={step.status} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                      done ? 'bg-brand-500' : 'bg-[var(--bg-card2)]')}>
                      <Icon className={cn('w-4 h-4', done ? 'text-white' : 'text-[var(--text-muted)]')} />
                    </div>
                    {!isLast && (
                      <div className={cn('w-0.5 my-1', done ? 'bg-brand-500' : 'bg-[var(--border)]')}
                        style={{ minHeight: 24 }} />
                    )}
                  </div>
                  <div className={cn('pt-1', isLast ? 'pb-0' : 'pb-4')}>
                    <p className={cn('text-sm font-semibold',
                      done ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]')}>
                      {step.label}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {event
                        ? new Date(event.timestamp).toLocaleString('en-GH', {
                            hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric',
                          })
                        : done ? 'Completed' : 'Pending'
                      }
                    </p>
                    {step.status === 'en_route' && rider && done && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {(rider as any).name} your rider is on his way
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Status */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
          <p className="text-sm font-bold text-[var(--text-primary)] mb-3">Delivery Status</p>
          <div className="space-y-3">
            <div className="pb-3 border-b border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)] mb-0.5">Home Address</p>
              <p className="text-sm font-semibold text-brand-500">
                {order.deliveryAddress.street}, {order.deliveryAddress.city}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-0.5">Vendor</p>
              <p className="text-sm font-semibold text-brand-500">
                {station ? (station as any).name : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Receipt */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-[var(--text-primary)]">Receipt</p>
            <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
              {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            {order.cylinders?.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-brand-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <Bike className="w-3.5 h-3.5 text-brand-500" />
                  </div>
                  <span className="text-[var(--text-muted)]">{c.size}kg Cylinder Refill (x{c.quantity})</span>
                </div>
                <span className="text-[var(--text-primary)]">GHS {c.subtotal?.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
              <span>Subtotal</span>
              <span>GHS {order.cylinderSubtotal?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>Delivery Fee</span>
              <span>GHS {order.deliveryFee?.toFixed(2)}</span>
            </div>
            {momoCharge > 0 && (
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Momo charges</span>
                <span>GHS {momoCharge.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-[var(--border)]">
              <span className="font-bold text-[var(--text-primary)]">Total Paid</span>
              <span className="font-black text-brand-500 text-base">GHS {order.totalAmount?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* OTP entry */}
        {order.status === 'en_route' && !order.otpVerifiedAt && (
          <button onClick={() => setShowOTPSheet(true)}
            className="w-full h-12 bg-brand-500 text-white rounded-xl font-bold text-sm">
            Enter Delivery OTP
          </button>
        )}
      </div>

      {/* Bottom buttons */}
      {order.status !== 'cancelled' && (
        <div className="fixed bottom-0 inset-x-0 bg-[var(--bg-card)] border-t border-[var(--border)] px-4 py-4 z-20">
          <div className="max-w-lg mx-auto space-y-3">
            {/* Primary CTA — always visible */}
            <button
              onClick={() => router.push('/user/orders')}
              className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-brand-500/25"
            >
              Follow Up on Order
            </button>
            {/* Secondary actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowIssueSheet(true)}
                disabled={!!(order as any).issue?.reportedAt}
                className="h-11 bg-[var(--bg-card2)] border border-[var(--border)] text-[var(--text-primary)] rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <AlertTriangle className="w-4 h-4" />
                {(order as any).issue?.reportedAt ? 'Reported' : 'Report Issue'}
              </button>
              <button
                onClick={() => order.status === 'delivered' && setShowRatingSheet(true)}
                disabled={order.status !== 'delivered' || !!order.riderRating}
                className={cn(
                  'h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-colors',
                  order.status === 'delivered' && !order.riderRating
                    ? 'bg-[var(--bg-card2)] border-[var(--border)] text-[var(--text-primary)] hover:border-brand-500/50'
                    : 'bg-[var(--bg-card2)] border-[var(--border)] text-[var(--text-muted)] opacity-50 cursor-not-allowed'
                )}
              >
                <Star className="w-4 h-4" />
                {order.riderRating ? 'Rated' : 'Rate Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Sheet */}
      <BottomSheet open={showIssueSheet} onClose={() => setShowIssueSheet(false)} title="Report an Issue">
        <p className="text-sm text-[var(--text-muted)] mb-4">
          {isDelivered ? 'Tell us what went wrong with your delivery.' : 'Tell us what\'s happening with your active order.'}
        </p>
        <div className="space-y-2 mb-4">
          {ISSUE_CATEGORIES.map(({ value, label }) => (
            <button key={value} type="button"
              onClick={() => setIssueCategory(value)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-all',
                issueCategory === value
                  ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                  : 'border-[var(--border)] text-[var(--text-primary)] hover:border-brand-500/40'
              )}
            >
              {label}
              {issueCategory === value && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            </button>
          ))}
        </div>
        <textarea
          value={issueDescription}
          onChange={(e) => setIssueDescription(e.target.value)}
          placeholder="Describe the issue in detail… (min 10 characters)"
          rows={3}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card2)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4 resize-none"
        />
        <button onClick={handleSubmitIssue} disabled={issueLoading}
          className="w-full h-12 bg-brand-500 text-white rounded-xl font-bold text-sm disabled:opacity-60">
          {issueLoading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            : 'Submit Report'}
        </button>
      </BottomSheet>

      {/* OTP Sheet */}
      <BottomSheet open={showOTPSheet} onClose={() => setShowOTPSheet(false)} title="Confirm Delivery">
        <p className="text-sm text-[var(--text-muted)] mb-4">Enter the 4-digit OTP to confirm you received your gas.</p>
        <input type="text" inputMode="numeric" maxLength={4} value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="0000"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card2)] px-4 py-4 text-center text-3xl tracking-[1.5em] font-mono text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4"
        />
        <button onClick={handleConfirmDelivery} disabled={otpLoading}
          className="w-full h-12 bg-brand-500 text-white rounded-xl font-bold text-sm disabled:opacity-60">
          {otpLoading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            : 'Confirm Delivery'}
        </button>
      </BottomSheet>

      {/* Rating Sheet */}
      <BottomSheet open={showRatingSheet} onClose={() => setShowRatingSheet(false)} title="Rate Your Rider">
        <p className="text-sm text-[var(--text-muted)] mb-4">How was your experience?</p>
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => setRating(star)}>
              <Star className={cn('w-10 h-10 transition-colors',
                star <= rating ? 'text-amber-400 fill-current' : 'text-[var(--border)]')} />
            </button>
          ))}
        </div>
        <textarea value={ratingComment} onChange={(e) => setRatingComment(e.target.value)}
          placeholder="Any comments? (optional)" rows={3}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card2)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4 resize-none"
        />
        <button onClick={handleSubmitRating} disabled={ratingLoading}
          className="w-full h-12 bg-brand-500 text-white rounded-xl font-bold text-sm disabled:opacity-60">
          {ratingLoading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
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
