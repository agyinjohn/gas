'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Tag, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { checkoutPhoto } from '@/lib/checkoutPhoto';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export default function ReviewOrderPage() {
  const params = useSearchParams();
  const router = useRouter();

  const stationId      = params.get('stationId') ?? '';
  const stationName    = params.get('stationName') ?? 'Station';
  const stationAddress = params.get('stationAddress') ?? '';
  const serviceType    = params.get('serviceType') ?? 'refill';
  const schedule       = params.get('schedule') ?? 'asap';
  const scheduledDate  = params.get('scheduledDate') ?? '';
  const isQuickOrder   = params.get('isQuickOrder') === 'true' || params.get('source') === 'quick';

  // Pickup location (where rider collects from customer)
  const pickupStreet  = params.get('pickupStreet') ?? '';
  const pickupCity    = params.get('pickupCity') ?? '';
  const pickupLabel   = params.get('pickupLabel') ?? '';
  const pickupLat     = params.get('pickupLat') ? parseFloat(params.get('pickupLat')!) : null;
  const pickupLng     = params.get('pickupLng') ? parseFloat(params.get('pickupLng')!) : null;

  // Delivery location (where cylinder gets delivered after refill)
  const deliveryStreet = params.get('deliveryStreet') ?? '';
  const deliveryCity   = params.get('deliveryCity') ?? '';
  const deliveryLat    = params.get('deliveryLat') ?? '';
  const deliveryLng    = params.get('deliveryLng') ?? '';
  const deliveryLabel  = params.get('deliveryLabel') ?? '';

  const cartItemsRaw = params.get('cartItems') ?? '[]';
  const [cartItems, setCartItems] = useState<Array<{ size: number; quantity: number; unitPrice: number; subtotal: number }>>(() => {
    // Priority order for loading cart items:
    // 1. editOrderCart (if user is editing from review)
    // 2. checkoutCart (regular checkout flow)
    // 3. quickOrderCart (initial quick order flow)
    // 4. URL params (legacy fallback)
    
    // Priority 1: Try sessionStorage for edit flow (HIGHEST - user editing)
    try {
      const sessionData = sessionStorage.getItem('editOrderCart');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        console.log('DEBUG: Loaded cartItems from editOrderCart (sessionStorage):', parsed);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse editOrderCart sessionStorage:', e);
    }
    
    // Priority 2: Try sessionStorage for regular checkout
    try {
      const sessionData = sessionStorage.getItem('checkoutCart');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        console.log('DEBUG: Loaded cartItems from checkoutCart (sessionStorage):', parsed);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse checkoutCart sessionStorage:', e);
    }
    
    // Priority 3: Try quickOrderCart from sessionStorage
    try {
      const sessionData = sessionStorage.getItem('quickOrderCart');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        console.log('DEBUG: Loaded cartItems from quickOrderCart (sessionStorage):', parsed);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse quickOrderCart sessionStorage:', e);
    }
    
    // Priority 4: Fallback to URL params (legacy)
    try {
      const parsed = JSON.parse(cartItemsRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log('DEBUG: Loaded cartItems from URL params:', parsed);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse cartItemsRaw from URL:', e);
    }
    return [];
  });
  
  useEffect(() => {
    console.log('DEBUG: Review page mounted. cartItemsRaw:', cartItemsRaw);
    
    // Priority 1: Try editOrderCart from sessionStorage (if editing - HIGHEST)
    try {
      const sessionData = sessionStorage.getItem('editOrderCart');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        console.log('DEBUG: CartItems updated from editOrderCart:', parsed);
        setCartItems(parsed);
        return;
      }
    } catch (e) {
      console.error('Failed to parse editOrderCart in useEffect:', e);
    }
    
    // Priority 2: Try checkoutCart from sessionStorage
    try {
      const sessionData = sessionStorage.getItem('checkoutCart');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        console.log('DEBUG: CartItems updated from checkoutCart:', parsed);
        setCartItems(parsed);
        return;
      }
    } catch (e) {
      console.error('Failed to parse checkoutCart in useEffect:', e);
    }
    
    // Priority 3: Try quickOrderCart from sessionStorage
    try {
      const sessionData = sessionStorage.getItem('quickOrderCart');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        console.log('DEBUG: CartItems updated from quickOrderCart:', parsed);
        setCartItems(parsed);
        return;
      }
    } catch (e) {
      console.error('Failed to parse quickOrderCart in useEffect:', e);
    }
    
    // Priority 4: Fallback to URL params
    try {
      const parsed = JSON.parse(cartItemsRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log('DEBUG: CartItems updated from URL params:', parsed);
        setCartItems(parsed);
      } else {
        console.log('DEBUG: cartItemsRaw is empty or invalid:', cartItemsRaw);
      }
    } catch (e) {
      console.error('Failed to parse cartItems from URL in useEffect:', e);
    }
  }, []);
  
  const subtotal = parseFloat(params.get('subtotal') ?? '0');
  const passedDeliveryFee = parseFloat(params.get('deliveryFee') ?? '0');

  // Station coords passed from checkout
  const stationLat = params.get('stationLat') ? parseFloat(params.get('stationLat')!) : null;
  const stationLng = params.get('stationLng') ? parseFloat(params.get('stationLng')!) : null;

  // Fetch pricing config
  const { data: pricingData } = useQuery({
    queryKey: ['pricing'],
    queryFn: () => api.get('/api/v1/stations/pricing').then((r) => r.data.pricing),
    staleTime: 300000,
  });

  // Compute delivery fee: user (deliveryAddress) → station
  const [deliveryFee, setDeliveryFee] = useState(passedDeliveryFee);
  useEffect(() => {
    if (!pricingData) return;
    const uLat = pickupLat ?? parseFloat(deliveryLat);
    const uLng = pickupLng ?? parseFloat(deliveryLng);
    const sLat = stationLat;
    const sLng = stationLng;
    if (!uLat || !uLng || !sLat || !sLng) return;

    const baseFee        = pricingData.baseFee        ?? 5;
    const pricePerKm     = pricingData.pricePerKm     ?? 2;
    const freeKm         = pricingData.freeKm         ?? 2;
    const maxDeliveryFee = pricingData.maxDeliveryFee ?? 50;

    // Haversine
    const R = 6371;
    const dLat = ((sLat - uLat) * Math.PI) / 180;
    const dLng = ((sLng - uLng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((uLat * Math.PI) / 180) * Math.cos((sLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const billableKm = Math.max(0, distKm - freeKm);
    const fee = Math.min(maxDeliveryFee, Math.max(baseFee, baseFee + billableKm * pricePerKm));
    setDeliveryFee(+fee.toFixed(2));
  }, [pricingData, pickupLat, pickupLng, deliveryLat, deliveryLng, stationLat, stationLng]);

  // Calculate subtotal from cartItems if not passed in params
  const calculatedSubtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const finalSubtotal = subtotal > 0 ? subtotal : calculatedSubtotal;
  
  console.log('DEBUG Review Page:', {
    cartItems,
    subtotalFromParams: subtotal,
    calculatedSubtotal,
    finalSubtotal,
    deliveryFee,
    pickupLat,
    pickupLng,
    deliveryLat,
    deliveryLng,
    stationId,
    stationName,
  });
  
  const total = finalSubtotal + deliveryFee;

  // Load photo from sessionStorage
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    setPhoto(checkoutPhoto.get());
  }, []);

  // Resolve a human-readable address for a location
  // Returns { title, subtitle } — title is the label, subtitle is the street/area address
  const resolveLocation = (locLabel: string, street: string, city: string, lat: number | null, lng: number | null) => {
    const isCurrentLocation = locLabel === 'Current location' || (!street && !city);
    if (isCurrentLocation) {
      const fullAddress = localStorage.getItem('gasgo_location_address') ?? '';
      return {
        title: 'Current location',
        subtitle: fullAddress || localStorage.getItem('gasgo_location_label') || '',
      };
    }
    return {
      title: locLabel || street || 'Location',
      subtitle: [street, city].filter(Boolean).join(', '),
    };
  };

  function handleProceed() {
    const q = new URLSearchParams({
      stationId, stationName, stationAddress,
      serviceType,
      cartItems: JSON.stringify(cartItems),
      schedule, ...(scheduledDate ? { scheduledDate } : {}),
      pickupStreet, pickupCity,
      pickupLat: pickupLat ? String(pickupLat) : '',
      pickupLng: pickupLng ? String(pickupLng) : '',
      pickupLabel,
      deliveryStreet, deliveryCity, deliveryLat, deliveryLng, deliveryLabel,
      subtotal: String(finalSubtotal), deliveryFee: String(deliveryFee), total: String(finalSubtotal + deliveryFee),
    });
    router.push(`/user/payment?${q.toString()}`);
  }

  function handleEdit() {
    // Store current cart items in sessionStorage for checkout to retrieve
    sessionStorage.setItem('editOrderCart', JSON.stringify(cartItems));
    
    // Go back to checkout page with all current order data
    const q = new URLSearchParams({
      stationId,
      schedule,
      ...(scheduledDate ? { scheduledDate } : {}),
      pickupStreet,
      pickupCity,
      pickupLat: pickupLat ? String(pickupLat) : '',
      pickupLng: pickupLng ? String(pickupLng) : '',
      pickupLabel,
      deliveryStreet,
      deliveryCity,
      deliveryLat,
      deliveryLng,
      deliveryLabel,
      isQuickOrder: params.get('isQuickOrder') ?? 'false',
      fromReview: 'true',
    });
    router.push(`/user/checkout?${q.toString()}`);
  }

  return (
    <div className="min-h-full bg-[var(--bg)] pb-32">
      {/* Header */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)] px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => {
          if (isQuickOrder) {
            router.push('/user');
          } else {
            router.back();
          }
        }} className="w-9 h-9 rounded-full bg-[var(--bg-card2)] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
        <h1 className="text-base font-bold text-[var(--text-primary)]">Review Order</h1>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">

        {/* Order Details */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-sm font-bold text-[var(--text-primary)]">Order Details</p>
            <button onClick={handleEdit} className="text-sm font-semibold text-brand-500">Edit</button>
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
          {cartItems && cartItems.length > 0 ? (
            cartItems.map((item) => (
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
            ))
          ) : (
            <div className="px-4 py-3 text-center text-sm text-[var(--text-muted)]">
              No items in cart
            </div>
          )}
        </div>

        {/* Delivery Info */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-[var(--text-primary)]">Delivery Info</p>
            <button onClick={handleEdit} className="text-sm font-semibold text-brand-500">Edit</button>
          </div>
          <div className="space-y-3">
            {/* Pickup location */}
            <div className="pb-3 border-b border-[var(--border)]">
              <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">Pickup Location</p>
              {(() => {
                const { title, subtitle } = resolveLocation(pickupLabel, pickupStreet, pickupCity, pickupLat, pickupLng);
                return (
                  <>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
                    {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
                  </>
                );
              })()}
            </div>
            {/* Delivery location */}
            <div className="pb-3 border-b border-[var(--border)]">
              <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">Delivery Location</p>
              {(() => {
                const { title, subtitle } = resolveLocation(deliveryLabel, deliveryStreet, deliveryCity, parseFloat(deliveryLat), parseFloat(deliveryLng));
                return (
                  <>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
                    {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
                  </>
                );
              })()}
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
              <span>GHS {finalSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[var(--text-muted)] pb-3 border-b border-[var(--border)]">
              <span>Delivery Fee {stationLat && pickupLat ? (() => {
                const R = 6371;
                const dLat = ((stationLat - pickupLat!) * Math.PI) / 180;
                const dLng = ((stationLng! - pickupLng!) * Math.PI) / 180;
                const a = Math.sin(dLat/2)**2 + Math.cos((pickupLat!*Math.PI)/180)*Math.cos((stationLat*Math.PI)/180)*Math.sin(dLng/2)**2;
                const d = +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
                return <span className="text-xs text-[var(--text-muted)]"> ({d} km)</span>;
              })() : null}</span>
              <span>GHS {deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="font-bold text-[var(--text-primary)]">Total amount to pay</span>
              <span className="font-black text-brand-500 text-base">GHS {(finalSubtotal + deliveryFee).toFixed(2)}</span>
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
