'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, X, Crosshair, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface PickedLocation {
  lat: number;
  lng: number;
  street: string;
  city: string;
  formatted: string;
}

interface Props {
  onConfirm: (loc: PickedLocation) => void;
  onClose: () => void;
  initial?: { lat: number; lng: number } | null;
  pickupLocation?: string; // display-only label for the pickup (station name/address)
}

const ACCRA = { lat: 5.6037, lng: -0.187 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!;

function parseComponents(components: any[]): { street: string; city: string } {
  let street = '';
  let city = '';
  for (const c of components) {
    if (c.types.includes('route')) street = c.long_name;
    if (c.types.includes('street_number') && !street) street = c.long_name;
    if (c.types.includes('locality')) city = c.long_name;
    if (!city && c.types.includes('administrative_area_level_2')) city = c.long_name;
    if (!city && c.types.includes('administrative_area_level_1')) city = c.long_name;
  }
  return { street, city };
}

export default function LocationPicker({ onConfirm, onClose, initial, pickupLocation }: Props) {
  const mapDivRef    = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<google.maps.Map | null>(null);
  const markerRef    = useRef<google.maps.Marker | null>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const [ready,         setReady]         = useState(false);
  const [locating,      setLocating]      = useState(false);
  const [picked,        setPicked]        = useState<PickedLocation | null>(null);
  const [sameAsPickup,  setSameAsPickup]  = useState(false);

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const { street, city } = parseComponents(results[0].address_components ?? []);
        const formatted = results[0].formatted_address;
        setPicked({ lat, lng, street: street || formatted, city: city || 'Ghana', formatted });
      }
    });
  }, []);

  const placeMarker = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return;
    markerRef.current?.setMap(null);
    markerRef.current = new google.maps.Marker({
      position: { lat, lng },
      map: mapRef.current,
      draggable: true,
      animation: google.maps.Animation.DROP,
    });
    markerRef.current.addListener('dragend', (e: google.maps.MapMouseEvent) => {
      reverseGeocode(e.latLng!.lat(), e.latLng!.lng());
    });
    mapRef.current.panTo({ lat, lng });
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  const initMap = useCallback(() => {
    if (!mapDivRef.current) return;
    // Use passed initial, or fall back to saved GPS, or Accra
    const savedLat = localStorage.getItem('gasgo_lat');
    const savedLng = localStorage.getItem('gasgo_lng');
    const defaultCenter = initial
      ?? (savedLat && savedLng ? { lat: parseFloat(savedLat), lng: parseFloat(savedLng) } : null)
      ?? ACCRA;
    const defaultZoom = (initial || (savedLat && savedLng)) ? 16 : 12;
    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
    });
    mapRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
      placeMarker(e.latLng!.lat(), e.latLng!.lng());
    });
    if (inputRef.current) {
      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'gh' },
        fields: ['geometry', 'formatted_address', 'address_components'],
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place.geometry?.location) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        mapRef.current!.setZoom(17);
        placeMarker(lat, lng);
      });
    }
    // Auto-pin: use passed initial, or saved GPS location
    if (initial) {
      placeMarker(initial.lat, initial.lng);
    } else if (savedLat && savedLng) {
      placeMarker(parseFloat(savedLat), parseFloat(savedLng));
    }
    setReady(true);
  }, [initial, placeMarker]);

  useEffect(() => {
    // If already loaded, init immediately
    if (window.google?.maps?.places) {
      initMap();
      return;
    }
    // If script already injected, wait for it
    const existing = document.getElementById('gmaps-script');
    if (existing) {
      existing.addEventListener('load', initMap);
      return () => existing.removeEventListener('load', initMap);
    }
    // Inject script fresh
    const script = document.createElement('script');
    script.id = 'gmaps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initMap;
    document.head.appendChild(script);
  }, [initMap]);

  function useMyLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        mapRef.current?.setZoom(17);
        placeMarker(coords.latitude, coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10000 }
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[var(--bg)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)] shrink-0">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-[var(--bg-card2)] flex items-center justify-center">
          <X className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
        <h2 className="text-base font-bold text-[var(--text-primary)] flex-1">Map</h2>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)] shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for your address…"
            className="w-full h-11 bg-[var(--bg-card2)] border border-[var(--border)] rounded-xl pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1 min-h-0">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card2)] z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
              <p className="text-sm text-[var(--text-muted)]">Loading map…</p>
            </div>
          </div>
        )}
        <div ref={mapDivRef} className="w-full h-full" />
        <button
          onClick={useMyLocation}
          disabled={locating || !ready}
          className="absolute top-3 right-3 bg-[var(--bg-card)] shadow-md rounded-xl p-2.5 hover:bg-[var(--bg-card2)] transition-colors disabled:opacity-50"
        >
          {locating
            ? <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
            : <Crosshair className="w-5 h-5 text-brand-500" />
          }
        </button>
      </div>

      {/* Confirm bottom sheet */}
      <div className="px-4 py-4 border-t border-[var(--border)] bg-[var(--bg-card)] shrink-0">
        {/* Pickup location (read-only display) */}
        {pickupLocation && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">Pickup Location</p>
            <div className="flex items-center gap-2 bg-[var(--bg-card2)] border border-[var(--border)] rounded-xl px-3 py-2.5">
              <MapPin className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <span className="text-sm text-[var(--text-primary)] truncate">{pickupLocation}</span>
            </div>
          </div>
        )}

        {/* Delivery location */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">Delivery Location</p>
          <div className="flex items-center gap-2 bg-[var(--bg-card2)] border border-[var(--border)] rounded-xl px-3 py-2.5">
            <MapPin className="w-4 h-4 text-brand-500 shrink-0" />
            <span className="text-sm text-[var(--text-primary)] truncate">
              {sameAsPickup
                ? (pickupLocation || 'Same as pickup')
                : (picked ? picked.formatted : 'Tap map to set location')}
            </span>
          </div>
        </div>

        {/* Same as pickup checkbox */}
        {pickupLocation && (
          <button
            onClick={() => setSameAsPickup((v) => !v)}
            className="flex items-center gap-2 mb-3"
          >
            <div className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
              sameAsPickup ? 'bg-brand-500 border-brand-500' : 'border-[var(--border)]'
            )}>
              {sameAsPickup && <span className="text-white text-xs font-bold">✓</span>}
            </div>
            <span className="text-sm text-[var(--text-primary)]">Same as pickup location</span>
          </button>
        )}

        <button
          onClick={() => {
            if (sameAsPickup && pickupLocation) {
              // Use pickup coords as delivery
              onConfirm({ lat: initial?.lat ?? 0, lng: initial?.lng ?? 0, street: pickupLocation, city: '', formatted: pickupLocation });
            } else if (picked) {
              onConfirm(picked);
            }
          }}
          disabled={!sameAsPickup && !picked}
          className="w-full h-12 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
        >
          Continue <span className="text-lg">→</span>
        </button>
      </div>
    </div>
  );
}
