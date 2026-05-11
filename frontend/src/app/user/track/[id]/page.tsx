'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Phone, MessageCircle, Headphones, Loader2, Flame,
  ClipboardList, Bike, Store, Navigation, CheckCircle2, ChevronUp, ChevronDown,
} from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { getSocket } from '@/hooks/useSocket';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

const ACCRA = { lat: 5.6037, lng: -0.187 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!;

/**
 * User-facing steps — maps to DB statuses:
 *   pending    → Order Placed
 *   accepted   → Rider Dispatched
 *   at_station → Picking Up
 *   en_route   → Return from Station
 *   delivered  → Delivered
 */
const STEPS = [
  { key: 'pending',    label: 'Order Placed',        Icon: ClipboardList },
  { key: 'accepted',   label: 'Rider Dispatched',    Icon: Bike          },
  { key: 'at_station', label: 'Picking Up',          Icon: Store         },
  { key: 'en_route',   label: 'Return from Station', Icon: Navigation    },
  { key: 'delivered',  label: 'Delivered',           Icon: CheckCircle2  },
];
const STATUS_ORDER = ['pending', 'accepted', 'at_station', 'en_route', 'delivered'];

const PAYMENT_LABEL: Record<string, string> = {
  mobile_money: 'Paid via MoMO',
  card:         'Paid via Card',
  cash:         'Cash on Delivery',
};

// ─── Marker SVGs ─────────────────────────────────────────────────────────────
// Rider: solid orange pin with white scooter icon, clearly visible on dark map
const RIDER_ICON_SVG = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
  <circle cx="18" cy="18" r="16" fill="#E87722" stroke="#fff" stroke-width="3"/>
  <text x="18" y="23" text-anchor="middle" font-size="14">🛵</text>
</svg>`);

// Destination: compact white pin with orange dot
const DEST_ICON_SVG = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 24 30">
  <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 18 12 18S24 21 24 12C24 5.4 18.6 0 12 0z" fill="#fff"/>
  <circle cx="12" cy="12" r="5" fill="#E87722"/>
</svg>`);

// ─── Map ──────────────────────────────────────────────────────────────────────
function TrackMap({ riderLocation, deliveryLat, deliveryLng, className }: {
  riderLocation: { lat: number; lng: number } | null;
  deliveryLat?: number;
  deliveryLng?: number;
  className?: string;
}) {
  const mapDivRef    = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<google.maps.Map | null>(null);
  const riderMarker  = useRef<google.maps.Marker | null>(null);
  const rendererRef  = useRef<google.maps.DirectionsRenderer | null>(null);
  const animRef      = useRef<number | null>(null);
  const lastRouteRef = useRef<{ lat: number; lng: number } | null>(null);
  const [ready, setReady] = useState(false);

  function animateMarker(marker: google.maps.Marker, target: { lat: number; lng: number }) {
    const start = marker.getPosition();
    if (!start) { marker.setPosition(target); return; }
    const sLat = start.lat(), sLng = start.lng();
    const dLat = target.lat - sLat, dLng = target.lng - sLng;
    const t0 = performance.now();
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const step = (now: number) => {
      const p = Math.min((now - t0) / 1200, 1);
      const e = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      marker.setPosition({ lat: sLat + dLat * e, lng: sLng + dLng * e });
      if (p < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  }

  const riderIcon = () => ({
    url: `data:image/svg+xml;charset=UTF-8,${RIDER_ICON_SVG}`,
    scaledSize: new google.maps.Size(36, 36),
    anchor: new google.maps.Point(18, 18),
  });

  const initMap = useCallback(() => {
    if (!mapDivRef.current || mapRef.current) return;
    console.log('[TrackMap] initMap called, delivery:', { deliveryLat, deliveryLng });
    const center = deliveryLat && deliveryLng ? { lat: deliveryLat, lng: deliveryLng } : ACCRA;
    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center, zoom: 15,
      disableDefaultUI: true,
      gestureHandling: 'greedy',
      clickableIcons: false,
      styles: [
        { elementType: 'geometry',            stylers: [{ color: '#1e1e2e' }] },
        { elementType: 'labels.text.stroke',  stylers: [{ color: '#1e1e2e' }] },
        { elementType: 'labels.text.fill',    stylers: [{ color: '#6b7280' }] },
        { featureType: 'road', elementType: 'geometry',          stylers: [{ color: '#2d2d3f' }] },
        { featureType: 'road', elementType: 'labels.text.fill',  stylers: [{ color: '#9ca3af' }] },
        { featureType: 'road.highway', elementType: 'geometry',  stylers: [{ color: '#374151' }] },
        { featureType: 'water', elementType: 'geometry',         stylers: [{ color: '#111827' }] },
        { featureType: 'poi',   stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });

    // Destination pin
    if (deliveryLat && deliveryLng) {
      new google.maps.Marker({
        position: { lat: deliveryLat, lng: deliveryLng },
        map: mapRef.current,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${DEST_ICON_SVG}`,
          scaledSize: new google.maps.Size(24, 30),
          anchor: new google.maps.Point(12, 30),
        },
        title: 'Delivery location',
        zIndex: 1,
      });
    }

    // Directions renderer — orange route line
    rendererRef.current = new google.maps.DirectionsRenderer({
      map: mapRef.current,
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#E87722', strokeWeight: 5, strokeOpacity: 0.9 },
    });

    setReady(true);
    console.log('[TrackMap] map ready');
  }, [deliveryLat, deliveryLng]); // eslint-disable-line

  // Load Google Maps script
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).google?.maps) { initMap(); return; }
    const existing = document.getElementById('gmaps-script');
    if (existing) {
      existing.addEventListener('load', initMap);
      return () => existing.removeEventListener('load', initMap);
    }
    const s = document.createElement('script');
    s.id = 'gmaps-script';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`;
    s.async = true; s.defer = true; s.onload = initMap;
    document.head.appendChild(s);
  }, [initMap]);

  // Update rider marker + route whenever live location changes OR map becomes ready
  useEffect(() => {
    console.log('[TrackMap] location/ready effect', { riderLocation, ready, hasMap: !!mapRef.current, hasRenderer: !!rendererRef.current });
    if (!ready || !mapRef.current || !rendererRef.current || !riderLocation) return;

    // Animate rider marker
    if (!riderMarker.current) {
      riderMarker.current = new google.maps.Marker({
        position: riderLocation,
        map: mapRef.current,
        icon: riderIcon(),
        title: 'Rider',
        zIndex: 10,
      });
    } else {
      animateMarker(riderMarker.current, riderLocation);
    }

    // Request route — throttle: skip if rider hasn't moved > ~30 m (but always run the first time)
    if (deliveryLat && deliveryLng) {
      const prev = lastRouteRef.current;
      if (prev) {
        const dlat = riderLocation.lat - prev.lat;
        const dlng = riderLocation.lng - prev.lng;
        if (Math.sqrt(dlat * dlat + dlng * dlng) < 0.0003) {
          console.log('[TrackMap] route throttled');
          return;
        }
      }
      console.log('[TrackMap] Requesting directions', { origin: riderLocation, dest: { deliveryLat, deliveryLng } });
      new google.maps.DirectionsService().route(
        {
          origin: riderLocation,
          destination: { lat: deliveryLat, lng: deliveryLng },
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          console.log('[TrackMap] DirectionsService response:', status, result ? 'has result' : 'no result');
          if (status === 'OK' && result && rendererRef.current) {
            lastRouteRef.current = riderLocation; // only throttle after success
            rendererRef.current.setDirections(result);
            mapRef.current?.fitBounds(result.routes[0].bounds, 60);
          }
        }
      );
    }
  }, [riderLocation, ready]); // eslint-disable-line

  return (
    <div className={cn('relative bg-[#1e1e2e]', className)}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      )}
      <div ref={mapDivRef} className="w-full h-full" />
    </div>
  );
}

// ─── Bottom sheet ─────────────────────────────────────────────────────────────
function TrackContent({ order, riderLocation }: {
  order: any;
  riderLocation: { lat: number; lng: number } | null;
}) {
  const rider      = typeof order.riderId === 'object' ? order.riderId : null;
  const currentIdx = STATUS_ORDER.indexOf(order.status);

  return (
    <div className="space-y-4">
      {/* Progress steps */}
      <div className="flex items-start">
        {STEPS.map((step, i) => {
          const stepIdx = STATUS_ORDER.indexOf(step.key);
          const done    = currentIdx >= stepIdx;
          const active  = currentIdx === stepIdx;
          const isLast  = i === STEPS.length - 1;
          const { Icon } = step;
          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all',
                  done && !active ? 'bg-green-500' :
                  active          ? 'bg-brand-500' : 'bg-[var(--bg-card2)]'
                )}>
                  <Icon className={cn(
                    'w-4 h-4',
                    done || active ? 'text-white' : 'text-[var(--text-muted)]'
                  )} />
                </div>
                <span className={cn(
                  'text-[9px] font-semibold text-center leading-tight px-0.5',
                  active          ? 'text-brand-500' :
                  done && !active ? 'text-green-500'  : 'text-[var(--text-muted)]'
                )}>
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className={cn(
                  'h-0.5 flex-1 mb-5 mx-0.5 shrink-0',
                  currentIdx > stepIdx ? 'bg-green-500' : 'bg-[var(--border)]'
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Rider card */}
      {rider && (
        <div className="flex items-center gap-3 bg-[var(--bg-card2)] rounded-2xl p-3">
          <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0 overflow-hidden">
            {rider.profilePhoto
              ? <img src={rider.profilePhoto} alt="Rider" className="w-full h-full object-cover" />
              : <span className="text-brand-500 font-black text-lg">{rider.name?.charAt(0)}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[var(--text-primary)] truncate">{rider.name}</p>
            <p className="text-xs text-[var(--text-muted)] capitalize">{rider.vehicleType ?? 'Motorbike'}</p>
            {rider.vehiclePlate && (
              <p className="text-xs font-bold text-brand-500">{rider.vehiclePlate}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-[var(--text-muted)]" />
            </button>
            <a href={`tel:${rider.phone}`}
              className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center">
              <Phone className="w-4 h-4 text-white" />
            </a>
          </div>
        </div>
      )}

      {/* Order details */}
      <div className="bg-[var(--bg-card2)] rounded-2xl p-3 space-y-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-[var(--text-primary)]">Order Details</p>
          <span className="text-xs font-semibold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
            {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
          </span>
        </div>
        {order.cylinders?.map((c: any, i: number) => (
          <div key={i} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-brand-500/10 rounded-lg flex items-center justify-center shrink-0">
                <Flame className="w-3.5 h-3.5 text-brand-500" />
              </div>
              <span className="text-xs text-[var(--text-muted)]">{c.size}kg × {c.quantity}</span>
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)]">{formatCurrency(c.subtotal)}</span>
          </div>
        ))}
        <div className="border-t border-[var(--border)] pt-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">Delivery Fee</span>
            <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(order.deliveryFee ?? 0)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="font-bold text-[var(--text-primary)]">Total</span>
            <span className="font-black text-brand-500">{formatCurrency(order.totalAmount ?? 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TrackOrderPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { isLoading: authLoading } = useAuth();
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);
  // Sheet height as % of screen (10% collapsed, 52% default)
  const [sheetPct, setSheetPct] = useState(52);
  const dragStartY  = useRef<number | null>(null);
  const dragStartPct = useRef(52);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn:  () => ordersApi.getById(id).then((r) => r.data.order),
    enabled:  !authLoading && !!id,
    retry:    false,
    refetchInterval: 15000,
  });

  // Seed location from DB rider record — skip if it matches the Accra default
  useEffect(() => {
    if (!order) return;
    const rider = typeof order.riderId === 'object' ? order.riderId as any : null;
    const lat = rider?.location?.lat;
    const lng = rider?.location?.lng;
    if (!lat || !lng) return;
    // Skip stale Accra default coordinates
    if (Math.abs(lat - 5.6037) < 0.001 && Math.abs(lng - (-0.187)) < 0.001) return;
    console.log('[Track] Seeding rider location from DB:', rider.location);
    setRiderLocation({ lat, lng });
  }, [order?.riderId]);

  // Socket — join room once, listen for live updates
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    socket.emit('join:order', id);
    console.log('[Track] Joined order room:', id);

    const onLocation = (loc: { lat: number; lng: number }) => {
      console.log('[Track] Socket → rider:location:update received:', loc);
      setRiderLocation(loc);
    };
    const onStatus = () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    };

    socket.on('rider:location:update', onLocation);
    socket.on('order:status', onStatus);

    return () => {
      socket.off('rider:location:update', onLocation);
      socket.off('order:status', onStatus);
      socket.emit('leave:order', id);
    };
  }, [id, queryClient]);

  if (isLoading || authLoading || !order) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    pending:    'Order Placed',
    accepted:   'Rider Dispatched',
    at_station: 'Picking Up',
    en_route:   'Return from Station',
    delivered:  'Delivered',
  };

  return (
    <>
      {/* ── MOBILE ── */}
      <div className="lg:hidden fixed inset-0 bottom-[64px] flex flex-col bg-[var(--bg)]">
        {/* Map fills remaining space above sheet */}
        <div className="absolute inset-0" style={{ bottom: `${sheetPct}vh` }}>
          <TrackMap
            riderLocation={riderLocation}
            deliveryLat={order.deliveryAddress?.lat}
            deliveryLng={order.deliveryAddress?.lng}
            className="w-full h-full"
          />
          <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-12 pb-4 bg-gradient-to-b from-black/50 to-transparent">
            <div>
              <p className="text-white/70 text-xs">Order #{id.slice(-8).toUpperCase()}</p>
              <p className="text-white font-bold text-sm">{statusLabel[order.status] ?? order.status}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Expand / collapse sheet */}
              <button
                onClick={() => setSheetPct(sheetPct > 10 ? 10 : 52)}
                className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
                aria-label={sheetPct > 10 ? 'Expand map' : 'Show details'}
              >
                {sheetPct > 10
                  ? <ChevronDown className="w-4 h-4 text-white" />
                  : <ChevronUp className="w-4 h-4 text-white" />
                }
              </button>
              <button className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <Headphones className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
          {/* Open rider location in Google Maps */}
          {riderLocation && (
            <a
              href={`https://maps.google.com/?q=${riderLocation.lat},${riderLocation.lng}`}
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-3 right-3 bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-xl shadow flex items-center gap-1.5 z-20"
            >
              <Navigation className="w-3 h-3" /> Open in Maps
            </a>
          )}
        </div>

        {/* Draggable bottom sheet */}
        <div
          className="absolute inset-x-0 bottom-0 bg-[var(--bg-card)] rounded-t-3xl border-t border-[var(--border)] flex flex-col"
          style={{ height: `${sheetPct}vh` }}
        >
          {/* Drag handle */}
          <div
            className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing shrink-0"
            onTouchStart={(e) => {
              dragStartY.current = e.touches[0].clientY;
              dragStartPct.current = sheetPct;
            }}
            onTouchMove={(e) => {
              if (dragStartY.current === null) return;
              const dy = dragStartY.current - e.touches[0].clientY;
              const screenH = window.innerHeight;
              const newPct = dragStartPct.current + (dy / screenH) * 100;
              setSheetPct(Math.min(52, Math.max(10, newPct)));
            }}
            onTouchEnd={() => {
              // Snap to nearest anchor
              setSheetPct(sheetPct < 30 ? 10 : 52);
              dragStartY.current = null;
            }}
          >
            <div className="w-10 h-1 bg-[var(--border)] rounded-full" />
          </div>
          <div className="overflow-y-auto flex-1 px-4 pb-6">
            <TrackContent order={order} riderLocation={riderLocation} />
          </div>
        </div>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:flex h-screen bg-[var(--bg)]">
        <div className="flex-1 relative">
          <TrackMap
            riderLocation={riderLocation}
            deliveryLat={order.deliveryAddress?.lat}
            deliveryLng={order.deliveryAddress?.lng}
            className="absolute inset-0"
          />
          <div className="absolute top-0 inset-x-0 flex items-center justify-between px-6 pt-6 pb-4 bg-gradient-to-b from-black/50 to-transparent">
            <div>
              <p className="text-white/70 text-xs">Order #{id.slice(-8).toUpperCase()}</p>
              <p className="text-white font-bold">{statusLabel[order.status] ?? order.status}</p>
            </div>
            <button className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Headphones className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        <div className="w-96 bg-[var(--bg-card)] border-l border-[var(--border)] flex flex-col overflow-y-auto">
          <div className="p-5 border-b border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)] mb-0.5">Order #{id.slice(-8).toUpperCase()}</p>
            <p className="text-xl font-black text-[var(--text-primary)]">
              {statusLabel[order.status] ?? order.status}
            </p>
          </div>
          <div className="p-5 flex-1">
            <TrackContent order={order} riderLocation={riderLocation} />
          </div>
        </div>
      </div>
    </>
  );
}
