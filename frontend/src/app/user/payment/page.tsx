'use client';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, CreditCard, Banknote, ShieldCheck, Zap } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function PaymentPage() {
  const params = useSearchParams();
  const router = useRouter();

  const stationId     = params.get('stationId') ?? '';
  const schedule      = params.get('schedule') ?? 'asap';
  const scheduledDate = params.get('scheduledDate') ?? '';
  const pickupStreet  = params.get('pickupStreet') ?? '';
  const pickupCity    = params.get('pickupCity') ?? '';
  const pickupLat     = parseFloat(params.get('pickupLat') ?? '0');
  const pickupLng     = parseFloat(params.get('pickupLng') ?? '0');
  const deliveryStreet = params.get('deliveryStreet') ?? '';
  const deliveryCity   = params.get('deliveryCity') ?? '';
  const deliveryLat    = parseFloat(params.get('deliveryLat') ?? '0');
  const deliveryLng    = parseFloat(params.get('deliveryLng') ?? '0');
  const deliveryLabel  = params.get('deliveryLabel') ?? '';
  const cartItemsRaw   = params.get('cartItems') ?? '[]';
  const cartItems: Array<{ size: number; quantity: number; unitPrice: number; subtotal: number; customPrice?: number }> = JSON.parse(cartItemsRaw);
  const total          = parseFloat(params.get('total') ?? '0');
  const summaryLabel   = cartItems.map((c) => `${c.size}kg ×${c.quantity}`).join(', ');

  const [method, setMethod] = useState<'paystack' | 'cash'>('paystack');
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      const { data } = await ordersApi.create({
        stationId,
        cylinders: cartItems.map(({ size, quantity, customPrice }) => ({
          size,
          quantity,
          ...(customPrice !== undefined ? { customPrice } : {}),
        })),
        orderType: 'delivery',
        deliveryAddress: {
          street: deliveryStreet,
          city: deliveryCity || deliveryStreet || deliveryLabel,
          lat: deliveryLat,
          lng: deliveryLng,
        },
        pickupAddress: {
          street: pickupStreet,
          city: pickupCity || pickupStreet,
          lat: pickupLat,
          lng: pickupLng,
        },
        paymentMethod: method === 'paystack' ? 'card' : 'cash',
        ...(schedule === 'scheduled' && scheduledDate ? { scheduledFor: scheduledDate } : {}),
      });

      sessionStorage.removeItem('checkout_photo');

      if (method === 'paystack' && data.payment?.authorizationUrl) {
        window.location.href = data.payment.authorizationUrl;
      } else {
        const orderId = data.order?._id || data.order?.id;
        const q = new URLSearchParams({
          orderId:     orderId ?? '',
          orderNumber: orderId?.slice(-8).toUpperCase() ?? '',
          total:       total.toFixed(2),
          method,
          summary:     summaryLabel,
        });
        router.replace(`/user/order-success?${q.toString()}`);
      }
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      if (errors?.length) {
        toast.error(errors[0]?.msg || 'Validation failed');
      } else {
        toast.error(err.response?.data?.message || 'Failed to place order');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-[var(--bg)] pb-32">
      {/* Header */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)] px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[var(--bg-card2)] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
        <h1 className="text-base font-bold text-[var(--text-primary)]">Confirm & Pay</h1>
      </div>

      <div className="px-4 py-8 max-w-lg mx-auto space-y-6">

        {/* Total hero */}
        <div className="text-center">
          <p className="text-xs text-[var(--text-muted)] mb-1">Total Amount</p>
          <p className="text-4xl font-black text-[var(--text-primary)]">GHS {total.toFixed(2)}</p>
          <div className="inline-block mt-2 bg-[var(--bg-card2)] border border-[var(--border)] rounded-full px-3 py-1">
            <p className="text-xs text-[var(--text-muted)]">{summaryLabel}</p>
          </div>
        </div>

        {/* Payment methods */}
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)] mb-3">Payment Method</p>
          <div className="space-y-3">

            {/* Paystack — default */}
            <button
              onClick={() => setMethod('paystack')}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all',
                method === 'paystack' ? 'border-brand-500 bg-brand-500/5' : 'border-[var(--border)] bg-[var(--bg-card)]'
              )}
            >
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                method === 'paystack' ? 'bg-brand-500' : 'bg-[var(--bg-card2)]'
              )}>
                <CreditCard className={cn('w-5 h-5', method === 'paystack' ? 'text-white' : 'text-[var(--text-muted)]')} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[var(--text-primary)]">Pay with Paystack</p>
                  <span className="text-[10px] font-bold text-white bg-brand-500 px-2 py-0.5 rounded-full">RECOMMENDED</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Card, Mobile Money, Bank — secure & instant</p>
              </div>
              <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                method === 'paystack' ? 'border-brand-500' : 'border-[var(--text-muted)]')}>
                {method === 'paystack' && <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />}
              </div>
            </button>

            {/* Cash on delivery */}
            <button
              onClick={() => setMethod('cash')}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all',
                method === 'cash' ? 'border-brand-500 bg-brand-500/5' : 'border-[var(--border)] bg-[var(--bg-card)]'
              )}
            >
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                method === 'cash' ? 'bg-brand-500' : 'bg-[var(--bg-card2)]'
              )}>
                <Banknote className={cn('w-5 h-5', method === 'cash' ? 'text-white' : 'text-[var(--text-muted)]')} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[var(--text-primary)]">Cash on Delivery</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Pay the rider when your gas arrives</p>
              </div>
              <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                method === 'cash' ? 'border-brand-500' : 'border-[var(--text-muted)]')}>
                {method === 'cash' && <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />}
              </div>
            </button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="space-y-2">
          {[
            { icon: ShieldCheck, text: 'Payment secured by Paystack — PCI-DSS compliant' },
            { icon: Zap,         text: 'Order dispatched immediately after payment' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Icon className="w-3.5 h-3.5 text-brand-500 shrink-0" />
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-[var(--bg-card)] border-t border-[var(--border)] px-4 py-4 z-20">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full h-14 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-colors shadow-lg shadow-brand-500/25"
          >
            {loading
              ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><span>{method === 'paystack' ? 'Pay Now' : 'Place Order'}</span><CheckCircle2 className="w-5 h-5" /></>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
