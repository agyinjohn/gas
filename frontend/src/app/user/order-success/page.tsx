'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CheckCircle2, MapPin, Bike, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { paymentsApi, ordersApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export default function OrderSuccessPage() {
  const params  = useSearchParams();
  const router  = useRouter();

  const orderId      = params.get('orderId') ?? '';
  const orderNumber  = params.get('orderNumber') ?? orderId.slice(-8).toUpperCase();
  const total        = params.get('total') ?? '';
  const method       = params.get('method') ?? 'cash';
  const summaryLabel = params.get('summary') ?? '';

  // Clear checkout session data and verify Paystack payment if callback
  useEffect(() => {
    sessionStorage.removeItem('checkout_photo');
    if (params.get('payment') === 'callback' && orderId) {
      ordersApi.getById(orderId)
        .then((r) => {
          const ref = r.data.order?.paystackReference;
          if (ref) return paymentsApi.verify(ref);
        })
        .catch(console.error);
    }
  }, []);

  const isMomo = method === 'mobile_money';

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">

        {/* Success animation */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 bg-brand-500/15 rounded-full flex items-center justify-center">
              <div className="w-16 h-16 bg-brand-500/25 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-brand-500" />
              </div>
            </div>
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full border-2 border-brand-500/30 animate-ping" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black text-[var(--text-primary)]">Order Placed!</h1>
            <p className="text-sm text-[var(--text-muted)]">Your gas is on its way 🔥</p>
          </div>
        </div>

        {/* Order summary card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 space-y-4">

          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">Order</span>
            <span className="text-xs font-black text-[var(--text-primary)] tracking-widest">#{orderNumber}</span>
          </div>

          {summaryLabel && (
            <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
              <span className="text-xs text-[var(--text-muted)]">Items</span>
              <span className="text-xs font-semibold text-[var(--text-primary)]">{summaryLabel}</span>
            </div>
          )}

          {total && (
            <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
              <span className="text-xs text-[var(--text-muted)]">Total Paid</span>
              <span className="text-sm font-black text-brand-500">GHS {total}</span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
            <span className="text-xs text-[var(--text-muted)]">Payment</span>
            <span className={cn(
              'text-xs font-bold px-2.5 py-1 rounded-full',
              isMomo ? 'bg-yellow-500/10 text-yellow-600' : 'bg-[var(--bg-card2)] text-[var(--text-primary)]'
            )}>
              {isMomo ? 'MTN MoMo' : 'Cash on pickup'}
            </span>
          </div>
        </div>

        {/* What happens next */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">What happens next</p>
          {[
            { icon: Clock,  text: 'A rider will be assigned to your order shortly' },
            { icon: Bike,   text: 'Rider picks up your cylinder from the station'  },
            { icon: MapPin, text: 'Cylinder delivered to your door'                },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-500/10 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-brand-500" />
              </div>
              <p className="text-sm text-[var(--text-muted)]">{text}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          {orderId && (
            <Link href={`/user/orders/${orderId}`}
              className="w-full h-13 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors py-4">
              Track Order <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          <Link href="/user"
            className="w-full h-12 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-2xl font-semibold text-sm flex items-center justify-center transition-colors">
            Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
}
