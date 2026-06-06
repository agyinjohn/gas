'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bike, MapPin, RefreshCw, Circle } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { getSocket } from '@/hooks/useSocket';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

const API_KEY  = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!;
const ACCRA    = { lat: 5.6037, lng: -0.187 };

const STATUS_STYLE: Record<string, string> = {
  available: 'bg-green-100 text-green-700 border-green-200',
  busy:      'bg-blue-100 text-blue-700 border-blue-200',
  offline:   'bg-gray-100 text-gray-500 border-gray-200',
  on_break:  'bg-amber-100 text-amber-700 border-amber-200',
};

const MARKER_COLOR: Record<string, string> = {
  available: '#22c55e',
  busy:      '#3b82f6',
  offline:   '#9ca3af',
  on_break:  '#f59e0b',
};

export default function AdminLivePage() {
  const mapDivRef  = useRef<HTMLDivElement>(null);
  const mapRef     = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const [ready,     setReady]     = useState(false);
  const [selected,  setSelected]  = useState<any | null>(null);
  const [liveCoords, setLiveCoords] = useState<Map<string, { lat: number; lng: number; ts: number }>>(new Map());

  // Fetch all riders with location
  const { data, refetch } = useQuery({
    queryKey: ['admin', 'live', 'riders'],
    queryFn: () => adminApi.getRiders({}).then((r) => r.data.riders as any[]),
    refetchInterval: 30000,
  });

  const riders = (data || []).filter((r: any) => r.location?.lat);

  // Init map
  const initMap = useCallback(() => {
    if (!mapDivRef.current || mapRef.current) return;
    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center: ACCRA,
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
    });
    setReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).google?.maps) { initMap(); return; }
    const existing = document.getElementById('gmaps-script');
    if (existing) { existing.addEventListener('load', initMap); return; }
    const s = document.createElement('script');
    s.id = 'gmaps-script';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`;
    s.async = true; s.defer = true; s.onload = initMap;
    document.head.appendChild(s);
  }, [initMap]);

  // Place / update markers
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    riders.forEach((rider: any) => {
      const loc   = liveCoords.get(rider._id) ?? rider.location;
      if (!loc?.lat || !loc?.lng) return;

      const color  = MARKER_COLOR[rider.status] ?? MARKER_COLOR.offline;
      const pos    = { lat: loc.lat, lng: loc.lng };

      if (markersRef.current.has(rider._id)) {
        const marker = markersRef.current.get(rider._id)!;
        marker.setPosition(pos);
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        });
      } else {
        const marker = new google.maps.Marker({
          map: mapRef.current!,
          position: pos,
          title: rider.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
        });
        marker.addListener('click', () => setSelected(rider));
        markersRef.current.set(rider._id, marker);
      }
    });

    // Remove markers for riders no longer in list
    markersRef.current.forEach((marker, id) => {
      if (!riders.find((r: any) => r._id === id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });
  }, [ready, riders, liveCoords]);

  // Socket — listen to all active order location updates
  useEffect(() => {
    const socket = getSocket();

    // Join admin room for live updates
    socket.emit('join:admin');

    const onLocation = (payload: { riderId?: string; orderId?: string; lat: number; lng: number }) => {
      if (!payload.riderId) return;
      setLiveCoords((prev) => {
        const next = new Map(prev);
        next.set(payload.riderId!, { lat: payload.lat, lng: payload.lng, ts: Date.now() });
        return next;
      });
      console.log(`[Admin:Live] Rider ${payload.riderId} → lat=${payload.lat}, lng=${payload.lng}`);
    };

    socket.on('rider:location:update', onLocation);
    return () => { socket.off('rider:location:update', onLocation); };
  }, []);

  const activeRiders  = riders.filter((r: any) => r.status === 'available' || r.status === 'busy');
  const busyRiders    = riders.filter((r: any) => r.status === 'busy');
  const offlineRiders = riders.filter((r: any) => r.status === 'offline' || r.status === 'on_break');

  return (
    <div className="flex h-[calc(100vh-56px)] bg-gray-50">

      {/* ── Sidebar ── */}
      <div className="w-72 bg-white border-r border-gray-100 flex flex-col overflow-hidden shrink-0">

        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">Live Riders</h2>
            <button
              onClick={() => refetch()}
              className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Active',   value: activeRiders.length,  color: 'text-green-600' },
              { label: 'Busy',     value: busyRiders.length,    color: 'text-blue-600'  },
              { label: 'Offline',  value: offlineRiders.length, color: 'text-gray-400'  },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-2 text-center">
                <p className={`text-lg font-black ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-400 font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rider list */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {riders.length === 0 ? (
            <div className="py-12 text-center">
              <Bike className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No riders with location data</p>
            </div>
          ) : riders.map((rider: any) => {
            const live = liveCoords.get(rider._id);
            const isLive = live && Date.now() - live.ts < 60000;

            return (
              <button
                key={rider._id}
                onClick={() => {
                  setSelected(rider);
                  const loc = live ?? rider.location;
                  if (loc && mapRef.current) {
                    mapRef.current.panTo({ lat: loc.lat, lng: loc.lng });
                    mapRef.current.setZoom(15);
                  }
                }}
                className={cn(
                  'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                  selected?._id === rider._id && 'bg-brand-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center">
                      <span className="text-sm font-black text-violet-600">
                        {rider.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {isLive && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{rider.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{rider.phone}</p>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0', STATUS_STYLE[rider.status] ?? STATUS_STYLE.offline)}>
                    {rider.status}
                  </span>
                </div>
                {isLive && (
                  <p className="text-[10px] text-green-600 font-semibold mt-1 ml-12">
                    Live • {new Date(live.ts).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                )}
                {!isLive && rider.location?.updatedAt && (
                  <p className="text-[10px] text-gray-400 mt-1 ml-12">
                    Last seen {formatRelativeTime(rider.location.updatedAt)}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(MARKER_COLOR).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <Circle className="w-2.5 h-2.5 shrink-0" style={{ color, fill: color }} />
                <span className="text-[10px] text-gray-500 capitalize">{status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 relative">
        {!ready && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div ref={mapDivRef} className="w-full h-full" />

        {/* Selected rider card */}
        {selected && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                <span className="text-base font-black text-violet-600">{selected.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{selected.name}</p>
                <p className="text-xs text-gray-400">{selected.phone}</p>
              </div>
              <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full border', STATUS_STYLE[selected.status] ?? STATUS_STYLE.offline)}>
                {selected.status}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Trips',   value: selected.totalTrips || 0 },
                { label: 'Rating',  value: selected.ratingAvg?.toFixed(1) || '—' },
                { label: 'Vehicle', value: selected.vehicleType || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-2">
                  <p className="text-xs font-bold text-gray-800 capitalize">{value}</p>
                  <p className="text-[10px] text-gray-400">{label}</p>
                </div>
              ))}
            </div>
            {liveCoords.get(selected._id) && (
              <p className="text-[10px] text-green-600 font-semibold mt-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                Live location streaming
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
