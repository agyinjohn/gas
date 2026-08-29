'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Pencil, Trash2, Users, X, Check, Search, Loader2, SlidersHorizontal } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const COLORS = ['#E87722', '#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#ec4899'];
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!;
const ACCRA   = { lat: 5.6037, lng: -0.187 };

const EMPTY_FORM = { name: '', city: '', centerLat: 0, centerLng: 0, radiusKm: 5, color: COLORS[0] };

// ─── Zone Map Modal ───────────────────────────────────────────────────────────

function ZoneMapModal({
  initial,
  onConfirm,
  onClose,
}: {
  initial: typeof EMPTY_FORM;
  onConfirm: (data: typeof EMPTY_FORM) => void;
  onClose: () => void;
}) {
  const mapDivRef  = useRef<HTMLDivElement>(null);
  const mapRef     = useRef<google.maps.Map | null>(null);
  const circleRef  = useRef<google.maps.Circle | null>(null);
  const markerRef  = useRef<google.maps.Marker | null>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  const [ready,    setReady]    = useState(false);
  const [mapError, setMapError] = useState(false);
  const [form,     setForm]     = useState(initial);

  // Keep a ref so map callbacks always see latest form
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  const updateCircle = useCallback((lat: number, lng: number, radiusKm: number, color: string) => {
    const center = { lat, lng };
    const radiusM = radiusKm * 1000;

    if (circleRef.current) {
      circleRef.current.setCenter(center);
      circleRef.current.setRadius(radiusM);
      circleRef.current.setOptions({ strokeColor: color, fillColor: color });
    } else if (mapRef.current) {
      circleRef.current = new google.maps.Circle({
        map: mapRef.current,
        center,
        radius: radiusM,
        strokeColor: color,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.15,
        clickable: false,
      });
    }

    if (markerRef.current) {
      markerRef.current.setPosition(center);
    } else if (mapRef.current) {
      markerRef.current = new google.maps.Marker({
        map: mapRef.current,
        position: center,
        draggable: true,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      });
      markerRef.current.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        const lat = e.latLng!.lat();
        const lng = e.latLng!.lng();
        setForm((f) => {
          const next = { ...f, centerLat: lat, centerLng: lng };
          updateCircle(lat, lng, next.radiusKm, next.color);
          return next;
        });
      });
    }

    mapRef.current?.panTo(center);
  }, []);

  const initMap = useCallback(() => {
    if (!mapDivRef.current) return;
    const hasCenter = initial.centerLat !== 0 || initial.centerLng !== 0;
    const center = hasCenter ? { lat: initial.centerLat, lng: initial.centerLng } : ACCRA;

    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center,
      zoom: hasCenter ? 13 : 12,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
    });

    mapRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
      const lat = e.latLng!.lat();
      const lng = e.latLng!.lng();
      setForm((f) => {
        const next = { ...f, centerLat: lat, centerLng: lng };
        updateCircle(lat, lng, next.radiusKm, next.color);
        return next;
      });
    });

    if (inputRef.current) {
      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'gh' },
        fields: ['geometry', 'address_components', 'formatted_address'],
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place.geometry?.location) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        // Auto-fill city from place
        const cityComp = place.address_components?.find((c) =>
          c.types.includes('locality') || c.types.includes('administrative_area_level_2')
        );
        mapRef.current?.setZoom(13);
        setForm((f) => {
          const next = { ...f, centerLat: lat, centerLng: lng, city: cityComp?.long_name || f.city };
          updateCircle(lat, lng, next.radiusKm, next.color);
          return next;
        });
      });
    }

    if (hasCenter) updateCircle(initial.centerLat, initial.centerLng, initial.radiusKm, initial.color);
    setReady(true);
  }, [initial, updateCircle]);

  useEffect(() => {
    if (window.google?.maps?.places) { initMap(); return; }
    const existing = document.getElementById('gmaps-script');
    if (existing) {
      existing.addEventListener('load', initMap);
      return () => existing.removeEventListener('load', initMap);
    }
    const script = document.createElement('script');
    script.id  = 'gmaps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.onload  = initMap;
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);
  }, [initMap]);

  // Sync circle when radius or color changes via controls
  useEffect(() => {
    if (!circleRef.current && form.centerLat === 0) return;
    if (form.centerLat !== 0) updateCircle(form.centerLat, form.centerLng, form.radiusKm, form.color);
  }, [form.radiusKm, form.color, form.centerLat, form.centerLng, updateCircle]);

  const canConfirm = form.name.trim() && form.city.trim() && form.centerLat !== 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden" style={{ maxHeight: 'min(90vh, 780px)' }}>

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <p className="text-base font-black text-gray-900">
            {initial.centerLat !== 0 ? 'Edit Zone' : 'New Zone'}
          </p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Map — fixed height, never shrinks */}
        <div className="relative shrink-0" style={{ height: 280 }}>
          {!ready && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
            </div>
          )}
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <p className="text-sm text-gray-500">Map failed to load</p>
            </div>
          )}
          <div ref={mapDivRef} className="w-full h-full" />

          {/* Search overlay */}
          <div className="absolute top-3 left-3 right-3 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search location..."
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-white shadow-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Hint */}
          {ready && form.centerLat === 0 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap">
              Click on the map to set zone center
            </div>
          )}
        </div>

        {/* Controls — scrollable, takes remaining space */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 border-t border-gray-100">

          {/* Name + City */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Zone Name *</label>
              <input
                type="text"
                placeholder="e.g. Osu North"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">City *</label>
              <input
                type="text"
                placeholder="e.g. Accra"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Radius slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Radius
              </label>
              <span className="text-sm font-black text-gray-900">{form.radiusKm} km</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={30}
              step={0.5}
              value={form.radiusKm}
              onChange={(e) => setForm((f) => ({ ...f, radiusKm: parseFloat(e.target.value) }))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>0.5 km</span><span>30 km</span>
            </div>
          </div>

          {/* Color + coordinates */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Color</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={cn('w-6 h-6 rounded-full transition-all', form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : '')}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            {form.centerLat !== 0 && (
              <div className="text-right">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Center</label>
                <p className="text-xs font-mono text-gray-700">{form.centerLat.toFixed(5)}</p>
                <p className="text-xs font-mono text-gray-700">{form.centerLng.toFixed(5)}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1 pb-1">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button
              onClick={() => canConfirm && onConfirm(form)}
              disabled={!canConfirm}
              className="flex-1 h-11 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Save Zone
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminZonesPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; initial: typeof EMPTY_FORM; editId: string | null }>({
    open: false, initial: EMPTY_FORM, editId: null,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'zones'],
    queryFn: () => adminApi.getZones().then((r) => r.data.zones),
  });
  const zones: any[] = data || [];

  const createMutation = useMutation({
    mutationFn: (d: object) => adminApi.createZone(d),
    onSuccess: () => { toast.success('Zone created'); queryClient.invalidateQueries({ queryKey: ['admin', 'zones'] }); setModal({ open: false, initial: EMPTY_FORM, editId: null }); },
    onError: () => toast.error('Failed to create zone'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => adminApi.updateZone(id, data),
    onSuccess: () => { toast.success('Zone updated'); queryClient.invalidateQueries({ queryKey: ['admin', 'zones'] }); setModal({ open: false, initial: EMPTY_FORM, editId: null }); },
    onError: () => toast.error('Failed to update zone'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteZone(id),
    onSuccess: () => { toast.success('Zone deleted'); queryClient.invalidateQueries({ queryKey: ['admin', 'zones'] }); },
    onError: () => toast.error('Failed to delete zone'),
  });

  function handleConfirm(form: typeof EMPTY_FORM) {
    if (modal.editId) updateMutation.mutate({ id: modal.editId, data: form });
    else createMutation.mutate(form);
  }

  return (
    <div className="px-4 lg:px-6 py-6 max-w-5xl mx-auto space-y-5 pb-10">

      <div className="flex items-center justify-end">
        <button
          onClick={() => setModal({ open: true, initial: EMPTY_FORM, editId: null })}
          className="flex items-center gap-2 h-10 px-4 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" /> New Zone
        </button>
      </div>

      {/* Zones grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : zones.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center shadow-sm">
          <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">No zones yet</p>
          <p className="text-xs text-gray-400 mt-1">Create your first zone to start grouping riders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {zones.map((zone: any) => (
            <div key={zone._id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: zone.color || COLORS[0] }} />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{zone.name}</p>
                    <p className="text-xs text-gray-400">{zone.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setModal({
                      open: true,
                      editId: zone._id,
                      initial: { name: zone.name, city: zone.city, centerLat: zone.centerLat, centerLng: zone.centerLng, radiusKm: zone.radiusKm, color: zone.color || COLORS[0] },
                    })}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete zone "${zone.name}"?`)) deleteMutation.mutate(zone._id); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl p-2.5">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Radius</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{zone.radiusKm} km</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2.5">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Riders</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-gray-400" />{zone.riderCount ?? 0}
                  </p>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 mt-2.5 font-mono">
                {zone.centerLat?.toFixed(4)}, {zone.centerLng?.toFixed(4)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <ZoneMapModal
          initial={modal.initial}
          onConfirm={handleConfirm}
          onClose={() => setModal({ open: false, initial: EMPTY_FORM, editId: null })}
        />
      )}
    </div>
  );
}
