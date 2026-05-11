'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, MessageCircle, Headphones, Loader2, Flame, ClipboardList, Store, Bike, CheckCircle2 } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { getSocket } from '@/hooks/useSocket';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

const ACCRA = { lat: 5.6037, lng: -0.187 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!;

const STEPS = [
  { key: 'pending',   label: 'Order Placed',    Icon: ClipboardList },
  { key: 'accepted',  label: 'Vendor Accepted', Icon: Store         },
  { key: 'en_route',  label: 'On Route',        Icon: Bike          },
  { key: 'delivered', label: 'Delivered',       Icon: CheckCircle2  },
];
const STATUS_ORDER = ['pending', 'accepted', 'at_station', 'en_route', 'delivered'];

const PAYMENT_LABEL: Record<string, string> = {
  mobile_money: 'Paid via MoMO',
  card:         'Paid via Card',
  cash:         'Cash on Delivery',
};

// ─── Map component ────────────────────────────────────────────────────────────
function TrackMap({ riderLocation, deliveryLat, deliveryLng, className }: {
  riderLocation: { lat: number; lng: number } | null;
  deliveryLat?: number;
  deliveryLng?: number;
  className?: string;
}) {
  const mapDivRef    = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<google.maps.Map | null>(null);
  const riderMarker  = useRef<google.maps.Marker | null>(null);
  const destMarker   = useRef<google.maps.Marker | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);

  // Smoothly animate marker from current position to target
  function animateMarker(marker: google.maps.Marker, target: { lat: number; lng: number }) {
    const start = marker.getPosition();
    if (!start) { marker.setPosition(target); return; }
    const startLat = start.lat(), startLng = start.lng();
    const deltaLat = target.lat - startLat, deltaLng = target.lng - startLng;
    const duration = 1500; // ms
    const startTime = performance.now();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    function step(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out
      marker.setPosition({ lat: startLat + deltaLat * ease, lng: startLng + deltaLng * ease });
      if (t < 1) animFrameRef.current = requestAnimationFrame(step);
    }
    animFrameRef.current = requestAnimationFrame(step);
  }

  const initMap = useCallback(() => {
    if (!mapDivRef.current || mapRef.current) return;
    const center = deliveryLat && deliveryLng ? { lat: deliveryLat, lng: deliveryLng } : ACCRA;
    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center, zoom: 15,
      disableDefaultUI: true,
      zoomControl: false,
      clickableIcons: false,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#212121' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#373737' }] },
        { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      ],
    });

    // Delivery destination marker (pin)
    if (deliveryLat && deliveryLng) {
      destMarker.current = new google.maps.Marker({
        position: { lat: deliveryLat, lng: deliveryLng },
        map: mapRef.current,
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6, fillColor: '#ffffff', fillOpacity: 1,
          strokeColor: '#E87722', strokeWeight: 2,
        },
        title: 'Delivery location',
        zIndex: 1,
      });
    }

    // Rider marker (bike icon using SVG)
    if (riderLocation) {
      riderMarker.current = new google.maps.Marker({
        position: riderLocation,
        map: mapRef.current,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#E87722"/><text x="12" y="16" text-anchor="middle" font-size="13" fill="white">🛵</text></svg>')}`,
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
        },
        title: 'Rider',
        zIndex: 2,
      });
    }

    setReady(true);
  }, [deliveryLat, deliveryLng]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).google?.maps) { initMap(); return; }
    const existing = document.getElementById('gmaps-script');
    if (existing) { existing.addEventListener('load', initMap); return () => existing.removeEventListener('load', initMap); }
    const script = document.createElement('script');
    script.id = 'gmaps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true; script.defer = true; script.onload = initMap;
    document.head.appendChild(script);
  }, [initMap]);

  // Animate rider marker on location update
  useEffect(() => {
    if (!mapRef.current || !riderLocation) return;
    if (!riderMarker.current) {
      riderMarker.current = new google.maps.Marker({
        position: riderLocation,
        map: mapRef.current,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#E87722"/><text x="12" y="16" text-anchor="middle" font-size="13" fill="white">🛵</text></svg>')}`,
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
        },
        title: 'Rider',
        zIndex: 2,
      });
    } else {
      animateMarker(riderMarker.current, riderLocation);
    }
    mapRef.current.panTo(riderLocation);
  }, [riderLocation]);

  return (
    <div className={cn('relative', className)}>
      {!ready && (
        <div className="absolute inset-0 bg-[#1a1a1a] flex items-center justify-center z-10">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      )}
      <div ref={mapDivRef} className="w-full h-full" />
    </div>
  );
}

// ─── Bottom sheet content ─────────────────────────────────────────────────────
function TrackContent({ order, riderLocation }: { order: any; riderLocation: { lat: number; lng: number } | null }) {
  const rider      = typeof order.riderId === 'object' ? order.riderId : null;
  const currentIdx = STATUS_ORDER.indexOf(order.status);

  return (
    <div className="space-y-4">
      {/* 4-step progress */}
      <div className="flex items-start justify-between">
        {STEPS.map((step, i) => {
          const stepIdx = STATUS_ORDER.indexOf(step.key);
          const done    = currentIdx >= stepIdx;
          const isLast  = i === STEPS.length - 1;
          const { Icon } = step;
          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  done ? 'bg-brand-500' : 'bg-[var(--bg-card2)]'
                )}>
                  <Icon className={cn('w-4 h-4', done ? 'text-white' : 'text-[var(--text-muted)]')} />
                </div>
                <span className={cn(
                  'text-[10px] font-medium text-center leading-tight',
                  done ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                )}>
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className={cn(
                  'h-0.5 flex-1 mb-5 mx-0.5',
                  done && currentIdx > stepIdx ? 'bg-brand-500' : 'bg-[var(--border)]'
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
            <p className="text-xs text-[var(--text-muted)] capitalize">{rider.vehicleType} Motor Bike</p>
            <p className="text-xs font-bold text-brand-500">{rider.vehiclePlate}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <a href={`tel:${rider.phone}`}
              className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </a>
          </div>
        </div>
      )}

      {/* Order details */}
      <div className="bg-[var(--bg-card2)] rounded-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-[var(--text-primary)]">Order Details</p>
          <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
            {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
          </span>
        </div>
        {order.cylinders?.map((c: any, i: number) => (
          <div key={i} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-brand-500/10 rounded-lg flex items-center justify-center shrink-0">
                <Flame className="w-3.5 h-3.5 text-brand-500" />
              </div>
              <span className="text-xs text-[var(--text-muted)]">{c.size}kg Cylinder Refill (x{c.quantity})</span>
            </div>
            <span className="text-xs font-bold text-brand-500">{formatCurrency(c.subtotal)}</span>
          </div>
        ))}
        {/* Delivery fee row */}
        <div className="flex items-center justify-between py-1 border-t border-[var(--border)] mt-1">
          <span className="text-xs text-[var(--text-muted)]">Delivery Fee</span>
          <span className="text-xs font-bold text-brand-500">{formatCurrency(order.deliveryFee ?? 0)}</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-xs font-bold text-[var(--text-primary)]">Total</span>
          <span className="text-xs font-black text-brand-500">{formatCurrency(order.totalAmount ?? 0)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TrackOrderPage() {
  const { id }   = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { isLoading: authLoading } = useAuth();
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn:  () => ordersApi.getById(id).then((r) => r.data.order),
    enabled:  !authLoading && !!id,
    retry:    false,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!order || !['accepted', 'at_station', 'en_route'].includes(order.status)) return;

    // Seed initial rider location from socket only — skip stale DB location
    const socket = getSocket();
    socket.emit('join:order', id);
    socket.on('rider:location:update', (loc: { lat: number; lng: number }) => {
      // console.log('[Track] Rider location update:', loc);
      setRiderLocation(loc);
    });
    socket.on('order:status:update', () => queryClient.invalidateQueries({ queryKey: ['order', id] }));
    return () => {
      socket.off('rider:location:update');
      socket.off('order:status:update');
      socket.emit('leave:order', id);
    };
  }, [id, order?.status, queryClient]);

  if (isLoading || authLoading || !order) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* ── MOBILE: fixed full-screen layout ── */}
      <div className="lg:hidden fixed inset-0 bottom-[64px] flex flex-col bg-[var(--bg)]">
        {/* Map fills top half */}
        <div className="flex-1 relative min-h-0">
          <TrackMap
            riderLocation={riderLocation}
            deliveryLat={order.deliveryAddress?.lat}
            deliveryLng={order.deliveryAddress?.lng}
            className="w-full h-full"
          />
          {/* Header overlay */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-end px-4 pt-12 pb-4 bg-gradient-to-b from-black/40 to-transparent">
            <button className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Headphones className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Bottom sheet */}
        <div className="bg-[var(--bg-card)] rounded-t-3xl border-t border-[var(--border)] px-4 pt-3 pb-4 overflow-y-auto"
          style={{ maxHeight: '50vh' }}>
          <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-5" />
          <TrackContent order={order} riderLocation={riderLocation} />
        </div>
      </div>

      {/* ── DESKTOP: side-by-side layout ── */}
      <div className="hidden lg:flex min-h-full bg-[var(--bg)]">
        {/* Left: map */}
        <div className="flex-1 relative">
          <TrackMap
            riderLocation={riderLocation}
            deliveryLat={order.deliveryAddress?.lat}
            deliveryLng={order.deliveryAddress?.lng}
            className="absolute inset-0"
          />
          {/* Header overlay */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-end px-6 pt-6 pb-4 bg-gradient-to-b from-black/50 to-transparent">
            <button className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Headphones className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Right: info panel */}
        <div className="w-96 bg-[var(--bg-card)] border-l border-[var(--border)] flex flex-col overflow-y-auto">
          <div className="p-6 border-b border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)] mb-0.5">
              Order #{id.slice(-8).toUpperCase()}
            </p>
            <p className="text-xl font-black text-[var(--text-primary)]">
              {order.status === 'en_route' ? 'On Route' :
               order.status === 'accepted' ? 'Vendor Accepted' :
               order.status === 'at_station' ? 'Being Prepared' :
               order.status === 'delivered' ? 'Delivered' : 'Order Placed'}
            </p>
          </div>
          <div className="p-6 flex-1">
            <TrackContent order={order} riderLocation={riderLocation} />
          </div>
        </div>
      </div>
    </>
  );
}
