'use client';
import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Zap, Calendar, Camera,
  Flame, MapPin, Star, CheckCircle2, Loader2, Navigation,
} from 'lucide-react';
import { stationsApi, ordersApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import type { PickedLocation } from '@/components/LocationPicker';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

const DELIVERY_FEE = 15;

interface StationT {
  id: string; _id?: string; name: string; address: string;
  distanceKm: number; ratingAvg: number; cylinderListings: any[];
}

// ─── Station selector (used when no stationId in params) ─────────────────────
function StationSelector({ selected, onSelect }: { selected: StationT | null; onSelect: (s: StationT) => void }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [detecting, setDetecting] = useState(true);

  useEffect(() => {
    // Try saved location first for instant load
    const lat = localStorage.getItem('gasgo_lat');
    const lng = localStorage.getItem('gasgo_lng');
    if (lat && lng) {
      setCoords({ lat: parseFloat(lat), lng: parseFloat(lng) });
      setDetecting(false);
      return;
    }
    navigator.geolocation?.getCurrentPosition(
      ({ coords: c }) => { setCoords({ lat: c.latitude, lng: c.longitude }); setDetecting(false); },
      () => setDetecting(false),
      { timeout: 10000 }
    );
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['stations', 'nearby', coords],
    queryFn: () => stationsApi.getNearby(coords!.lat, coords!.lng, 25).then((r) => r.data),
    enabled: !!coords,
  });
  const stations: StationT[] = (data?.stations ?? []).map((s: any) => ({
    ...s,
    id: s._id?.toString() ?? s.id,
  }));

  return (
    <div className="space-y-2">
      {(detecting || isLoading) && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Finding nearby stations…
        </div>
      )}
      {!detecting && !isLoading && stations.length === 0 && (
        <div className="text-center py-8">
          <Navigation className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-sm text-[var(--text-muted)]">No stations found nearby.</p>
        </div>
      )}
      {stations.map((s) => {
        const isSel = !!selected && selected.id === s.id;
        const minPrice = s.cylinderListings?.filter((l: any) => l.isAvailable)
          .reduce((min: number, l: any) => Math.min(min, l.fillPrice), Infinity);
        return (
          <button key={s.id} onClick={() => onSelect(s)}
            className={cn('w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all',
              isSel ? 'border-brand-500 bg-brand-500/10' : 'border-[var(--border)] hover:border-brand-500/50'
            )}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              isSel ? 'bg-brand-500' : 'bg-brand-500/15')}>
              <Flame className={cn('w-5 h-5', isSel ? 'text-white' : 'text-brand-500')} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{s.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <MapPin className="w-3 h-3" />{s.distanceKm} km
                </span>
                <span className="flex items-center gap-1 text-xs text-amber-500">
                  <Star className="w-3 h-3 fill-current" />{s.ratingAvg?.toFixed(1)}
                </span>
                {minPrice !== Infinity && (
                  <span className="text-xs font-bold text-brand-500">From GHS {minPrice}</span>
                )}
              </div>
            </div>
            {isSel && <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const params = useSearchParams();
  const router = useRouter();

  const stationIdParam = params.get('stationId');
  const initSize       = parseInt(params.get('size') || '0');

  // If stationId provided (from station card click), skip station selection
  const [selectedStation, setSelectedStation] = useState<StationT | null>(null);
  const effectiveStationId = stationIdParam ?? selectedStation?.id ?? null;

  // Fetch station data once we have an ID
  const { data: stationData } = useQuery({
    queryKey: ['station', effectiveStationId],
    queryFn: () => stationsApi.getById(effectiveStationId!).then((r) => r.data.station),
    enabled: !!effectiveStationId,
    staleTime: 60000,
  });

  const availableSizes: number[] = stationData?.cylinderListings
    ?.filter((l: any) => l.isAvailable && l.stockCount > 0)
    ?.map((l: any) => l.size) ?? [3, 4, 5, 6, 9, 11, 12, 14, 15, 18, 19, 20, 30, 47, 48];

  // Cart
  const [cart, setCart] = useState<Record<number, number>>(
    initSize ? { [initSize]: 1 } : {}
  );

  function setQty(size: number, delta: number) {
    setCart((prev) => {
      const next = (prev[size] ?? 0) + delta;
      if (next <= 0) { const { [size]: _, ...rest } = prev; return rest; }
      const listing = stationData?.cylinderListings?.find((l: any) => l.size === size);
      if (listing && next > listing.stockCount) return prev;
      return { ...prev, [size]: next };
    });
  }

  const totalQty  = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartItems = Object.entries(cart).map(([size, qty]) => {
    const l = stationData?.cylinderListings?.find((l: any) => l.size === Number(size));
    const price = l?.fillPrice ?? 0;
    return { size: Number(size), quantity: qty, unitPrice: price, subtotal: price * qty };
  });
  const subtotal = cartItems.reduce((a, b) => a + b.subtotal, 0);
  const total    = subtotal + DELIVERY_FEE;

  // Schedule
  const [schedule, setSchedule]         = useState<'asap' | 'scheduled'>('asap');
  const [scheduledDate, setScheduledDate] = useState('');

  // Pickup + delivery locations
  const [pickupLoc, setPickupLoc]       = useState<PickedLocation | null>(null);
  const [deliveryLoc, setDeliveryLoc]   = useState<PickedLocation | null>(null);
  const [sameAsPickup, setSameAsPickup] = useState(false);
  const [showPickupPicker, setShowPickupPicker]   = useState(false);
  const [showDeliveryPicker, setShowDeliveryPicker] = useState(false);

  // Auto-seed pickup from saved GPS on mount
  useEffect(() => {
    const lat   = localStorage.getItem('gasgo_lat');
    const lng   = localStorage.getItem('gasgo_lng');
    const label = localStorage.getItem('gasgo_location_label');
    if (lat && lng) {
      setPickupLoc({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        street: label || 'Current location',
        city: '',
        formatted: label || 'Current location',
      });
    }
  }, []);

  // Photo
  const [photo, setPhoto]   = useState<string | null>(null);
  const photoRef            = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleContinue() {
    if (!effectiveStationId)  { toast.error('Please select a station'); return; }
    if (totalQty === 0)        { toast.error('Select at least one cylinder'); return; }
    if (!pickupLoc)            { toast.error('Please set your pickup location'); return; }
    const effectiveDelivery = sameAsPickup ? pickupLoc : deliveryLoc;
    if (!effectiveDelivery)    { toast.error('Please set your delivery location'); return; }

    if (photo) sessionStorage.setItem('checkout_photo', photo);
    else sessionStorage.removeItem('checkout_photo');

    const stationName = stationData?.name ?? selectedStation?.name ?? '';
    const stationAddr = stationData?.address ?? selectedStation?.address ?? '';

    const q = new URLSearchParams({
      stationId:      effectiveStationId,
      stationName,
      stationAddress: stationAddr,
      serviceType:    'refill',
      cartItems:      JSON.stringify(cartItems),
      schedule,
      ...(scheduledDate ? { scheduledDate } : {}),
      pickupStreet:   pickupLoc.street,
      pickupCity:     pickupLoc.city,
      pickupLat:      String(pickupLoc.lat),
      pickupLng:      String(pickupLoc.lng),
      pickupLabel:    pickupLoc.formatted,
      deliveryStreet: effectiveDelivery.street,
      deliveryCity:   effectiveDelivery.city,
      deliveryLat:    String(effectiveDelivery.lat),
      deliveryLng:    String(effectiveDelivery.lng),
      deliveryLabel:  effectiveDelivery.formatted,
      subtotal:       String(subtotal),
      deliveryFee:    String(DELIVERY_FEE),
      total:          String(total),
    });
    router.push(`/user/checkout/review?${q.toString()}`);
  }

  return (
    <div className="min-h-full bg-[var(--bg)] pb-40">
      {showPickupPicker && (
        <LocationPicker
          onConfirm={(loc) => { setPickupLoc(loc); setShowPickupPicker(false); }}
          onClose={() => setShowPickupPicker(false)}
          initial={pickupLoc ? { lat: pickupLoc.lat, lng: pickupLoc.lng } : null}
        />
      )}
      {showDeliveryPicker && (
        <LocationPicker
          onConfirm={(loc) => { setDeliveryLoc(loc); setShowDeliveryPicker(false); }}
          onClose={() => setShowDeliveryPicker(false)}
          initial={deliveryLoc ? { lat: deliveryLoc.lat, lng: deliveryLoc.lng } : pickupLoc ? { lat: pickupLoc.lat, lng: pickupLoc.lng } : null}
        />
      )}

      {/* Header */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)] px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[var(--bg-card2)] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
        <h1 className="text-base font-bold text-[var(--text-primary)]">Place Order</h1>
      </div>

      <div className="px-4 py-5 space-y-7 max-w-lg mx-auto">

        {/* ── Station selector (only when no stationId in URL) ── */}
        {!stationIdParam && (
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)] mb-3">1. Select Station</p>
            <StationSelector selected={selectedStation} onSelect={setSelectedStation} />
          </div>
        )}

        {/* Station info banner (when coming from station card) */}
        {stationIdParam && stationData && (
          <div className="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-3">
            <div className="w-10 h-10 bg-brand-500/15 rounded-xl flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-brand-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--text-primary)] truncate">{stationData.name}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{stationData.address}</p>
            </div>
            <button onClick={() => router.back()} className="text-xs text-brand-500 font-semibold shrink-0">Change</button>
          </div>
        )}

        {/* ── Cylinder Details ── */}
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)] mb-1">
            {stationIdParam ? '1.' : '2.'} Cylinder Details
          </p>
          <p className="text-xs text-[var(--text-muted)] mb-3">Tick to select, use +/− to adjust quantity</p>
          <div className="space-y-2.5">
            {availableSizes.map((size) => {
              const qty      = cart[size] ?? 0;
              const checked  = qty > 0;
              const l        = stationData?.cylinderListings?.find((li: any) => li.size === size);
              const price    = l?.fillPrice ?? null;
              const stock    = l?.stockCount ?? 99;
              const lowStock = stock <= 5;
              return (
                <div key={size} className={cn(
                  'bg-[var(--bg-card)] rounded-2xl border-2 p-4 transition-all',
                  checked ? 'border-brand-500 bg-brand-500/10' : 'border-[var(--border)] hover:border-brand-500/50'
                )}>
                  <div className="flex items-center gap-3">
                    <button onClick={() => checked ? setQty(size, -qty) : setQty(size, 1)} className="shrink-0">
                      <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                        checked ? 'bg-brand-500 border-brand-500' : 'border-[var(--text-muted)] bg-[var(--bg-card2)]'
                      )}>
                        {checked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                    <div className={cn('w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0',
                      checked ? 'bg-brand-500' : 'bg-[var(--bg-card2)]'
                    )}>
                      <span className={cn('text-lg font-black leading-none', checked ? 'text-white' : 'text-[var(--text-primary)]')}>{size}</span>
                      <span className={cn('text-[10px] font-bold', checked ? 'text-white/70' : 'text-[var(--text-muted)]')}>kg</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[var(--text-primary)] text-sm">
                        {size}kg{price ? ` · GHS ${price}` : ''}
                      </p>
                      {l && (
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full',
                          lowStock ? 'text-amber-500 bg-amber-500/10' : 'text-green-500 bg-green-500/10'
                        )}>
                          {lowStock ? `Only ${stock} left` : `${stock} in stock`}
                        </span>
                      )}
                    </div>
                    {checked && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setQty(size, -1)}
                          className="w-7 h-7 rounded-full border-2 border-brand-500/30 bg-[var(--bg-card)] flex items-center justify-center text-brand-500 font-bold">
                          −
                        </button>
                        <span className="w-5 text-center font-black text-sm text-brand-500">{qty}</span>
                        <button onClick={() => setQty(size, 1)} disabled={qty >= stock}
                          className="w-7 h-7 rounded-full border-2 border-brand-500/30 bg-[var(--bg-card)] flex items-center justify-center text-brand-500 font-bold disabled:opacity-30">
                          +
                        </button>
                      </div>
                    )}
                  </div>
                  {checked && price && (
                    <div className="mt-3 pt-3 border-t border-brand-500/20 flex justify-between text-xs">
                      <span className="text-brand-500">{qty} × GHS {price}</span>
                      <span className="font-bold text-brand-500">GHS {(price * qty).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Delivery Schedule ── */}
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)] mb-3">
            {stationIdParam ? '2.' : '3.'} Delivery Schedule
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'asap',      icon: Zap,      label: 'ASAP',     sub: '~30–45 mins' },
              { value: 'scheduled', icon: Calendar, label: 'Schedule', sub: 'Pick a date/time' },
            ].map(({ value, icon: Icon, label, sub }) => {
              const active = schedule === value;
              return (
                <button key={value} onClick={() => setSchedule(value as any)}
                  className={cn('flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                    active ? 'border-brand-500 bg-brand-500/10' : 'border-[var(--border)] bg-[var(--bg-card)]'
                  )}>
                  <div className={cn('w-12 h-12 rounded-full flex items-center justify-center',
                    active ? 'bg-brand-500' : 'bg-[var(--bg-card2)]')}>
                    <Icon className={cn('w-6 h-6', active ? 'text-white' : 'text-[var(--text-muted)]')} />
                  </div>
                  <p className={cn('text-sm font-bold', active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]')}>{label}</p>
                  <p className="text-xs text-[var(--text-muted)]">{sub}</p>
                </button>
              );
            })}
          </div>
          {schedule === 'scheduled' && (
            <input type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
              className="mt-3 w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500" />
          )}
        </div>

        {/* ── Pickup Location ── */}
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)] mb-1">
            {stationIdParam ? '3.' : '4.'} Pickup Location
          </p>
          <p className="text-xs text-[var(--text-muted)] mb-3">Where the rider will collect the cylinder from you</p>
          <button onClick={() => setShowPickupPicker(true)}
            className={cn('w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all',
              pickupLoc ? 'border-brand-500 bg-brand-500/10' : 'border-dashed border-[var(--border)]'
            )}>
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
              pickupLoc ? 'bg-brand-500' : 'bg-[var(--bg-card2)]')}>
              <MapPin className={cn('w-4 h-4', pickupLoc ? 'text-white' : 'text-[var(--text-muted)]')} />
            </div>
            <div className="flex-1 min-w-0">
              {pickupLoc ? (
                <>
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{pickupLoc.street}</p>
                  {pickupLoc.city && <p className="text-xs text-[var(--text-muted)] truncate">{pickupLoc.city}</p>}
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-[var(--text-muted)]">Set pickup location</p>
                  <p className="text-xs text-[var(--text-muted)]">Tap to pick on map</p>
                </>
              )}
            </div>
            <span className="text-xs text-brand-500 font-semibold shrink-0">
              {pickupLoc ? 'Change' : 'Set'}
            </span>
          </button>
        </div>

        {/* ── Delivery Location ── */}
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)] mb-1">
            {stationIdParam ? '4.' : '5.'} Delivery Location
          </p>
          <p className="text-xs text-[var(--text-muted)] mb-3">Where the cylinder should be delivered after refill</p>

          {/* Same as pickup toggle */}
          <button
            onClick={() => { setSameAsPickup((v) => !v); if (!sameAsPickup) setDeliveryLoc(null); }}
            className="flex items-center gap-2 mb-3"
          >
            <div className={cn(
              'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
              sameAsPickup ? 'bg-brand-500 border-brand-500' : 'border-[var(--text-muted)]'
            )}>
              {sameAsPickup && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-sm text-[var(--text-primary)]">Same as pickup location</span>
          </button>

          {sameAsPickup && pickupLoc ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-500/10 border-2 border-brand-500">
              <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{pickupLoc.street}</p>
                {pickupLoc.city && <p className="text-xs text-[var(--text-muted)] truncate">{pickupLoc.city}</p>}
              </div>
            </div>
          ) : !sameAsPickup && (
            <button onClick={() => setShowDeliveryPicker(true)}
              className={cn('w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all',
                deliveryLoc ? 'border-brand-500 bg-brand-500/10' : 'border-dashed border-[var(--border)]'
              )}>
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                deliveryLoc ? 'bg-brand-500' : 'bg-[var(--bg-card2)]')}>
                <MapPin className={cn('w-4 h-4', deliveryLoc ? 'text-white' : 'text-[var(--text-muted)]')} />
              </div>
              <div className="flex-1 min-w-0">
                {deliveryLoc ? (
                  <>
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{deliveryLoc.street}</p>
                    {deliveryLoc.city && <p className="text-xs text-[var(--text-muted)] truncate">{deliveryLoc.city}</p>}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-[var(--text-muted)]">Set delivery location</p>
                    <p className="text-xs text-[var(--text-muted)]">Tap to pick on map</p>
                  </>
                )}
              </div>
              <span className="text-xs text-brand-500 font-semibold shrink-0">
                {deliveryLoc ? 'Change' : 'Set'}
              </span>
            </button>
          )}
        </div>

        {/* ── Photo ── */}
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)] mb-3">
            {stationIdParam ? '5.' : '6.'} Picture of cylinder(s) <span className="text-[var(--text-muted)] font-normal">(optional)</span>
          </p>
          {photo ? (
            <div className="relative">
              <img src={photo} alt="Cylinder" className="w-full h-48 object-cover rounded-2xl border border-[var(--border)]" />
              <button onClick={() => { setPhoto(null); if (photoRef.current) photoRef.current.value = ''; }}
                className="absolute top-2 right-2 w-8 h-8 bg-[var(--bg-card)] rounded-full shadow flex items-center justify-center">
                <span className="text-[var(--text-primary)] text-lg leading-none">×</span>
              </button>
            </div>
          ) : (
            <button onClick={() => photoRef.current?.click()}
              className="w-full h-40 rounded-2xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-3 hover:border-brand-500 transition-all">
              <div className="w-12 h-12 bg-[var(--bg-card2)] rounded-full flex items-center justify-center">
                <Camera className="w-6 h-6 text-[var(--text-muted)]" />
              </div>
              <p className="text-sm text-[var(--text-muted)]">Tap to add photo</p>
            </button>
          )}
          <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
        </div>
      </div>

      {/* ── Fixed bottom bar ── */}
      <div className="fixed bottom-0 inset-x-0 bg-[var(--bg-card)] border-t border-[var(--border)] px-4 pt-3 pb-6 z-20">
        <div className="max-w-lg mx-auto">
          <div className="space-y-1 mb-3 text-sm">
            {cartItems.map((item) => (
              <div key={item.size} className="flex justify-between text-[var(--text-muted)]">
                <span>{item.size}kg × {item.quantity}</span>
                <span>GHS {item.subtotal.toFixed(2)}</span>
              </div>
            ))}
            {totalQty === 0 && <p className="text-[var(--text-muted)] text-xs">No cylinders selected</p>}
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>Delivery Fee</span>
              <span>GHS {DELIVERY_FEE.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-[var(--text-primary)]">
              <span>Total Estimate</span>
              <span className="text-brand-500">GHS {total.toFixed(2)}</span>
            </div>
          </div>
          <button onClick={handleContinue} disabled={totalQty === 0}
            className="w-full h-14 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-colors">
            Continue <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
