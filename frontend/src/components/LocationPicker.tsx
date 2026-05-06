'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, X, Crosshair, Loader2 } from 'lucide-react';

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

export default function LocationPicker({ onConfirm, onClose, initial }: Props) {
  const mapDivRef    = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<google.maps.Map | null>(null);
  const markerRef    = useRef<google.maps.Marker | null>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const [ready,    setReady]    = useState(false);
  const [locating, setLocating] = useState(false);
  const [picked,   setPicked]   = useState<PickedLocation | null>(null);

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
    const center = initial ?? ACCRA;
    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center,
      zoom: initial ? 16 : 12,
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
    if (initial) placeMarker(initial.lat, initial.lng);
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
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
          <X className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-base font-bold text-gray-900 flex-1">Set Delivery Location</h2>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for your address…"
            className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Search, tap the map, or drag the pin
        </p>
      </div>

      {/* Map */}
      <div className="relative flex-1 min-h-0">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
              <p className="text-sm text-gray-400">Loading map…</p>
            </div>
          </div>
        )}
        <div ref={mapDivRef} className="w-full h-full" />

        {/* My location */}
        <button
          onClick={useMyLocation}
          disabled={locating || !ready}
          className="absolute top-3 right-3 bg-white shadow-md rounded-xl p-2.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {locating
            ? <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
            : <Crosshair className="w-5 h-5 text-brand-500" />
          }
        </button>
      </div>

      {/* Confirm */}
      <div className="px-4 py-4 border-t border-gray-100 shrink-0">
        {picked ? (
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-brand-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{picked.street}</p>
              <p className="text-xs text-gray-400">{picked.city}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center mb-3">Tap the map to pin your location</p>
        )}
        <button
          onClick={() => picked && onConfirm(picked)}
          disabled={!picked}
          className="w-full h-12 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-brand-500/25"
        >
          Confirm Location
        </button>
      </div>
    </div>
  );
}
