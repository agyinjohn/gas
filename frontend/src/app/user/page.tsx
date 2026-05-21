'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, ChevronDown, Bell, Flame,
  Navigation, AlertCircle, Loader2, Star, Gift, Map,
  Sun, Moon, SlidersHorizontal, Truck, ChevronRight, X, Phone,
} from 'lucide-react';
import { stationsApi, ordersApi, notificationsApi, authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/components/shared/ThemeProvider';
import { cn, calcDeliveryFee } from '@/lib/utils';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { PickedLocation } from '@/components/LocationPicker';
import toast from 'react-hot-toast';
import WhatsAppFloatingButton from '@/components/WhatsAppFloatingButton';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

interface Listing {
  size: number;
  fillPrice: number;
  exchangePrice: number;
  stockCount: number;
  isAvailable: boolean;
}

interface Station {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
  ratingAvg: number;
  outOfStock: boolean;
  isOpenNow: boolean;
  cylinderListings: Listing[];
}

// ─── Nearby Station Card (Figma style) ───────────────────────────────────────

function StationCard({ station }: { station: Station }) {
  const minPrice = station.cylinderListings.length > 0
    ? Math.min(...station.cylinderListings.filter((l) => l.fillPrice > 0).map((l) => l.fillPrice))
    : null;
  const deliveryFee = calcDeliveryFee(station.distanceKm);
  const unavailable = station.outOfStock || !station.isOpenNow;

  return (
    <Link href={`/user/stations/${station.id}`}>
      <div className={cn(
        'bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 h-full transition-all active:scale-[0.98]',
        unavailable && 'opacity-60'
      )}>

        {/* Top row: icon + name/address + chevron */}
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            unavailable ? 'bg-[var(--bg-card2)]' : 'bg-brand-500/15'
          )}>
            <Flame className={cn('w-5 h-5', unavailable ? 'text-[var(--text-muted)]' : 'text-brand-500')} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-snug truncate">
              {station.name}
            </h3>
            <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{station.address}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border)] my-3" />

        {/* Stats row */}
        <div className="flex items-center justify-between">
          {/* Left: distance + rating */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <MapPin className="w-3 h-3 shrink-0" />
              {station.distanceKm} km
            </span>
            <span className="flex items-center gap-1 text-xs text-amber-500 font-medium">
              <Star className="w-3 h-3 fill-current shrink-0" />
              {station.ratingAvg.toFixed(1)}
            </span>
          </div>

          {/* Right: status badge */}
          {!station.isOpenNow ? (
            <span className="text-[10px] font-bold text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded-full">
              Closed today
            </span>
          ) : station.outOfStock ? (
            <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
              Out of stock
            </span>
          ) : (
            <span className="text-[10px] font-bold text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">
              Available
            </span>
          )}
        </div>

        {/* Bottom row: gas price + delivery fee */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
          <div>
            <p className="text-[10px] text-[var(--text-muted)] mb-0.5">Gas from</p>
            <p className={cn(
              'text-sm font-bold',
              unavailable ? 'text-[var(--text-muted)]' : 'text-brand-500'
            )}>
              {minPrice ? `GHS ${minPrice}` : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[var(--text-muted)] mb-0.5">Delivery</p>
            <p className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1 justify-end">
              <Truck className="w-3 h-3 text-[var(--text-muted)]" />
              GHS {deliveryFee}
            </p>
          </div>
        </div>

      </div>
    </Link>
  );
}

function StationSkeleton() {
  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-[var(--bg-card2)] rounded-xl shrink-0" />
        <div className="flex-1">
          <div className="h-4 bg-[var(--bg-card2)] rounded w-3/4 mb-1.5" />
          <div className="h-3 bg-[var(--bg-card2)] rounded w-1/2" />
        </div>
      </div>
      <div className="border-t border-[var(--border)] my-3" />
      <div className="flex justify-between mb-3">
        <div className="h-3 bg-[var(--bg-card2)] rounded w-1/3" />
        <div className="h-3 bg-[var(--bg-card2)] rounded w-1/4" />
      </div>
      <div className="border-t border-[var(--border)] pt-3 flex justify-between">
        <div className="h-4 bg-[var(--bg-card2)] rounded w-1/4" />
        <div className="h-4 bg-[var(--bg-card2)] rounded w-1/4" />
      </div>
    </div>
  );
}

// ─── Add Phone Modal (Google sign-in users) ──────────────────────────────────
// No OTP needed — users are already verified via Google OAuth

function AddPhoneModal({ onDone }: { onDone: () => void }) {
  const { login, user } = useAuth();
  const [phone, setPhone]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleAddPhone(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length < 9) {
      setError('Enter a valid phone number');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Backend will normalize the phone format
      const res = await authApi.addPhone(phone, '');
      const { token, user: updatedUser } = res.data;
      login(token, updatedUser);
      toast.success('Phone number added!');
      onDone();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add phone number');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-[var(--bg-card)] rounded-3xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black text-[var(--text-primary)]">Add your phone number</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Required to place orders and receive updates</p>
          </div>
          <button onClick={onDone} className="w-8 h-8 rounded-full bg-[var(--bg-card2)] flex items-center justify-center shrink-0">
            <X className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            <p className="text-xs text-red-500">{error}</p>
          </div>
        )}

        <form onSubmit={handleAddPhone} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">Phone number</label>
            <div className="flex">
              <div className="flex items-center gap-1.5 px-3 h-12 bg-[var(--bg-card2)] border border-r-0 border-[var(--border)] rounded-l-xl text-sm text-[var(--text-muted)] font-medium shrink-0">
                <span>🇬🇭</span><span>+233</span>
              </div>
              <input 
                type="tel" 
                inputMode="numeric" 
                placeholder="123456789"
                value={phone}
                onChange={(e) => { 
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); 
                  setError(''); 
                }}
                autoFocus
                className="flex-1 h-12 rounded-r-xl border border-[var(--border)] text-sm text-[var(--text-primary)] bg-[var(--bg-card2)] px-4 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Format: 0123456789, 233123456789, or +233123456789</p>
          </div>

          <button 
            type="submit" 
            disabled={loading || phone.replace(/\D/g, '').length < 9}
            className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Phone className="w-4 h-4" /> Add Phone Number</>
            )}
          </button>

          <button 
            type="button" 
            onClick={onDone}
            className="w-full h-10 rounded-lg border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card2)] transition-all"
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserHomePage() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showAddPhone, setShowAddPhone] = useState(searchParams.get('addPhone') === '1');
  const [quickOrderAmount, setQuickOrderAmount] = useState('');
  const [quickOrderLoading, setQuickOrderLoading] = useState(false);

  const [coords, setCoords]               = useState<{ lat: number; lng: number } | null>(null);
  const [locationState, setLocationState] = useState<'detecting' | 'granted' | 'denied' | 'manual'>('detecting');
  const [showPicker, setShowPicker]       = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  const [radius, setRadius]               = useState(10);

  // On mount: load persisted location instantly, then silently refresh GPS in background
  useEffect(() => {
    const savedLat   = localStorage.getItem('gasgo_lat');
    const savedLng   = localStorage.getItem('gasgo_lng');
    const savedLabel = localStorage.getItem('gasgo_location_label');
    const savedMode  = localStorage.getItem('gasgo_location_mode') as 'granted' | 'manual' | null;

    if (savedLat && savedLng) {
      setCoords({ lat: parseFloat(savedLat), lng: parseFloat(savedLng) });
      setLocationLabel(savedLabel || 'Current location');
      setLocationState(savedMode || 'granted');
      if (savedMode !== 'manual') silentRefreshLocation();
    } else if (!navigator.geolocation) {
      // No geolocation support and no saved location — go to picker
      router.replace('/user/location');
    } else {
      requestLocation();
    }
  }, []);

  function silentRefreshLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        setCoords({ lat: c.latitude, lng: c.longitude });
        setLocationState('granted');
        reverseGeocode(c.latitude, c.longitude, (label, fullAddress) => {
          setLocationLabel(label);
          localStorage.setItem('gasgo_lat', String(c.latitude));
          localStorage.setItem('gasgo_lng', String(c.longitude));
          localStorage.setItem('gasgo_location_label', label);
          localStorage.setItem('gasgo_location_address', fullAddress);
          localStorage.setItem('gasgo_location_mode', 'granted');
        });
      },
      () => {}, // silent fail — keep existing saved location
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
    );
  }

  function requestLocation() {
    if (!navigator.geolocation) { router.replace('/user/location'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        setCoords({ lat: c.latitude, lng: c.longitude });
        setLocationState('granted');
        reverseGeocode(c.latitude, c.longitude, (label, fullAddress) => {
          setLocationLabel(label);
          localStorage.setItem('gasgo_lat', String(c.latitude));
          localStorage.setItem('gasgo_lng', String(c.longitude));
          localStorage.setItem('gasgo_location_label', label);
          localStorage.setItem('gasgo_location_address', fullAddress);
          localStorage.setItem('gasgo_location_mode', 'granted');
        });
      },
      () => router.replace('/user/location'),
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
  }

  function reverseGeocode(lat: number, lng: number, cb: (label: string, fullAddress: string) => void) {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) { cb('Current location', ''); return; }
    fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}&result_type=sublocality|locality`)
      .then((r) => r.json())
      .then((data) => {
        const result = data.results?.[0];
        if (result) {
          const comp = result.address_components?.find((ac: any) =>
            ac.types.includes('sublocality') || ac.types.includes('neighborhood')
          ) ?? result.address_components?.find((ac: any) => ac.types.includes('locality'));
          cb(comp?.long_name ?? result.formatted_address.split(',')[0], result.formatted_address ?? '');
        } else {
          cb('Current location', '');
        }
      })
      .catch(() => cb('Current location', ''));
  }

  function handleLocationConfirm(loc: PickedLocation) {
    setCoords({ lat: loc.lat, lng: loc.lng });
    setLocationLabel(loc.formatted.split(',')[0]);
    setLocationState('manual');
    setShowPicker(false);
    // Persist manual pick — won't be overwritten by GPS refresh
    localStorage.setItem('gasgo_lat', String(loc.lat));
    localStorage.setItem('gasgo_lng', String(loc.lng));
    localStorage.setItem('gasgo_location_label', loc.formatted.split(',')[0]);
    localStorage.setItem('gasgo_location_address', loc.formatted);
    localStorage.setItem('gasgo_location_mode', 'manual');
  }

  // Nearby stations
  const { data: stationsData, isLoading: stationsLoading } = useQuery({
    queryKey: ['stations', 'nearby', coords, radius],
    queryFn:  () => stationsApi.getNearby(coords!.lat, coords!.lng, radius).then((r) => r.data),
    enabled:  !!coords,
  });

  // Active order (first in-progress order)
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'active'],
    queryFn:  () => ordersApi.list().then((r) => r.data),
    refetchInterval: 30000,
  });

  // Unread notification count for badge
  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn:  () => notificationsApi.list().then((r) => r.data),
    refetchInterval: 60000,
  });
  const unreadCount: number = notifData?.unreadCount ?? 0;

  const stations: Station[] = stationsData?.stations ?? [];
  const activeOrder = ordersData?.orders?.find(
    (o: any) => !['delivered', 'cancelled'].includes(o.status)
  );

  const STATUS_LABELS: Record<string, string> = {
    pending:    'Order Placed',
    accepted:   'Accepted',
    at_station: 'Rider at Station',
    en_route:   'Out for Delivery',
  };

  // Quick Order Handlers
  async function handleQuickOrderFind() {
    const amountVal = parseFloat(quickOrderAmount);
    if (!amountVal || amountVal < 1) {
      toast.error('Enter a valid amount');
      return;
    }

    if (!coords) {
      toast.error('Could not get your location');
      return;
    }

    setQuickOrderLoading(true);
    try {
      const { data } = await stationsApi.getNearby(coords.lat, coords.lng, 25);
      const stationsList = data.stations.map((s: any) => ({
        ...s,
        id: s._id?.toString() ?? s.id,
      }));

      if (stationsList.length === 0) {
        toast.error('No stations found nearby');
        setQuickOrderLoading(false);
        return;
      }

      // Find first station with ANY gas (not out of stock completely)
      let foundStation = null;
      let foundCylinder = null;

      for (const s of stationsList) {
        if (s.outOfStock) { console.log(`[QuickOrder] Skipped "${s.name}" (${s.distanceKm}km): outOfStock`); continue; }
        if (s.isOpenNow === false) { console.log(`[QuickOrder] Skipped "${s.name}" (${s.distanceKm}km): closed today`); continue; }

        const available = s.cylinderListings.filter((l: any) => l.isAvailable && l.fillPrice > 0);
        if (available.length === 0) { console.log(`[QuickOrder] Skipped "${s.name}" (${s.distanceKm}km): no available listings`, s.cylinderListings); continue; }
        
        // Find closest cylinder size to the amount (first one >= amount, or closest to it)
        const sorted = available.sort((a: any, b: any) => a.fillPrice - b.fillPrice);
        
        let selectedCylinder = null;
        // Try to find exact match or slightly above
        for (const listing of sorted) {
          if (listing.fillPrice >= amountVal) {
            selectedCylinder = listing;
            break;
          }
        }
        
        // If no exact match, pick the highest priced one available
        if (!selectedCylinder) {
          selectedCylinder = sorted[sorted.length - 1];
        }

        foundStation = s;
        foundCylinder = { size: selectedCylinder.size, price: selectedCylinder.fillPrice };
        console.log(`[QuickOrder] Selected "${s.name}" (${s.distanceKm}km)`);
        break;
      }

      if (!foundStation || !foundCylinder) {
        const msg = 'No gas available at nearby stations';
        toast.error(msg);
        setQuickOrderLoading(false);
        return;
      }

      // Clear any old session data to ensure fresh quick order
      sessionStorage.removeItem('quickOrderCart');
      sessionStorage.removeItem('checkoutCart');
      sessionStorage.removeItem('editOrderCart');

      // Create cart items for sessionStorage - use USER'S entered amount with matched size
      const matchedSize = foundCylinder.size;
      const userAmount = parseFloat(amountVal.toString());
      
      const cartItems = [{
        size: matchedSize,  // Use the matched size from ceiling method (for display only)
        quantity: 1,
        unitPrice: userAmount,  // Use the amount the USER entered
        subtotal: userAmount,
        customPrice: userAmount,  // Send custom price to backend (user's actual amount)
      }];
      console.log('DEBUG: Quick order - matched size:', matchedSize, 'user amount:', userAmount, 'cartItems:', cartItems);
      sessionStorage.setItem('quickOrderCart', JSON.stringify(cartItems));

      // Get station location label
      const stationLocationLabel = foundStation.name || 'Station';
      
      // User's location for delivery/pickup (same location for quick order)
      const fullAddress = localStorage.getItem('gasgo_location_address') || localStorage.getItem('gasgo_location_label') || 'Current location';

      // Navigate directly to review page with all prefilled data
      const q = new URLSearchParams({
        stationId: foundStation.id,
        stationName: foundStation.name || 'Station',
        stationAddress: foundStation.address || '',
        stationLat: String(foundStation.lat ?? ''),
        stationLng: String(foundStation.lng ?? ''),
        schedule: 'asap',
        pickupStreet: fullAddress,
        pickupCity: '',
        pickupLat: String(coords.lat),
        pickupLng: String(coords.lng),
        pickupLabel: 'Current location',
        deliveryStreet: fullAddress,
        deliveryCity: '',
        deliveryLat: String(coords.lat),
        deliveryLng: String(coords.lng),
        deliveryLabel: 'Current location',
        isQuickOrder: 'true',
        source: 'quick',
      });
      
      router.push(`/user/checkout/review?${q.toString()}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error finding station');
      setQuickOrderLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)]">

      {showAddPhone && (
        <AddPhoneModal onDone={() => {
          setShowAddPhone(false);
          router.replace('/user');
        }} />
      )}

      {showPicker && (
        <LocationPicker
          onConfirm={handleLocationConfirm}
          onClose={() => setShowPicker(false)}
          initial={coords}
        />
      )}

      {/* ── Header ── */}
      <div className="shrink-0 bg-[var(--bg)] px-4 pt-8 pb-3 lg:pt-4">
        <div className="flex items-center justify-between">
          {/* Location */}
          <div className="min-w-0 flex-1 mr-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">Current location</p>
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-full px-3 py-1.5 max-w-full"
            >
              {locationState === 'detecting' ? (
                <Loader2 className="w-3.5 h-3.5 text-[var(--text-muted)] animate-spin shrink-0" />
              ) : locationState === 'denied' ? (
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              ) : (
                <MapPin className="w-3.5 h-3.5 text-brand-500 shrink-0" />
              )}
              <span className="text-sm text-[var(--text-primary)] font-medium truncate">
                {locationState === 'detecting' && !coords ? 'Detecting…' :
                 locationState === 'denied'              ? 'Set location' :
                 locationLabel || 'Detecting…'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
            </button>
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Theme toggle — mobile only */}
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center lg:hidden"
              aria-label="Toggle theme"
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4 text-[var(--text-muted)]" />
                : <Moon className="w-4 h-4 text-[var(--text-muted)]" />
              }
            </button>
            <button
              onClick={() => router.push('/notifications')}
              className="relative w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 text-[var(--text-muted)]" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
      <div className="px-4 space-y-6 pb-24 lg:pb-8">

        {/* ── Active Order Banner ── */}
        {activeOrder && (
          <div className="bg-brand-500 rounded-2xl p-4">
            <p className="text-white/70 text-xs mb-1">Order #{activeOrder.orderNumber ?? activeOrder._id?.slice(-8).toUpperCase()}</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-lg leading-tight">
                  {STATUS_LABELS[activeOrder.status] ?? activeOrder.status}
                </p>
                {activeOrder.estimatedArrival && (
                  <p className="text-white/80 text-xs mt-0.5">
                    Est. arrival: {activeOrder.estimatedArrival}
                  </p>
                )}
              </div>
              <Link
                href={`/user/track/${activeOrder._id ?? activeOrder.id}`}
                className="flex items-center gap-1.5 bg-[var(--bg-card)] dark:bg-dark-bg text-[var(--text-primary)] text-sm font-bold px-3 py-2 rounded-xl"
              >
                <span>Track</span>
                <Map className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ── Quick Order ── */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Quick Order</h2>
          
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                How much do you want to fill?
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-[var(--text-muted)]">
                  ₵
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="50"
                  value={quickOrderAmount}
                  onChange={(e) => setQuickOrderAmount(e.target.value)}
                  disabled={quickOrderLoading}
                  className={cn(
                    'w-full h-12 pl-8 pr-4 rounded-xl border bg-[var(--bg-card2)] text-[var(--text-primary)] text-lg font-bold',
                    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                    'border-[var(--border)] disabled:opacity-50'
                  )}
                />
              </div>
            </div>

            <button
              onClick={handleQuickOrderFind}
              disabled={quickOrderLoading || !quickOrderAmount}
              className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {quickOrderLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Placing...
                </>
              ) : (
                'Place Order'
              )}
            </button>
          </div>
        </div>

        {/* ── Nearby Stations ── */}
        <div>
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Nearby Stations
                {!stationsLoading && stations.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">{stations.length} found</span>
                )}
              </h2>
            </div>
            {/* Radius filter — always visible below title */}
            <div className="flex items-center gap-2 mt-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              <div className="flex items-center gap-1.5">
                {[5, 10, 25].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRadius(r)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-semibold border transition-all',
                      radius === r
                        ? 'bg-brand-500 border-brand-500 text-white'
                        : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)] hover:border-brand-500 hover:text-brand-500'
                    )}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* No location */}
          {!coords && locationState === 'denied' && (
            <div className="text-center py-10">
              <div className="w-14 h-14 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Navigation className="w-7 h-7 text-brand-500" />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">Where are you?</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">Set your location to find nearby stations.</p>
              <button
                onClick={() => setShowPicker(true)}
                className="inline-flex items-center gap-2 bg-brand-500 text-white text-sm font-bold px-5 py-3 rounded-xl"
              >
                <MapPin className="w-4 h-4" /> Set My Location
              </button>
            </div>
          )}

          {/* Skeletons */}
          {(locationState === 'detecting' || stationsLoading) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3, 4].map((i) => <StationSkeleton key={i} />)}
            </div>
          )}

          {/* Empty */}
          {!stationsLoading && stations.length === 0 && coords && (
            <div className="text-center py-10">
              <Flame className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)]">No stations found nearby</p>
            </div>
          )}

          {/* Grid */}
          {!stationsLoading && stations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stations.map((station) => (
                <StationCard key={station.id} station={station} />
              ))}
            </div>
          )}
        </div>

        {/* ── Refer & Earn ── */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-4 border-l-4 border-l-brand-500">
          <div className="flex-1">
            <p className="font-bold text-[var(--text-primary)] text-sm">Refer &amp; Earn GHS 20</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Invite friends to GetGas and get discount on your next refill
            </p>
          </div>
          <Link href="/user/loyalty">
            <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-brand-500" />
            </div>
          </Link>
        </div>

      </div>
      </div>
      
      <WhatsAppFloatingButton presetMessage="Hi! I need help with my order." />
    </div>
  );
}
