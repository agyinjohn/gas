'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Tag } from 'lucide-react';
import Image from 'next/image';

const DELIVERY_FEE = 15;

export default function ReviewOrderPage() {
  const params = useSearchParams();
  const router = useRouter();

  const stationId      = params.get('stationId') ?? '';
  const stationName    = params.get('stationName') ?? 'Station';
  const stationAddress = params.get('stationAddress') ?? '';
  const serviceType    = params.get('serviceType') ?? 'refill';
  const schedule       = params.get('schedule') ?? 'asap';
  const scheduledDate  = params.get('scheduledDate') ?? '';

  // Pickup location (where rider collects from customer)
  const pickupStreet  = params.get('pickupStreet') ?? '';
  const pickupCity    = params.get('pickupCity') ?? '';
  const pickupLabel   = params.get('pickupLabel') ?? '';

  // Delivery location (where cylinder gets delivered after refill)
  const deliveryStreet = params.get('deliveryStreet') ?? '';
  const deliveryCity   = params.get('deliveryCity') ?? '';
  const deliveryLat    = params.get('deliveryLat') ?? '';
  const deliveryLng    = params.get('deliveryLng') ?? '';
  const deliveryLabel  = params.get('deliveryLabel') ?? '';

  const cartItemsRaw = params.get('cartItems') ?? '[]';
  const cartItems: Array<{ size: number; quantity: number; unitPrice: number; subtotal: number }> =
    JSON.parse(cartItemsRaw);
  const subtotal = parseFloat(params.get('subtotal') ?? '0');
  const total    = parseFloat(params.get('total') ?? '0');

  // Load photo from sessionStorage (not URL to avoid 431)
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    const stored = sessionStorage.getItem('checkout_photo');
    if (stored) setPhoto(stored);
  }, []);

  function handleProceed() {
    const q = new URLSearchParams({
      stationId, stationName, stationAddress,
      serviceType,
      cartItems: cartItemsRaw,
      schedule, ...(scheduledDate ? { scheduledDate } : {}),
      pickupStreet, pickupCity, pickupLabel,
      deliveryStreet, deliveryCity, deliveryLat, deliveryLng, deliveryLabel,
      subtotal: String(subtotal), deliveryFee: String(DELIVERY_FEE), total: String(total),
    });
    router.push(`/user/payment?${q.toString()}`);
  }

  return (
    <div className="min-h-full bg-[var(--bg)] pb-32">
      {/* Header */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)] px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[var(--bg-card2)] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
        <h1 className="text-base font-bold text-[var(--text-primary)]">Review Order</h1>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">

        {/* Order Details */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-sm font-bold text-[var(--text-primary)]">Order Details</p>
            <button onClick={() => router.back()} className="text-sm font-semibold text-brand-500">Edit</button>
          </div>

          {/* Cylinder photo */}
          {photo ? (
            <img src={photo} alt="Cylinder" className="w-full h-48 object-cover" />
          ) : (
            <div className="w-full h-32 bg-[var(--bg-card2)] flex items-center justify-center">
              <Image src="/LPG.png" alt="LPG" width={64} height={64} className="opacity-40" />
            </div>
          )}

          {/* Item rows */}
          {cartItems.map((item) => (
            <div key={item.size} className="flex items-center gap-3 px-4 py-3 border-t border-[var(--border)]">
              <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center shrink-0">
                <Image src="/LPG.png" alt="LPG" width={24} height={24} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[var(--text-primary)]">LPG Refill</p>
                <p className="text-xs text-[var(--text-muted)]">{item.size}kg Cylinder</p>
                <p className="text-xs text-[var(--text-muted)]">Qty: {item.quantity}</p>
              </div>
              <p className="font-black text-brand-500">GHS {item.subtotal.toFixed(2)}</p>
            </div>
          ))}
        </div>

        {/* Delivery Info */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-[var(--text-primary)]">Delivery Info</p>
            <button onClick={() => router.back()} className="text-sm font-semibold text-brand-500">Edit</button>
          </div>
          <div className="space-y-3">
            {/* Pickup location */}
            <div className="pb-3 border-b border-[var(--border)]">
              <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">Pickup Location</p>
              <p className="text-sm text-[var(--text-primary)]">{pickupStreet || pickupLabel}</p>
              {pickupCity && <p className="text-xs text-[var(--text-muted)]">{pickupCity}</p>}
            </div>
            {/* Delivery location */}
            <div className="pb-3 border-b border-[var(--border)]">
              <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">Delivery Location</p>
              <p className="text-sm text-[var(--text-primary)]">{deliveryStreet || deliveryLabel}</p>
              {deliveryCity && <p className="text-xs text-[var(--text-muted)]">{deliveryCity}</p>}
            </div>
            {/* Station */}
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">Station</p>
              <p className="text-sm text-[var(--text-primary)]">{stationName}</p>
              {stationAddress && <p className="text-xs text-[var(--text-muted)]">{stationAddress}</p>}
            </div>
            {schedule === 'scheduled' && scheduledDate && (
              <div className="pt-3 border-t border-[var(--border)]">
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">Scheduled For</p>
                <p className="text-sm text-[var(--text-primary)]">{new Date(scheduledDate).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Promo code — greyed out */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-3 flex items-center gap-3 opacity-50">
          <div className="w-9 h-9 bg-[var(--bg-card2)] rounded-xl flex items-center justify-center shrink-0">
            <Tag className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <input disabled placeholder="Add promo code"
            className="flex-1 bg-transparent text-sm text-[var(--text-muted)] outline-none cursor-not-allowed" />
          <button disabled className="text-sm font-semibold text-[var(--text-muted)] cursor-not-allowed">Apply</button>
        </div>

        {/* Payment Breakdown */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
          <p className="text-sm font-bold text-[var(--text-primary)] mb-3">Payment Breakdown</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>Subtotal</span>
              <span>GHS {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[var(--text-muted)] pb-3 border-b border-[var(--border)]">
              <span>Delivery Fee</span>
              <span>GHS {DELIVERY_FEE.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="font-bold text-[var(--text-primary)]">Total amount to pay</span>
              <span className="font-black text-brand-500 text-base">GHS {total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-[var(--bg-card)] border-t border-[var(--border)] px-4 py-4 z-20">
        <button onClick={handleProceed}
          className="w-full h-14 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-colors">
          Proceed to payment <ArrowLeft className="w-5 h-5 rotate-180" />
        </button>
      </div>
    </div>
  );
}
