'use client';
import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Zap, Calendar, Camera,
  Flame, MapPin, Star, CheckCircle2, Loader2, Navigation,
} from 'lucide-react';
import { stationsApi, ordersApi, api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { checkoutPhoto } from '@/lib/checkoutPhoto';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import type { PickedLocation } from '@/components/LocationPicker';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

const MIN_CYLINDER_PRICE = 20; // GHS — floor price regardless of station listing

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
        const minPrice = s.cylinderListings?.filter((l: any) => l.fillPrice > 0)
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
                  <span className="text-xs font-bold text-brand-500">From ₵{minPrice}</span>
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

interface LineItem {
  id: string;       // unique key per line
  size: number;
  quantity: number;
  price: string;    // user-entered price string
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const params = useSearchParams();
  const router = useRouter();

  const stationIdParam = params.get('stationId');
  const initSize       = parseInt(params.get('size') || '0');
  const quickOrderAmount = params.get('amount') ? parseFloat(params.get('amount')!) : null;
  const isQuickOrder   = params.get('source') === 'quick' || params.get('isQuickOrder') === 'true';
  const skipCheckout   = params.get('skipCheckout') === 'true';
  const fromReview     = params.get('fromReview') === 'true';
  const cartItemsParam = params.get('cartItems');
  const scheduleParam  = params.get('schedule') as 'asap' | 'scheduled' | null;
  const pickupLatParam = params.get('pickupLat');
  const pickupLngParam = params.get('pickupLng');
  const pickupLabelParam = params.get('pickupLabel');
  const deliveryLatParam = params.get('deliveryLat');
  const deliveryLngParam = params.get('deliveryLng');
  const deliveryLabelParam = params.get('deliveryLabel');
  const pickupCityParam = params.get('pickupCity');
  const deliveryCityParam = params.get('deliveryCity');
  const deliveryStreetParam = params.get('deliveryStreet');
  const pickupStreetParam = params.get('pickupStreet');

  const [selectedStation, setSelectedStation] = useState<StationT | null>(null);
  const effectiveStationId = stationIdParam ?? selectedStation?.id ?? null;

  const { data: stationData } = useQuery({
    queryKey: ['station', effectiveStationId],
    queryFn: () => stationsApi.getById(effectiveStationId!).then((r) => r.data.station),
    enabled: !!effectiveStationId,
    staleTime: 60000,
  });

  // Fetch live pricing config
  const { data: pricingData } = useQuery({
    queryKey: ['pricing'],
    queryFn: () => api.get('/api/v1/stations/pricing').then((r) => r.data.pricing),
    staleTime: 300000,
  });

  const availableSizes: number[] = stationData?.cylinderListings
    ?.filter((l: any) => l.fillPrice > 0)
    ?.map((l: any) => l.size)
    ?.sort((a: number, b: number) => a - b) ?? [];

  // Cart as array of line items — supports same size at different prices
  const [lines, setLines] = useState<LineItem[]>([]);

  // Schedule
  const [schedule, setSchedule]         = useState<'asap' | 'scheduled'>(scheduleParam ?? 'asap');
  const [scheduledDate, setScheduledDate] = useState('');

  // Pickup + delivery locations
  const [pickupLoc, setPickupLoc]       = useState<PickedLocation | null>(null);
  const [deliveryLoc, setDeliveryLoc]   = useState<PickedLocation | null>(null);
  const [sameAsPickup, setSameAsPickup] = useState(isQuickOrder || cartItemsParam ? true : false);
  const [showPickupPicker, setShowPickupPicker]   = useState(false);
  const [showDeliveryPicker, setShowDeliveryPicker] = useState(false);

  // Estimate delivery fee for bottom bar (user → station)
  const estimatedDeliveryFee = (() => {
    if (!pricingData || !pickupLoc || !stationData) return pricingData?.baseFee ?? 5;
    const baseFee    = pricingData.baseFee        ?? 5;
    const perKm      = pricingData.pricePerKm     ?? 2;
    const freeKm     = pricingData.freeKm         ?? 2;
    const maxFee     = pricingData.maxDeliveryFee ?? 50;
    const R = 6371;
    const dLat = ((stationData.lat - pickupLoc.lat) * Math.PI) / 180;
    const dLng = ((stationData.lng - pickupLoc.lng) * Math.PI) / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos((pickupLoc.lat*Math.PI)/180)*Math.cos((stationData.lat*Math.PI)/180)*Math.sin(dLng/2)**2;
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const billable = Math.max(0, distKm - freeKm);
    return +Math.min(maxFee, Math.max(baseFee, baseFee + billable * perKm)).toFixed(2);
  })();
  const DELIVERY_FEE = estimatedDeliveryFee;

  // Initialize lines from either cartItemsParam (editing) or initSize (new quick order)
  useEffect(() => {
    console.log('DEBUG: Checkout mount - cartItemsParam:', cartItemsParam, 'initSize:', initSize);
    
    // Priority 1: Try loading from editOrderCart sessionStorage (editing from review)
    try {
      const sessionData = sessionStorage.getItem('editOrderCart');
      if (sessionData) {
        const items = JSON.parse(sessionData);
        console.log('DEBUG: Loading cartItems from editOrderCart sessionStorage:', items);
        const loadedLines = items.map((item: any) => ({
          id: uid(),
          size: item.size,
          quantity: item.quantity,
          price: String(item.unitPrice),
        }));
        console.log('DEBUG: Loaded lines from sessionStorage:', loadedLines);
        setLines(loadedLines);
        return;
      }
    } catch (e) {
      console.error('Failed to parse editOrderCart from sessionStorage:', e);
    }
    
    // Priority 2: If editing from review, load cart items from URL params (legacy)
    if (cartItemsParam) {
      try {
        const items = JSON.parse(cartItemsParam);
        console.log('DEBUG: Loading cartItems from URL params:', items);
        const loadedLines = items.map((item: any) => ({
          id: uid(),
          size: item.size,
          quantity: item.quantity,
          price: String(item.unitPrice),
        }));
        console.log('DEBUG: Loaded lines from URL params:', loadedLines);
        setLines(loadedLines);
      } catch (e) {
        console.error('Failed to parse cart items from URL:', e);
      }
      return;
    }
    
    // Priority 3: For new quick order with initSize
    if (!initSize || !stationData) {
      console.log('DEBUG: Waiting for stationData or initSize not set');
      return;
    }
    
    console.log('DEBUG: Initializing new quick order with initSize:', initSize, 'quickOrderAmount:', quickOrderAmount);
    const listing = stationData.cylinderListings?.find((c: any) => c.size === initSize);
    const price = quickOrderAmount ?? listing?.fillPrice ?? '';
    
    console.log('DEBUG: Setting lines with initSize, price:', price);
    setLines([{ id: uid(), size: initSize, quantity: 1, price: String(price) }]);
  }, [cartItemsParam, stationData, initSize]);

  // Remove the old useEffect for pre-fill and cart items loading

  function addLine(size: number) {
    const minPrice = stationData?.cylinderListings?.find((l: any) => l.size === size)?.fillPrice ?? 0;
    const price = isQuickOrder && quickOrderAmount ? quickOrderAmount : minPrice;
    setLines((prev) => [...prev, { id: uid(), size, quantity: 1, price: String(price) }]);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function updateLine(id: string, field: 'quantity' | 'price', value: string | number) {
    setLines((prev) => prev.map((l) => l.id === id ? { ...l, [field]: value } : l));
  }

  function getMinPrice(_size: number) {
    return MIN_CYLINDER_PRICE;
  }

  function getMaxPrice(_size: number) {
    // Don't validate against available sizes - users can enter any amount
    return Infinity;
  }

  const cartItems = lines.map((l) => {
    const entered = parseFloat(l.price) || MIN_CYLINDER_PRICE;
    // Just ensure price is at least the minimum, no max limit
    const price = Math.max(MIN_CYLINDER_PRICE, entered);
    return { id: l.id, size: l.size, quantity: l.quantity, unitPrice: price, subtotal: price * l.quantity, customPrice: price };
  });

  const totalQty = lines.reduce((a, l) => a + l.quantity, 0);
  const subtotal = cartItems.reduce((a, b) => a + b.subtotal, 0);
  const total    = subtotal + DELIVERY_FEE;

  // Validate only that price is at least the minimum (20 GHS)
  const hasPriceError = cartItems.some((item) => {
    const entered = parseFloat(lines.find(l => l.id === item.id)?.price || '0');
    return lines.find(l => l.id === item.id)?.price !== '' && entered < MIN_CYLINDER_PRICE;
  });

  // Auto-seed pickup from saved GPS on mount, or from params if editing
  useEffect(() => {
    if (pickupLatParam && pickupLngParam) {
      // Coming from review edit
      setPickupLoc({
        lat: parseFloat(pickupLatParam),
        lng: parseFloat(pickupLngParam),
        street: pickupStreetParam || pickupLabelParam || 'Current location',
        city: pickupCityParam || '',
        formatted: pickupLabelParam || 'Current location',
      });
    } else {
      // First time, use saved location
      const lat   = localStorage.getItem('gasgo_lat');
      const lng   = localStorage.getItem('gasgo_lng');
      const label = localStorage.getItem('gasgo_location_label');
      const fullAddress = localStorage.getItem('gasgo_location_address') || label;
      if (lat && lng) {
        setPickupLoc({
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          street: fullAddress || 'Current location',
          city: '',
          formatted: label || 'Current location',
        });
      }
    }
  }, []);

  // Auto-seed delivery location if coming from review
  useEffect(() => {
    if (deliveryLatParam && deliveryLngParam) {
      setDeliveryLoc({
        lat: parseFloat(deliveryLatParam),
        lng: parseFloat(deliveryLngParam),
        street: deliveryStreetParam || deliveryLabelParam || 'Current location',
        city: deliveryCityParam || '',
        formatted: deliveryLabelParam || 'Current location',
      });
    }
  }, []);

  // When editing from review, dynamically update size based on entered amount
  useEffect(() => {
    if (!fromReview || !stationData || lines.length === 0) return;
    
    const enteredAmount = parseFloat(lines[0].price);
    if (isNaN(enteredAmount)) return;
    
    // Find best matching size using ceiling method
    const available = stationData.cylinderListings.filter((l: any) => l.isAvailable && l.fillPrice > 0);
    const sorted = available.sort((a: any, b: any) => a.fillPrice - b.fillPrice);
    
    let matchedSize = lines[0].size; // Default to current size
    
    // Find first size >= entered amount, or use highest if none match
    for (const listing of sorted) {
      if (listing.fillPrice >= enteredAmount) {
        matchedSize = listing.size;
        break;
      }
    }
    
    // If no match found, use highest available size
    if (matchedSize === lines[0].size && sorted.length > 0) {
      const highestMatch = sorted.find((l: any) => l.fillPrice >= enteredAmount);
      if (!highestMatch && sorted.length > 0) {
        matchedSize = sorted[sorted.length - 1].size;
      }
    }
    
    // Update the size if it changed
    if (matchedSize !== lines[0].size) {
      console.log('DEBUG: Edit mode - updating size from', lines[0].size, 'to', matchedSize, 'for amount', enteredAmount);
      updateLine(lines[0].id, 'quantity', lines[0].quantity); // Dummy update to trigger re-render
      setLines(prev => prev.map(l => l.id === prev[0]?.id ? { ...l, size: matchedSize } : l));
    }
  }, [fromReview, stationData, lines[0]?.price]);

  // For quick order, auto-proceed when everything is ready (but not if editing from review)
  useEffect(() => {
    console.log('Auto-proceed effect running:', { skipCheckout, cartItemsParam, stationIdParam, hasStationData: !!stationData, pickupLoc: !!pickupLoc, linesLength: lines.length });
    
    // Don't proceed if we're editing from review OR if we don't have skipCheckout flag
    if (!skipCheckout || cartItemsParam) {
      console.log('Skipping auto-proceed: skipCheckout=', skipCheckout, 'cartItemsParam=', !!cartItemsParam);
      return;
    }
    
    // Wait until we have all required data
    if (!stationIdParam || !stationData || !pickupLoc || lines.length === 0) {
      console.log('Waiting for data: stationIdParam=', !!stationIdParam, 'stationData=', !!stationData, 'pickupLoc=', !!pickupLoc, 'lines=', lines.length);
      return;
    }
    
    console.log('Proceeding to review with lines:', lines);
    
    // Auto-proceed to review
    const effectiveDelivery = pickupLoc; // Same as pickup for quick order
    
    const stationName = stationData.name ?? '';
    const stationAddr = stationData.address ?? '';

    // Calculate current cart totals
    const currentCartItems = lines.map((l) => {
      const minPrice = MIN_CYLINDER_PRICE;
      const maxPrice = getMaxPrice(l.size);
      const entered = parseFloat(l.price) || minPrice;
      const price = Math.min(maxPrice, Math.max(minPrice, entered));
      return { size: l.size, quantity: l.quantity, unitPrice: price, subtotal: price * l.quantity, customPrice: price };
    });
    
    console.log('Auto-proceed: currentCartItems:', currentCartItems);

    const currentSubtotal = currentCartItems.reduce((a, b) => a + b.subtotal, 0);
    const currentTotal = currentSubtotal + DELIVERY_FEE;
    
    // Store cart items in sessionStorage to avoid URL length limits
    sessionStorage.setItem('quickOrderCart', JSON.stringify(currentCartItems));

    const q = new URLSearchParams({
      stationId:      stationIdParam,
      stationName,
      stationAddress: stationAddr,
      stationLat:     String(stationData.lat ?? ''),
      stationLng:     String(stationData.lng ?? ''),
      serviceType:    'refill',
      schedule: 'asap',
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
      subtotal:       String(currentSubtotal),
      isQuickOrder:   'true',
    });
    router.push(`/user/checkout/review?${q.toString()}`);
  }, [skipCheckout, cartItemsParam, stationIdParam, stationData, pickupLoc, lines, DELIVERY_FEE, pricingData, router]);

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
    if (hasPriceError)         { toast.error('Price must be at least ₵20'); return; }
    if (!pickupLoc)            { toast.error('Please set your pickup location'); return; }
    const effectiveDelivery = sameAsPickup ? pickupLoc : deliveryLoc;
    if (!effectiveDelivery)    { toast.error('Please set your delivery location'); return; }

    if (photo) checkoutPhoto.set(photo);
    else checkoutPhoto.clear();

    const stationName = stationData?.name ?? selectedStation?.name ?? '';
    const stationAddr = stationData?.address ?? selectedStation?.address ?? '';

    console.log('DEBUG: handleContinue (regular checkout)', {
      cartItems,
      stationId: effectiveStationId,
      stationName,
      pickupLoc,
      deliveryLoc,
      subtotal,
      deliveryFee: DELIVERY_FEE,
    });

    // Store cartItems in sessionStorage instead of URL params to avoid length issues
    sessionStorage.setItem('checkoutCart', JSON.stringify(cartItems));
    
    // If editing from review, clear old cart keys to prevent confusion
    if (fromReview) {
      sessionStorage.removeItem('quickOrderCart');
      sessionStorage.removeItem('editOrderCart');
      console.log('DEBUG: Cleared old sessionStorage keys (fromReview=true)');
    }

    const q = new URLSearchParams({
      stationId:      effectiveStationId,
      stationName,
      stationAddress: stationAddr,
      stationLat:     String(stationData?.lat ?? ''),
      stationLng:     String(stationData?.lng ?? ''),
      serviceType:    'refill',
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
    });
    router.push(`/user/checkout/review?${q.toString()}`);
  }

  return (
    <div className="min-h-full bg-[var(--bg)]">
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
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[var(--bg-card2)] flex items-center justify-center shrink-0">
          <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
        <h1 className="text-base font-bold text-[var(--text-primary)]">Place Order</h1>
      </div>

      {/* Scrollable content — bottom padding accounts for fixed bar */}
      <div className="py-5 space-y-7 max-w-lg mx-auto pb-64 px-4">

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

        {/* ── Quick edit mode (when editing from review) ── */}
        {fromReview && (isQuickOrder || cartItems.length > 0) && (
          <div className="bg-[var(--bg-card)] border border-brand-500/30 rounded-2xl p-4">
            <p className="text-sm font-bold text-[var(--text-primary)] mb-3">Edit Amount</p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-[var(--text-muted)] block mb-1.5">Enter amount in cedis (GHS)</label>
                <input
                  type="number"
                  value={lines[0]?.price ?? ''}
                  onChange={(e) => {
                    if (lines.length > 0) {
                      updateLine(lines[0].id, 'price', e.target.value);
                    }
                  }}
                  placeholder="e.g., 91"
                  className="w-full px-3 py-2.5 bg-[var(--bg-card2)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-[var(--text-muted)] block mb-1.5">Estimated size</label>
                <div className="px-3 py-2.5 bg-brand-500/10 border border-brand-500/30 rounded-xl text-[var(--text-primary)] font-bold">
                  {lines[0]?.size ?? '—'}kg
                </div>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">Enter any amount — size is auto-detected</p>
          </div>
        )}

        {/* ── Cylinder Details header ── */}
        <div className="px-0">
          <p className="text-sm font-bold text-[var(--text-primary)] mb-1">
            {stationIdParam && !fromReview ? '1.' : !fromReview ? '2.' : ''} {fromReview ? 'Change' : ''} Cylinder Details
          </p>
          {!fromReview && <p className="text-xs text-[var(--text-muted)] mb-3">Tap a size to add it to your order</p>}
        </div>

          {!effectiveStationId && (
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">Select a station above to see available cylinders.</p>
          )}
          {effectiveStationId && !stationData && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading cylinders…
            </div>
          )}
          {effectiveStationId && stationData && availableSizes.length === 0 && (
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">No cylinders currently available at this station.</p>
          )}

        {/* ── Size catalogue — lives outside padded wrapper so it can scroll freely ── */}
        {!fromReview && effectiveStationId && stationData && availableSizes.length > 0 && (
          <div className="relative">
            <div className="flex gap-2.5 overflow-x-auto pb-2 pt-3 px-4">
              {availableSizes.map((size) => {
              const listing = stationData?.cylinderListings?.find((l: any) => l.size === size);
              const price   = listing?.fillPrice ?? 0;
              const count   = lines.filter((l) => l.size === size).length;
              return (
                <button key={size} onClick={() => addLine(size)}
                  className={cn(
                    'relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all text-center active:scale-95 shrink-0 w-24',
                    count > 0
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-brand-500'
                  )}>
                  {count > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-brand-500 rounded-full text-[10px] font-black text-white flex items-center justify-center shadow">
                      {count}
                    </span>
                  )}
                  <div className={cn(
                    'w-full rounded-xl flex items-center justify-center gap-0.5 py-2',
                    count > 0 ? 'bg-brand-500' : 'bg-brand-500/15'
                  )}>
                    <span className={cn('text-lg font-black leading-none', count > 0 ? 'text-white' : 'text-brand-500')}>{size}</span>
                    <span className={cn('text-[10px] font-bold', count > 0 ? 'text-white/70' : 'text-brand-400')}>kg</span>
                  </div>
                  {!isQuickOrder && <p className="text-sm font-black text-[var(--text-primary)]">₵{price}</p>}
                  <span className={cn(
                    'text-[9px] font-bold px-2 py-0.5 rounded-full w-full text-center truncate',
                    count > 0 ? 'bg-brand-500 text-white' : 'bg-[var(--bg-card2)] text-[var(--text-muted)]'
                  )}>
                    {count > 0 ? 'Added' : 'Tap'}
                  </span>
                </button>
              );
            })}
            </div>
            {/* Fade hint — right edge */}
            <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-[var(--bg)] to-transparent" />
          </div>
        )}

        {/* ── Added line items ── */}
        {!fromReview && lines.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Your Order</p>
            {lines.map((line) => {
              const minPrice = getMinPrice(line.size);
              const maxPrice = getMaxPrice(line.size);
              const entered  = parseFloat(line.price);
              const belowMin = line.price !== '' && !isNaN(entered) && entered < minPrice;
              const aboveMax = line.price !== '' && !isNaN(entered) && maxPrice !== Infinity && entered > maxPrice;
              const hasError = belowMin || aboveMax;
              const subtotalLine = ((!isNaN(entered) ? entered : minPrice)) * line.quantity;
              return (
                <div key={line.id} className={cn(
                  'bg-[var(--bg-card)] rounded-2xl border-2 p-4 transition-all',
                  hasError ? 'border-red-400' : 'border-brand-500 bg-brand-500/5'
                )}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-500 flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs font-black leading-none text-white">{line.size}</span>
                      <span className="text-[8px] font-bold text-white/70">kg</span>
                    </div>
                    <p className="font-bold text-[var(--text-primary)] text-sm flex-1 min-w-0 truncate">{line.size}kg Cylinder</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => updateLine(line.id, 'quantity', Math.max(1, line.quantity - 1))}
                        className="w-7 h-7 rounded-full border-2 border-brand-500/30 bg-[var(--bg-card)] flex items-center justify-center text-brand-500 font-bold text-sm">
                        −
                      </button>
                      <span className="w-5 text-center font-black text-sm text-brand-500">{line.quantity}</span>
                      <button onClick={() => updateLine(line.id, 'quantity', line.quantity + 1)}
                        className="w-7 h-7 rounded-full border-2 border-brand-500/30 bg-[var(--bg-card)] flex items-center justify-center text-brand-500 font-bold text-sm">
                        +
                      </button>
                    </div>
                    <button onClick={() => removeLine(line.id)}
                      className="w-7 h-7 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 shrink-0 ml-1">
                      <span className="text-base leading-none">×</span>
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Gas Cost (₵)</label>
                      <span className="text-[10px] text-[var(--text-muted)]">Min ₵{minPrice} – Max ₵{maxPrice === Infinity ? '—' : maxPrice}</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-muted)]">₵</span>
                      <input
                        type="number" step="0.01" min={minPrice} max={maxPrice}
                        value={line.price}
                        onChange={(e) => updateLine(line.id, 'price', e.target.value)}
                        placeholder={String(minPrice)}
                        className={cn(
                          'w-full h-10 rounded-xl border pl-7 pr-3 text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-card)] focus:outline-none focus:ring-2 transition-all',
                          hasError ? 'border-red-400 focus:ring-red-400/20' : 'border-[var(--border)] focus:border-brand-500 focus:ring-brand-500/20'
                        )}
                      />
                    </div>
                    {belowMin && <p className="text-xs text-red-500">Minimum is ₵{minPrice}</p>}
                    {aboveMax && maxPrice !== Infinity && <p className="text-xs text-red-500">Maximum is ₵{maxPrice} (full fill cost)</p>}
                    <div className="flex justify-between text-xs text-brand-500 pt-0.5">
                      <span>{line.quantity} × ₵{!isNaN(entered) ? entered : minPrice}</span>
                      <span className="font-bold">₵{subtotalLine.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
      <div className="fixed bottom-0 inset-x-0 bg-[var(--bg-card)] border-t border-[var(--border)] px-4 pt-3 pb-safe z-20" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <div className="max-w-lg mx-auto">
          {/* Collapsed summary — only show when items exist */}
          {totalQty > 0 && (
            <div className="space-y-0.5 mb-2">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-xs text-[var(--text-muted)]">
                  <span>{item.size}kg × {item.quantity} @ ₵{item.unitPrice}</span>
                  <span>₵{item.subtotal.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs text-[var(--text-muted)]">
                <span>Delivery</span>
                <span>₵{DELIVERY_FEE.toFixed(2)}</span>
              </div>
            </div>
          )}
          {totalQty === 0 && (
            <p className="text-xs text-[var(--text-muted)] mb-2">No cylinders selected</p>
          )}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-[var(--text-primary)]">Total Estimate</span>
            <span className="text-base font-black text-brand-500">₵{total.toFixed(2)}</span>
          </div>
          <button onClick={handleContinue} disabled={totalQty === 0 || hasPriceError}
            className="w-full h-12 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
