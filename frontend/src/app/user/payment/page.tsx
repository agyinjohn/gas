'use client';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Info } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const MOMO_CHARGE_PCT = 0.01; // 1% transaction charge

export default function PaymentPage() {
  const params = useSearchParams();
  const router = useRouter();

  const stationId      = params.get('stationId') ?? '';
  const schedule       = params.get('schedule') ?? 'asap';
  const scheduledDate  = params.get('scheduledDate') ?? '';
  // Delivery address (where cylinder gets delivered after refill)
  const deliveryStreet = params.get('deliveryStreet') ?? '';
  const deliveryCity   = params.get('deliveryCity') ?? '';
  const deliveryLat    = parseFloat(params.get('deliveryLat') ?? '0');
  const deliveryLng    = parseFloat(params.get('deliveryLng') ?? '0');
  // Cart items and totals
  const cartItemsRaw = params.get('cartItems') ?? '[]';
  const cartItems: Array<{ size: number; quantity: number }> = JSON.parse(cartItemsRaw);
  const total          = parseFloat(params.get('total') ?? '0');
  // summary display
  const summaryLabel   = cartItems.map((c) => `${c.size}kg ×${c.quantity}`).join(', ');

  const [method, setMethod]       = useState<'mobile_money' | 'cash'>('mobile_money');
  const [provider, setProvider]   = useState('mtn');
  const [momoNumber, setMomoNumber] = useState('');
  const [loading, setLoading]     = useState(false);

  const momoCharge = method === 'mobile_money' ? parseFloat((total * MOMO_CHARGE_PCT).toFixed(2)) : 0;
  const grandTotal = total + momoCharge;

  async function handleConfirm() {
    if (method === 'mobile_money' && !momoNumber.trim()) {
      toast.error('Enter your MoMo number'); return;
    }
    setLoading(true);
    try {
      const { data } = await ordersApi.create({
        stationId,
        cylinders: cartItems.map(({ size, quantity }) => ({ size, quantity })),
        orderType: 'delivery',
        deliveryAddress: { street: deliveryStreet, city: deliveryCity, lat: deliveryLat, lng: deliveryLng },
        paymentMethod: method,
        paymentProvider: method === 'mobile_money' ? provider : undefined,
        ...(method === 'mobile_money' ? { momoNumber: `+233${momoNumber.replace(/^0/, '')}` } : {}),
        ...(schedule === 'scheduled' && scheduledDate ? { scheduledFor: scheduledDate } : {}),
      });

      if (data.payment?.authorizationUrl) {
        window.location.href = data.payment.authorizationUrl;
      } else {
        toast.success('Order placed!');
        const orderId = data.order?._id || data.order?.id;
        if (orderId) {
          router.push(`/user/orders/${orderId}`);
        } else {
          router.push('/user/orders');
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to place order');
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
        <h1 className="text-base font-bold text-[var(--text-primary)]">Payment</h1>
      </div>

      <div className="px-4 py-8 max-w-lg mx-auto space-y-6">

        {/* Total amount hero */}
        <div className="text-center">
          <p className="text-xs text-[var(--text-muted)] mb-1">Total Amount</p>
          <p className="text-4xl font-black text-[var(--text-primary)]">GHS {grandTotal.toFixed(2)}</p>
          <div className="inline-block mt-2 bg-[var(--bg-card2)] border border-[var(--border)] rounded-full px-3 py-1">
            <p className="text-xs text-[var(--text-muted)]">{summaryLabel}</p>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)] mb-3">Payment Method</p>

          {/* MTN MoMo */}
          <div className={cn('bg-[var(--bg-card)] border-2 rounded-2xl p-4 mb-3 transition-all',
            method === 'mobile_money' ? 'border-brand-500' : 'border-[var(--border)]'
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xs font-black text-black">MTN</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">MTN Mobile Money</p>
                  <p className="text-xs text-[var(--text-muted)]">Instant payment</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-white bg-brand-500 px-2 py-0.5 rounded-full">DEFAULT</span>
                <button onClick={() => setMethod('mobile_money')}
                  className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                    method === 'mobile_money' ? 'border-brand-500' : 'border-[var(--text-muted)]')}>
                  {method === 'mobile_money' && <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />}
                </button>
              </div>
            </div>

            {method === 'mobile_money' && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[var(--text-muted)]">MoMo Number</p>
                  <button className="text-xs font-semibold text-brand-500">Edit</button>
                </div>
                <div className="flex items-center gap-2 bg-[var(--bg-card2)] border border-[var(--border)] rounded-xl overflow-hidden">
                  <div className="px-3 py-3 border-r border-[var(--border)] shrink-0">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">+233</span>
                  </div>
                  <input
                    type="tel"
                    value={momoNumber}
                    onChange={(e) => setMomoNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="24 245 8248"
                    className="flex-1 bg-transparent px-3 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)]">
                  <span>Transaction charges</span>
                  <span>GHS {momoCharge.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          {/* Cash on pickup */}
          <button onClick={() => setMethod('cash')}
            className={cn('w-full flex items-center gap-3 p-4 bg-[var(--bg-card)] border-2 rounded-2xl text-left transition-all',
              method === 'cash' ? 'border-brand-500' : 'border-[var(--border)]'
            )}>
            <div className="w-10 h-10 bg-[var(--bg-card2)] rounded-xl flex items-center justify-center shrink-0">
              <span className="text-lg">💵</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--text-primary)]">Cash on pickup</p>
              <p className="text-xs text-[var(--text-muted)]">Pay when courier arrives</p>
            </div>
            <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
              method === 'cash' ? 'border-brand-500' : 'border-[var(--text-muted)]')}>
              {method === 'cash' && <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />}
            </div>
          </button>
        </div>

        {/* Info box */}
        {method === 'mobile_money' && (
          <div className="flex items-start gap-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
            <div className="w-8 h-8 bg-brand-500/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <Info className="w-4 h-4 text-brand-500" />
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Tap "Confirm &amp; Pay" below. A prompt will appear on your phone. Enter your 4 digit pin to approve the transaction of {grandTotal.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-[var(--bg-card)] border-t border-[var(--border)] px-4 py-4 z-20">
        <button onClick={handleConfirm} disabled={loading}
          className="w-full h-14 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-colors">
          {loading
            ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <><span>Confirm &amp; Pay</span><CheckCircle2 className="w-5 h-5" /></>
          }
        </button>
      </div>
    </div>
  );
}
