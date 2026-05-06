'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin, Search, Flame, Star, ChevronRight,
  SlidersHorizontal, AlertCircle, Loader2, Navigation,
} from 'lucide-react';
import { stationsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { PickedLocation } from '@/components/LocationPicker';

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
  cylinderListings: Listing[];
}

// ─── Station card ─────────────────────────────────────────────────────────────

function StationCard({ station }: { station: Station }) {
  const available = station.cylinderListings.filter((l) => l.isAvailable);
  const allOutOfStock = station.cylinderListings.length > 0 && available.length === 0;
  const minPrice  = available.length ? Math.min(...available.map((l) => l.fillPrice)) : null;

  return (
    <Link href={`/user/stations/${station.id}`}>
      <div className={cn(
        'bg-white rounded-2xl border p-4 hover:shadow-md transition-all cursor-pointer h-full',
        allOutOfStock ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-gray-200'
      )}>
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', allOutOfStock ? 'bg-gray-100' : 'bg-brand-50')}>
            <Flame className={cn('w-5 h-5', allOutOfStock ? 'text-gray-300' : 'text-brand-500')} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-gray-900 text-sm leading-snug">{station.name}</h3>
              {allOutOfStock
                ? <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full shrink-0">Out of stock</span>
                : <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
              }
            </div>

            <div className="flex items-center gap-1 mt-0.5 mb-2">
              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
              <p className="text-xs text-gray-400 truncate">{station.address}</p>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-xs font-medium text-gray-600">
                <MapPin className="w-3 h-3 text-brand-400" />
                {station.distanceKm} km
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
                <Star className="w-3 h-3 fill-current" />
                {station.ratingAvg.toFixed(1)}
              </span>
              {minPrice && (
                <span className="text-xs font-bold text-brand-600 ml-auto">
                  from GH₵{minPrice}
                </span>
              )}
            </div>

            {/* Size pills */}
            {available.length > 0 ? (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {available.map((l) => (
                  <span key={l.size} className="text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full">
                    {l.size}kg
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[11px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full mt-2 inline-block">
                ⚠️ Out of stock
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function StationSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="w-11 h-11 bg-gray-200 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
          <div className="flex gap-2">
            <div className="h-3 bg-gray-100 rounded w-12" />
            <div className="h-3 bg-gray-100 rounded w-10" />
          </div>
          <div className="flex gap-1.5">
            <div className="h-5 bg-gray-100 rounded-full w-10" />
            <div className="h-5 bg-gray-100 rounded-full w-10" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserHomePage() {
  const { user } = useAuth();
  const [coords, setCoords]               = useState<{ lat: number; lng: number } | null>(null);
  const [locationState, setLocationState] = useState<'detecting' | 'granted' | 'denied' | 'manual'>('detecting');
  const [showPicker, setShowPicker]       = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  const [radius, setRadius]               = useState(25);
  const [search, setSearch]               = useState('');

  useEffect(() => {
    if (!navigator.geolocation) { setLocationState('denied'); return; }

    // Check permission state first if API is available
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'denied') {
          setLocationState('denied');
          return;
        }
        // 'granted' or 'prompt' — try to get position
        requestLocation();
        result.onchange = () => {
          if (result.state === 'granted') requestLocation();
          if (result.state === 'denied') setLocationState('denied');
        };
      });
    } else {
      requestLocation();
    }
  }, []);

  function requestLocation() {
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        setCoords({ lat: c.latitude, lng: c.longitude });
        setLocationState('granted');
      },
      (err) => {
        // code 1 = PERMISSION_DENIED, others are timeout/unavailable — keep prompting
        if (err.code === 1) setLocationState('denied');
        else setLocationState('denied'); // still show manual option
      },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  }

  function handleLocationConfirm(loc: PickedLocation) {
    setCoords({ lat: loc.lat, lng: loc.lng });
    setLocationLabel(loc.formatted);
    setLocationState('manual');
    setShowPicker(false);
  }

  const { data, isLoading } = useQuery({
    queryKey: ['stations', 'nearby', coords, radius],
    queryFn:  () => stationsApi.getNearby(coords!.lat, coords!.lng, radius).then((r) => r.data),
    enabled:  !!coords,
  });

  const allStations: Station[] = data?.stations ?? [];
  const stations = allStations.filter((s) =>
    search ? s.name.toLowerCase().includes(search.toLowerCase()) : true
  );

  const firstName = user?.name && user.name !== 'GasGo User'
    ? user.name.split(' ')[0]
    : null;

  return (
    <div className="min-h-full bg-gray-50">

      {showPicker && (
        <LocationPicker
          onConfirm={handleLocationConfirm}
          onClose={() => setShowPicker(false)}
          initial={coords}
        />
      )}

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-100 px-4 lg:px-8 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">

          {/* Greeting + location status */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-base font-black text-gray-900">
                {firstName ? `Hey, ${firstName} 👋` : 'Find gas near you'}
              </h1>
            </div>
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-1.5 text-xs"
            >
              {locationState === 'detecting' && (
                <><Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" /><span className="text-gray-400">Detecting…</span></>
              )}
              {locationState === 'granted' && (
                <><MapPin className="w-3.5 h-3.5 text-brand-500" /><span className="text-green-600 font-medium">Location detected</span></>
              )}
              {locationState === 'manual' && (
                <><MapPin className="w-3.5 h-3.5 text-brand-500" /><span className="text-brand-600 font-medium truncate max-w-[140px]">{locationLabel.split(',')[0]}</span></>
              )}
              {locationState === 'denied' && (
                <><AlertCircle className="w-3.5 h-3.5 text-amber-500" /><span className="text-amber-600 font-medium">Set location</span></>
              )}
            </button>
          </div>

          {/* Search + radius filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search gas stations…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
              {[5, 10, 25].map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                    radius === r ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'
                  )}
                >
                  {r}km
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Station list ── */}
      <div className="px-4 lg:px-8 py-5 max-w-4xl mx-auto">

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900">
            Nearby Stations
            {!isLoading && stations.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">{stations.length} found</span>
            )}
          </h2>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-brand-500 font-medium hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Detecting skeleton */}
        {locationState === 'detecting' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <StationSkeleton key={i} />)}
          </div>
        )}

        {/* Skeletons while loading */}
        {isLoading && locationState !== 'detecting' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <StationSkeleton key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && stations.length === 0 && coords && (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Flame className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-600">No stations found</p>
            <p className="text-xs text-gray-400 mt-1">
              {search ? 'Try a different search term' : 'Try expanding the radius'}
            </p>
          </div>
        )}

        {/* No location set */}
        {!coords && locationState === 'denied' && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Navigation className="w-8 h-8 text-brand-400" />
            </div>
            <p className="text-sm font-bold text-gray-800">Where are you?</p>
            <p className="text-xs text-gray-400 mt-1 mb-5">We couldn't detect your location automatically.<br/>Set it manually to find nearby stations.</p>
            <button
              onClick={() => setShowPicker(true)}
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold px-5 py-3 rounded-xl transition-all shadow-lg shadow-brand-500/25"
            >
              <MapPin className="w-4 h-4" />
              Set My Location
            </button>
          </div>
        )}

        {/* Station grid */}
        {!isLoading && stations.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {stations.map((station) => (
              <StationCard key={station.id} station={station} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
