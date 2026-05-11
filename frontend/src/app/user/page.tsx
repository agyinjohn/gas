'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, ChevronDown, Bell, User, Flame,
  Plus, Navigation, AlertCircle, Loader2, Star, Gift, Map,
  Sun, Moon, SlidersHorizontal,
} from 'lucide-react';
import { stationsApi, ordersApi, notificationsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/components/shared/ThemeProvider';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { PickedLocation } from '@/components/LocationPicker';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

const QUICK_SIZES = [3, 4, 5, 6, 9, 11, 12, 14, 15, 18, 19, 20, 30, 47, 48];

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
  cylinderListings: Listing[];
}

// ─── Nearby Station Card (Figma style) ───────────────────────────────────────

function StationCard({ station }: { station: Station }) {
  const available = station.cylinderListings.filter((l) => l.isAvailable);
  const allOutOfStock = station.cylinderListings.length > 0 && available.length === 0;
  const minPrice = available.length ? Math.min(...available.map((l) => l.fillPrice)) : null;

  return (
    <Link href={`/user/stations/${station.id}`}>
      <div className={cn(
        'bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 h-full transition-all',
        allOutOfStock ? 'opacity-60' : 'active:scale-[0.98]'
      )}>
        {/* Icon */}
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
          allOutOfStock ? 'bg-[var(--bg-card2)]' : 'bg-brand-500/15'
        )}>
          <Flame className={cn('w-5 h-5', allOutOfStock ? 'text-[var(--text-muted)]' : 'text-brand-500')} />
        </div>

        <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-snug mb-0.5 truncate">
          {station.name}
        </h3>
        <p className="text-xs text-[var(--text-muted)] truncate mb-2">{station.address}</p>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <MapPin className="w-3 h-3" />{station.distanceKm} km
          </span>
          <span className="flex items-center gap-1 text-xs text-amber-500">
            <Star className="w-3 h-3 fill-current" />{station.ratingAvg.toFixed(1)}
          </span>
        </div>

        {minPrice && (
          <p className="text-xs font-bold text-brand-500 mt-2">From GHS {minPrice}</p>
        )}
        {allOutOfStock && (
          <p className="text-xs font-bold text-red-500 mt-2">Out of stock</p>
        )}
      </div>
    </Link>
  );
}

function StationSkeleton() {
  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 animate-pulse">
      <div className="w-10 h-10 bg-[var(--bg-card2)] rounded-xl mb-3" />
      <div className="h-4 bg-[var(--bg-card2)] rounded w-3/4 mb-1.5" />
      <div className="h-3 bg-[var(--bg-card2)] rounded w-1/2 mb-2" />
      <div className="h-3 bg-[var(--bg-card2)] rounded w-1/3" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserHomePage() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();

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
      // If it was GPS-based, silently refresh in background
      if (savedMode !== 'manual') silentRefreshLocation();
    } else {
      // No saved location — request fresh
      requestLocation();
    }
  }, []);

  function silentRefreshLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        setCoords({ lat: c.latitude, lng: c.longitude });
        setLocationState('granted');
        reverseGeocode(c.latitude, c.longitude, (label) => {
          setLocationLabel(label);
          localStorage.setItem('gasgo_lat', String(c.latitude));
          localStorage.setItem('gasgo_lng', String(c.longitude));
          localStorage.setItem('gasgo_location_label', label);
          localStorage.setItem('gasgo_location_mode', 'granted');
        });
      },
      () => {}, // silent fail — keep existing saved location
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
    );
  }

  function requestLocation() {
    if (!navigator.geolocation) { setLocationState('denied'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        setCoords({ lat: c.latitude, lng: c.longitude });
        setLocationState('granted');
        reverseGeocode(c.latitude, c.longitude, (label) => {
          setLocationLabel(label);
          localStorage.setItem('gasgo_lat', String(c.latitude));
          localStorage.setItem('gasgo_lng', String(c.longitude));
          localStorage.setItem('gasgo_location_label', label);
          localStorage.setItem('gasgo_location_mode', 'granted');
        });
      },
      () => setLocationState('denied'),
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
  }

  function reverseGeocode(lat: number, lng: number, cb: (label: string) => void) {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) { cb('Current location'); return; }
    fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}&result_type=sublocality|locality`)
      .then((r) => r.json())
      .then((data) => {
        const result = data.results?.[0];
        if (result) {
          const comp = result.address_components?.find((ac: any) =>
            ac.types.includes('sublocality') || ac.types.includes('neighborhood')
          ) ?? result.address_components?.find((ac: any) => ac.types.includes('locality'));
          cb(comp?.long_name ?? result.formatted_address.split(',')[0]);
        } else {
          cb('Current location');
        }
      })
      .catch(() => cb('Current location'));
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
    at_station: 'Being Prepared',
    en_route:   'Out for Delivery',
  };

  return (
    <div className="min-h-full bg-[var(--bg)]">

      {showPicker && (
        <LocationPicker
          onConfirm={handleLocationConfirm}
          onClose={() => setShowPicker(false)}
          initial={coords}
        />
      )}

      {/* ── Header ── */}
      <div className="px-4 pt-12 pb-4 lg:pt-6">
        <div className="flex items-center justify-between">
          {/* Location */}
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-1">Current location</p>
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-full px-3 py-1.5"
            >
              {locationState === 'detecting' ? (
                <Loader2 className="w-3.5 h-3.5 text-[var(--text-muted)] animate-spin" />
              ) : locationState === 'denied' ? (
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <MapPin className="w-3.5 h-3.5 text-brand-500" />
              )}
              <span className="text-sm text-[var(--text-primary)] font-medium max-w-[160px] truncate">
                {locationState === 'detecting' && !coords ? 'Detecting…' :
                 locationState === 'denied'              ? 'Set location' :
                 locationLabel || 'Detecting…'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-2">
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
            <Link
              href="/user/profile"
              className="w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center"
            >
              <User className="w-4 h-4 text-[var(--text-muted)]" />
            </Link>
          </div>
        </div>
      </div>

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
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">Quick Order</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">

            {/* New Gas Refill card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-[var(--border)] flex items-center justify-center">
                <Plus className="w-6 h-6 text-[var(--text-primary)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)] text-center">New Gas Refill</p>
              <button
                onClick={() => router.push('/user/checkout?source=quick')}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold py-2 rounded-xl transition-colors"
              >
                Place an Order
              </button>
            </div>

            {/* Size cards */}
            {QUICK_SIZES.map((size) => (
              <div
                key={size}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col items-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--bg-card2)] flex items-center justify-center">
                  <Flame className="w-6 h-6 text-[var(--text-muted)]" />
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{size}kg Refill</p>
                <button
                  onClick={() => router.push(`/user/checkout?source=quick&size=${size}`)}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold py-2 rounded-xl transition-colors"
                >
                  Order
                </button>
              </div>
            ))}
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
  );
}
