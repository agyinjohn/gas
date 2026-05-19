'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle, Phone, Flame,
  Store, Package, Bike, User, MapPin, Loader2, Navigation, Maximize2, X,
} from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { useRiderLocationBroadcast } from '@/hooks/useSocket';
import { Order } from '@/types';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!;

// ─── Marker SVGs ──────────────────────────────────────────────────────────────
const DEST_PIN = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 24 30">` +
  `<path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 18 12 18S24 21 24 12C24 5.4 18.6 0 12 0z" fill="#fff"/>` +
  `<circle cx="12" cy="12" r="5" fill="#E87722"/></svg>`
);
const RIDER_PIN = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">` +
  `<circle cx="18" cy="18" r="16" fill="#E87722" stroke="#fff" stroke-width="3"/>` +
  `<text x="18" y="23" text-anchor="middle" font-size="14">🛵</text></svg>`
);
// ─── Rider steps ──────────────────────────────────────────────────────────────
const STEPS = [
  { status: 'accepted',   label: 'Go to Customer',      Icon: User    },
  { status: 'at_station', label: 'Go to Station',        Icon: Store   },
  { status: 'en_route',   label: 'Return to Customer',   Icon: Bike    },
  { status: 'delivered',  label: 'Delivered',            Icon: Package },
];
const STATUS_INDEX: Record<string, number> = {
  accepted: 0, at_station: 1, en_route: 2, delivered: 3,
};
const STATUS_ACTIONS: Record<string, { label: string; next: string }> = {
  accepted:   { label: 'Cylinder Collected — Head to Station', next: 'at_station' },
  at_station: { label: 'Cylinder Filled — En Route to Customer', next: 'en_route'   },
  en_route:   { label: 'Mark as Delivered',                      next: 'delivered'  },
};
const PAYMENT_LABELS: Record<string, string> = {
  mobile_money: 'Mobile Money',
  card:         'Card',
  cash:         'Cash on Delivery',
};

// ─── NavMap ───────────────────────────────────────────────────────────────────
function NavMap({ destination, riderPos, fullscreen, onToggleFullscreen }: {
  destination: { lat: number; lng: number; label: string };
  riderPos: { lat: number; lng: number } | null;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const mapDivRef      = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<google.maps.Map | null>(null);
  const rendererRef    = useRef<google.maps.DirectionsRenderer | null>(null);
  const riderMarkerRef = useRef<google.maps.Marker | null>(null);
  const destMarkerRef  = useRef<google.maps.Marker | null>(null);
  const lastRouteRef   = useRef<{ lat: number; lng: number } | null>(null);
  const destRef        = useRef(destination);
  const riderPosRef    = useRef(riderPos);
  const [ready, setReady] = useState(false);

  useEffect(() => { destRef.current = destination; }, [destination]);
  useEffect(() => { riderPosRef.current = riderPos; }, [riderPos]);

  const requestRoute = useCallback((origin: { lat: number; lng: number }) => {
    if (!mapRef.current || !rendererRef.current) return;
    const dest = destRef.current;
    new google.maps.DirectionsService().route(
      { origin, destination: { lat: dest.lat, lng: dest.lng }, travelMode: google.maps.TravelMode.DRIVING },
      (result, status) => {
        if (status === 'OK' && result && rendererRef.current) {
          lastRouteRef.current = origin;
          rendererRef.current.setDirections(result);
          mapRef.current?.fitBounds(result.routes[0].bounds, 60);
        }
      }
    );
  }, []);

  const attachRenderer = useCallback(() => {
    if (!mapRef.current) return;
    if (rendererRef.current) { rendererRef.current.setMap(null); }
    rendererRef.current = new google.maps.DirectionsRenderer({
      map: mapRef.current,
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#E87722', strokeWeight: 5, strokeOpacity: 0.9 },
    });
  }, []);

  const initMap = useCallback(() => {
    if (!mapDivRef.current) return;
    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(mapDivRef.current, {
        center: { lat: destRef.current.lat, lng: destRef.current.lng },
        zoom: 15,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        zoomControl: true,
        clickableIcons: false,
        styles: [
          { elementType: 'geometry',           stylers: [{ color: '#1e1e2e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1e1e2e' }] },
          { elementType: 'labels.text.fill',   stylers: [{ color: '#6b7280' }] },
          { featureType: 'road', elementType: 'geometry',         stylers: [{ color: '#2d2d3f' }] },
          { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
          { featureType: 'water', elementType: 'geometry',        stylers: [{ color: '#111827' }] },
          { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
      });
    }

    attachRenderer();

    // Place / update destination marker
    if (destMarkerRef.current) {
      destMarkerRef.current.setPosition({ lat: destRef.current.lat, lng: destRef.current.lng });
    } else {
      destMarkerRef.current = new google.maps.Marker({
        position: { lat: destRef.current.lat, lng: destRef.current.lng },
        map: mapRef.current,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${DEST_PIN}`,
          scaledSize: new google.maps.Size(24, 30),
          anchor: new google.maps.Point(12, 30),
        },
        title: destRef.current.label,
        zIndex: 2,
      });
    }

    setReady(true);

    // Draw route immediately if rider position is already known
    if (riderPosRef.current) {
      requestRoute(riderPosRef.current);
    }
  }, [attachRenderer, requestRoute]);

  // Re-draw when destination changes (status update)
  useEffect(() => {
    if (!mapRef.current) return;
    lastRouteRef.current = null;
    attachRenderer();
    mapRef.current.setCenter({ lat: destination.lat, lng: destination.lng });
    mapRef.current.setZoom(15);
    destMarkerRef.current?.setPosition({ lat: destination.lat, lng: destination.lng });
    if (riderPosRef.current) requestRoute(riderPosRef.current);
  }, [destination.lat, destination.lng, attachRenderer, requestRoute]);

  // Load Google Maps script once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).google?.maps) { initMap(); return; }
    const existing = document.getElementById('gmaps-script');
    if (existing) {
      existing.addEventListener('load', initMap);
      return () => existing.removeEventListener('load', initMap);
    }
    const s = document.createElement('script');
    s.id  = 'gmaps-script';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`;
    s.async = true; s.defer = true; s.onload = initMap;
    document.head.appendChild(s);
  }, [initMap]);

  // Update rider marker and draw/refresh route when position changes
  useEffect(() => {
    if (!riderPos || !ready || !mapRef.current) return;

    if (!riderMarkerRef.current) {
      riderMarkerRef.current = new google.maps.Marker({
        position: riderPos,
        map: mapRef.current,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${RIDER_PIN}`,
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
        },
        title: 'You',
        zIndex: 10,
      });
    } else {
      riderMarkerRef.current.setPosition(riderPos);
    }

    // Throttle route re-requests to ~30m movement
    const prev = lastRouteRef.current;
    if (prev) {
      const d = Math.sqrt((riderPos.lat - prev.lat) ** 2 + (riderPos.lng - prev.lng) ** 2);
      if (d < 0.0003) return;
    }
    requestRoute(riderPos);
  }, [riderPos, ready, requestRoute]);

  return (
    <div className={cn(
      'relative bg-[#1e1e2e] overflow-hidden transition-all',
      fullscreen
        ? 'fixed inset-0 z-50 rounded-none'
        : 'rounded-2xl h-52 lg:h-64'
    )}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
        </div>
      )}
      <div ref={mapDivRef} className="w-full h-full" />

      {/* Fullscreen toggle */}
      <button
        onClick={onToggleFullscreen}
        className="absolute top-3 right-3 bg-[#1e1e2e]/90 border border-white/10 rounded-xl p-2 z-20"
        aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {fullscreen
          ? <X className="w-4 h-4 text-white" />
          : <Maximize2 className="w-4 h-4 text-white" />
        }
      </button>

      {/* Open in Google Maps */}
      <a
        href={`https://maps.google.com/?q=${destination.lat},${destination.lng}`}
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-3 right-3 bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-xl shadow flex items-center gap-1.5 z-20"
      >
        <Navigation className="w-3 h-3" /> Open in Maps
      </a>

      {/* Destination label overlay */}
      <div className="absolute top-3 left-3 bg-[#1e1e2e]/90 border border-white/10 rounded-xl px-3 py-1.5 z-20">
        <p className="text-white text-xs font-semibold truncate max-w-[160px]">{destination.label}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RiderOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(null);

  // Seed rider position immediately on mount so map can draw route as soon as it's ready
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setRiderPos({ lat: coords.latitude, lng: coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, []);

  const { data: order, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id).then((r) => r.data.order as Order),
    refetchInterval: 15000,
  });

  useRiderLocationBroadcast(
    order && ['accepted', 'at_station', 'en_route'].includes(order.status) ? id : null,
    setRiderPos,
  );

  const handleStatusUpdate = async () => {
    if (!order) return;
    const action = STATUS_ACTIONS[order.status];
    if (!action) return;
    setLoading(true);
    try {
      await ordersApi.updateStatus(id, action.next);
      toast.success(action.next === 'delivered' ? 'Delivery confirmed! 🎉' : 'Status updated!');
      if (action.next === 'delivered') {
        queryClient.invalidateQueries({ queryKey: ['rider', 'dashboard'] });
        router.push('/rider');
      } else {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['rider', 'dashboard'] });
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--border)] border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  const stepIndex = STATUS_INDEX[order.status] ?? 0;
  const station   = typeof order.stationId === 'object' ? order.stationId as any : null;
  const customer  = typeof order.userId    === 'object' ? order.userId    as any : null;

  // accepted   → navigate to customer (pickup)
  // at_station  → navigate to station (fill)
  // en_route    → navigate back to customer (deliver)
  const navDest =
    order.status === 'accepted' && order.deliveryAddress
      ? { lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng, label: 'Customer — Pickup' }
      : order.status === 'at_station' && station
      ? { lat: station.lat, lng: station.lng, label: station.name }
      : order.status === 'en_route' && order.deliveryAddress
      ? { lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng, label: 'Customer — Delivery' }
      : null;

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-10">

      {/* ── Header ── */}
      <div className="bg-brand-500 px-4 pt-12 pb-5">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-brand-200 text-xs">Order #{id.slice(-8).toUpperCase()}</p>
            <h1 className="text-white font-black text-lg leading-tight">Active Delivery</h1>
          </div>
          <div className="text-right shrink-0">
            <p className="text-white font-black text-xl">{formatCurrency(order.deliveryFee ?? 0)}</p>
            <p className="text-brand-200 text-[11px]">Your Earning</p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-start">
          {STEPS.map((step, i) => {
            const done   = i < stepIndex;
            const active = i === stepIndex;
            const { Icon } = step;
            return (
              <div key={step.status} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all',
                    done ? 'bg-green-400' : active ? 'bg-white' : 'bg-white/20'
                  )}>
                    {done
                      ? <CheckCircle className="w-4 h-4 text-white" />
                      : <Icon className={cn('w-4 h-4', active ? 'text-brand-500' : 'text-white/40')} />
                    }
                  </div>
                  <span className={cn(
                    'text-[9px] font-semibold text-center leading-tight px-0.5',
                    active ? 'text-white' : done ? 'text-green-300' : 'text-white/40'
                  )}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('h-0.5 flex-1 mb-5 mx-0.5 shrink-0', done ? 'bg-green-400' : 'bg-white/20')} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-lg mx-auto lg:max-w-2xl">

        {/* ── In-app map ── */}
        {navDest && (
          <>
            <NavMap
              destination={navDest}
              riderPos={riderPos}
              fullscreen={mapFullscreen}
              onToggleFullscreen={() => setMapFullscreen((v) => !v)}
            />
            {/* Destination info strip */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-500/10 rounded-xl flex items-center justify-center shrink-0">
                <Navigation className="w-4 h-4 text-brand-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                  {order.status === 'accepted' ? 'Head to Customer' :
                   order.status === 'at_station' ? 'Head to Station' :
                   'Return to Customer'}
                </p>
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{navDest.label}</p>
                {order.status === 'accepted' && order.deliveryAddress && (
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {order.deliveryAddress.street}{order.deliveryAddress.city ? `, ${order.deliveryAddress.city}` : ''}
                  </p>
                )}
                {order.status === 'at_station' && station && (
                  <p className="text-xs text-[var(--text-muted)] truncate">{station.address}</p>
                )}
                {order.status === 'en_route' && order.deliveryAddress && (
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {order.deliveryAddress.street}{order.deliveryAddress.city ? `, ${order.deliveryAddress.city}` : ''}
                  </p>
                )}
              </div>
              <a
                href={`https://maps.google.com/?q=${navDest.lat},${navDest.lng}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 bg-brand-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5"
              >
                <Navigation className="w-3 h-3" /> Go
              </a>
            </div>
          </>
        )}

        {/* ── Current action ── */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-sm p-4">
          <p className="text-[10px] font-bold text-brand-500 uppercase tracking-widest mb-1">Current Step</p>
          <p className="font-black text-[var(--text-primary)] text-base mb-4">
            {STEPS[stepIndex]?.label ?? 'Completed'}
          </p>
          {STATUS_ACTIONS[order.status] && (
            <Button className="w-full rounded-xl" loading={loading} onClick={handleStatusUpdate}>
              <CheckCircle className="w-4 h-4" />
              {STATUS_ACTIONS[order.status].label}
            </Button>
          )}
        </div>

        {/* ── Order details ── */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-sm p-4">
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Order Details</p>
          <div className="space-y-2">
            {order.cylinders?.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-brand-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <Flame className="w-4 h-4 text-brand-500" />
                  </div>
                  <span className="text-sm text-[var(--text-primary)]">{c.size}kg × {c.quantity}</span>
                </div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(c.subtotal)}</span>
              </div>
            ))}
            <div className="border-t border-[var(--border)] pt-2 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Delivery Fee</span>
                <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(order.deliveryFee ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-[var(--text-primary)]">Total</span>
                <span className="font-black text-brand-500">{formatCurrency(order.totalAmount ?? 0)}</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--text-muted)]">
                <span>Payment</span>
                <span className="font-medium">{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Station ── */}
        {station && (
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-sm p-4">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Refill Station</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center shrink-0">
                <Store className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--text-primary)] text-sm">{station.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                  <p className="text-xs text-[var(--text-muted)] truncate">{station.address}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Customer ── */}
        {customer && (
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-sm p-4">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Customer</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--bg-card2)] rounded-full flex items-center justify-center shrink-0">
                <span className="text-[var(--text-primary)] font-black">
                  {customer.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--text-primary)] text-sm">{customer.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{customer.phone}</p>
              </div>
              <a href={`tel:${customer.phone}`}
                className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-white" />
              </a>
            </div>
            <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-[var(--border)]">
              <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--text-muted)]">
                {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
