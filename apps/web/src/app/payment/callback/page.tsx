'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

type PageState = 'verifying' | 'confirmed' | 'failed';

const MAX_POLLS = 12;   // 12 × 2.5 s = 30 s max wait
const POLL_MS   = 2500;

export default function PaymentCallbackPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const orderId      = searchParams.get('orderId') ?? '';
  const reference    = searchParams.get('reference') ?? '';

  const [state, setState]     = useState<PageState>('verifying');
  const [retryLoading, setRetryLoading] = useState(false);
  const pollCount = useRef(0);

  useEffect(() => {
    if (!orderId) { setState('failed'); return; }
    pollOrder();
  }, []);

  async function pollOrder() {
    try {
      const { data } = await api.get(`/api/v1/orders/${orderId}`);
      const status        = data.order?.status;
      const paymentStatus = data.order?.paymentStatus;

      if (paymentStatus === 'captured' || !['awaiting_payment'].includes(status)) {
        // Webhook already processed — go to success
        setState('confirmed');
        const orderNumber = data.order?._id?.slice(-8).toUpperCase() ?? '';
        const total       = (data.order?.totalAmount ?? '').toString();
        const method      = data.order?.paymentMethod ?? 'card';
        setTimeout(() => {
          router.replace(
            `/user/order-success?orderId=${orderId}&orderNumber=${orderNumber}&total=${total}&method=${method}`
          );
        }, 1200);
        return;
      }

      // Still awaiting — keep polling
      pollCount.current += 1;
      if (pollCount.current < MAX_POLLS) {
        setTimeout(pollOrder, POLL_MS);
      } else {
        // Timed out — Paystack may have failed or webhook is delayed
        // Fall back to Paystack's own reference check
        if (reference) {
          const { data: pd } = await api.get(`/api/v1/payments/verify/${reference}`);
          if (pd.payment?.status === 'success') {
            // Paystack says success but webhook hasn't fired yet — keep polling briefly
            setTimeout(pollOrder, POLL_MS);
            return;
          }
        }
        setState('failed');
      }
    } catch {
      setState('failed');
    }
  }

  async function handleRetry() {
    if (!orderId) return;
    setRetryLoading(true);
    try {
      const { data } = await api.post(`/api/v1/payments/retry/${orderId}`);
      if (data.payment?.authorizationUrl) {
        window.location.href = data.payment.authorizationUrl;
      }
    } catch {
      setRetryLoading(false);
    }
  }

  if (state === 'verifying') {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-5 px-6">
        <div className="w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center">
          <Loader2 className="w-9 h-9 text-brand-500 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-[var(--text-primary)]">Confirming Payment</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Please wait, this usually takes a few seconds…</p>
        </div>
      </div>
    );
  }

  if (state === 'confirmed') {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-5 px-6">
        <div className="w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-brand-500" />
        </div>
        <p className="text-lg font-black text-[var(--text-primary)]">Payment Confirmed!</p>
        <p className="text-sm text-[var(--text-muted)]">Redirecting you now…</p>
      </div>
    );
  }

  // failed
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-6 px-6">
      <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
        <XCircle className="w-9 h-9 text-red-500" />
      </div>
      <div className="text-center">
        <p className="text-lg font-black text-[var(--text-primary)]">Payment Failed</p>
        <p className="text-sm text-[var(--text-muted)] mt-1 max-w-xs">
          Your order has been saved. You can try paying again without losing your order.
        </p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={handleRetry}
          disabled={retryLoading || !orderId}
          className="w-full h-13 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors py-4"
        >
          {retryLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : 'Try Payment Again'
          }
        </button>
        <button
          onClick={() => router.replace('/user')}
          className="w-full h-12 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-2xl font-semibold text-sm flex items-center justify-center"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
