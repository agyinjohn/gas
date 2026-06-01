'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store, CheckCircle, XCircle, MapPin, DollarSign,
  Search, Plus, X, Lock, User, Phone, Building,
  Star, Package, TrendingUp, Edit2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { Skeleton } from '@/components/ui';
import { formatCurrency, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import type { PickedLocation } from '@/components/LocationPicker';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; dot: string; badge: string }> = {
  active:    { label: 'Active',    dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200'  },
  pending:   { label: 'Pending',   dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200'        },
  suspended: { label: 'Suspended', dot: 'bg-orange-400',  badge: 'bg-orange-50 text-orange-700 border-orange-200'     },
  banned:    { label: 'Banned',    dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 border-red-200'              },
};

// ─── Input helpers ────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function Input({ icon: Icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ElementType }) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />}
      <input
        className={cn(
          'w-full h-11 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 transition-all',
          'focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 placeholder:text-gray-300',
          Icon ? 'pl-10 pr-4' : 'px-4'
        )}
        {...props}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminStationsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm]     = useState('');
  const [showCreate, setShowCreate]     = useState(false);
  const [showPicker, setShowPicker]     = useState(false);
  const [form, setForm] = useState({
    ownerName: '', ownerPhone: '', ownerPassword: '',
    stationName: '', address: '', city: '',
    lat: 0, lng: 0, commissionPct: 10,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stations', statusFilter],
    queryFn: () => adminApi.getStations({ status: statusFilter || undefined }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: object) => adminApi.createStation(d),
    onSuccess: (res) => {
      toast.success(`"${res.data.station.name}" created`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'stations'] });
      setShowCreate(false);
      setForm({ ownerName: '', ownerPhone: '', ownerPassword: '', stationName: '', address: '', city: '', lat: 0, lng: 0, commissionPct: 10 });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create station'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminApi.updateStationStatus(id, status),
    onSuccess: () => { toast.success('Station updated'); queryClient.invalidateQueries({ queryKey: ['admin', 'stations'] }); },
  });

  const commissionMutation = useMutation({
    mutationFn: ({ id, commissionPct }: { id: string; commissionPct: number }) => adminApi.updateStationCommission(id, commissionPct),
    onSuccess: () => { toast.success('Commission updated'); queryClient.invalidateQueries({ queryKey: ['admin', 'stations'] }); },
  });

  function validate() {
    const e: Record<string, string> = {};
    if (!form.ownerName.trim())        e.ownerName    = 'Required';
    if (!form.ownerPhone.trim())       e.ownerPhone   = 'Required';
    if (form.ownerPassword.length < 6) e.ownerPassword = 'Min 6 characters';
    if (!form.stationName.trim())      e.stationName  = 'Required';
    if (!form.lat || !form.lng)        e.location     = 'Pick a location on the map';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    createMutation.mutate(form);
  }

  const allStations = data?.stations || [];
  const stations = allStations.filter((s: any) =>
    searchTerm
      ? s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.city?.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  // Summary counts
  const counts = {
    all:       allStations.length,
    active:    allStations.filter((s: any) => s.status === 'active').length,
    pending:   allStations.filter((s: any) => s.status === 'pending').length,
    suspended: allStations.filter((s: any) => s.status === 'suspended').length,
  };

  return (
    <div className="px-4 lg:px-6 py-6 max-w-6xl mx-auto space-y-5">

      {/* Location picker */}
      {showPicker && (
        <LocationPicker
          onConfirm={(loc: PickedLocation) => {
            setForm((f) => ({ ...f, address: loc.street, city: loc.city, lat: loc.lat, lng: loc.lng }));
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Create Station Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="text-base font-bold text-gray-900">New Station</h2>
                <p className="text-xs text-gray-400 mt-0.5">Create a station and owner account</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Owner Account</p>
              <Field label="Full Name" error={errors.ownerName}>
                <Input icon={User} placeholder="Owner's full name" value={form.ownerName} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} />
              </Field>
              <Field label="Phone Number" error={errors.ownerPhone}>
                <div className="flex">
                  <div className="flex items-center gap-1.5 px-3 h-11 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-600 shrink-0 select-none">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /><span>+233</span>
                  </div>
                  <input
                    type="tel" placeholder="XXXXXXXXX"
                    value={form.ownerPhone.replace('+233', '')}
                    onChange={(e) => setForm((f) => ({ ...f, ownerPhone: '+233' + e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                    className="flex-1 h-11 rounded-r-xl border border-gray-200 bg-gray-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  />
                </div>
              </Field>
              <Field label="Login Password" error={errors.ownerPassword}>
                <Input icon={Lock} type="password" placeholder="Min. 6 characters" value={form.ownerPassword} onChange={(e) => setForm((f) => ({ ...f, ownerPassword: e.target.value }))} />
              </Field>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4">Station Details</p>
                <div className="space-y-4">
                  <Field label="Station Name" error={errors.stationName}>
                    <Input icon={Building} placeholder="e.g. Kumasi Central Gas" value={form.stationName} onChange={(e) => setForm((f) => ({ ...f, stationName: e.target.value }))} />
                  </Field>
                  <Field label="Commission %" error={undefined}>
                    <Input icon={DollarSign} type="number" min="0" max="50" step="0.5" value={form.commissionPct} onChange={(e) => setForm((f) => ({ ...f, commissionPct: parseFloat(e.target.value) }))} />
                  </Field>
                  <Field label="Location" error={errors.location}>
                    <button type="button" onClick={() => setShowPicker(true)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                        form.lat ? 'border-blue-400 bg-blue-50' : 'border-dashed border-gray-200 hover:border-blue-300'
                      )}>
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', form.lat ? 'bg-blue-500' : 'bg-gray-100')}>
                        <MapPin className={cn('w-4 h-4', form.lat ? 'text-white' : 'text-gray-400')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {form.lat
                          ? <><p className="text-sm font-semibold text-gray-900 truncate">{form.address}</p><p className="text-xs text-gray-400">{form.city}</p></>
                          : <><p className="text-sm font-semibold text-gray-500">Pick location on map</p><p className="text-xs text-gray-400">Tap to open map</p></>
                        }
                      </div>
                    </button>
                  </Field>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 h-11 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending}
                  className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-60 transition-all">
                  {createMutation.isPending ? 'Creating…' : 'Create Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Stations', value: counts.all,       icon: Store,       bg: 'bg-blue-50',    text: 'text-blue-600',    iconBg: 'bg-blue-100'    },
          { label: 'Active',         value: counts.active,    icon: CheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
          { label: 'Pending',        value: counts.pending,   icon: TrendingUp,  bg: 'bg-amber-50',   text: 'text-amber-600',   iconBg: 'bg-amber-100'   },
          { label: 'Suspended',      value: counts.suspended, icon: XCircle,     bg: 'bg-orange-50',  text: 'text-orange-600',  iconBg: 'bg-orange-100'  },
        ].map(({ label, value, icon: Icon, bg, text, iconBg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
              <Icon className={`w-4 h-4 ${text}`} />
            </div>
            <p className={`text-2xl font-black ${text}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text" placeholder="Search stations…"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 bg-white border border-gray-200 rounded-xl pl-9 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          />
        </div>
        <div className="flex gap-1.5">
          {[['', 'All'], ['active', 'Active'], ['pending', 'Pending'], ['suspended', 'Suspended']].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border',
                statusFilter === val
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              )}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm shrink-0">
          <Plus className="w-4 h-4" /> New Station
        </button>
      </div>

      {/* ── Station list ── */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
      ) : stations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center shadow-sm">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Store className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-500">No stations found</p>
          <p className="text-xs text-gray-400 mt-1">Try a different filter or create a new station</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 text-sm text-blue-600 font-semibold hover:underline">
            + Create station
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {stations.map((station: any) => (
            <StationCard
              key={station._id}
              station={station}
              onUpdateStatus={(status) => statusMutation.mutate({ id: station._id, status })}
              onUpdateCommission={(commissionPct) => commissionMutation.mutate({ id: station._id, commissionPct })}
              loading={statusMutation.isPending || commissionMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Station Card ─────────────────────────────────────────────────────────────

function StationCard({ station, onUpdateStatus, onUpdateCommission, loading }: {
  station: any;
  onUpdateStatus: (status: string) => void;
  onUpdateCommission: (commissionPct: number) => void;
  loading: boolean;
}) {
  const [expanded, setExpanded]               = useState(false);
  const [editingCommission, setEditingCommission] = useState(false);
  const [newCommission, setNewCommission]     = useState(station.commissionPct || 10);

  const s = STATUS[station.status] || STATUS.pending;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Main row */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <Store className="w-5 h-5 text-blue-500" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 text-sm">{station.name}</p>
              <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border', s.badge)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
                {s.label}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{station.address}, {station.city}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Owner: <span className="text-gray-600 font-medium">{station.ownerId?.name || '—'}</span>
              {station.ownerId?.phone && <span className="ml-1 text-gray-400">· {station.ownerId.phone}</span>}
            </p>
          </div>

          {/* Expand toggle */}
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Package className="w-3.5 h-3.5 text-gray-400" />
            <span><span className="font-semibold text-gray-700">{station.totalOrders || 0}</span> orders</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span><span className="font-semibold text-gray-700">{station.ratingAvg?.toFixed(1) || '—'}</span> rating</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
            {editingCommission ? (
              <div className="flex items-center gap-1.5">
                <input type="number" min="0" max="50" step="0.5" value={newCommission}
                  onChange={(e) => setNewCommission(parseFloat(e.target.value))}
                  className="w-14 h-7 border border-gray-200 rounded-lg text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <span className="text-gray-400">%</span>
                <button onClick={() => { onUpdateCommission(newCommission); setEditingCommission(false); }}
                  className="text-xs font-bold text-blue-600 hover:underline">Save</button>
                <button onClick={() => setEditingCommission(false)} className="text-xs text-gray-400 hover:underline">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setEditingCommission(true)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                <DollarSign className="w-3.5 h-3.5" />
                <span className="font-semibold">{station.commissionPct || 10}% commission</span>
                <Edit2 className="w-3 h-3 ml-0.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded: stock + actions */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
          {/* Cylinder stock */}
          {station.cylinderListings?.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Inventory</p>
              <div className="flex flex-wrap gap-2">
                {station.cylinderListings.map((l: any) => (
                  <div key={l.size} className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold',
                    l.stockCount === 0
                      ? 'bg-red-50 border-red-200 text-red-600'
                      : l.stockCount <= l.lowStockThreshold
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  )}>
                    <span>{l.size}kg</span>
                    <span className="font-normal opacity-70">·</span>
                    <span>{l.stockCount === 0 ? 'Out of stock' : `${l.stockCount} left`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {station.status === 'pending' && (
              <>
                <button onClick={() => onUpdateStatus('active')} disabled={loading}
                  className="flex-1 h-9 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Activate
                </button>
                <button onClick={() => onUpdateStatus('banned')} disabled={loading}
                  className="flex-1 h-9 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-red-200">
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </>
            )}
            {station.status === 'active' && (
              <button onClick={() => onUpdateStatus('suspended')} disabled={loading}
                className="h-9 px-5 bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-bold rounded-xl transition-all border border-orange-200">
                Suspend
              </button>
            )}
            {station.status === 'suspended' && (
              <button onClick={() => onUpdateStatus('active')} disabled={loading}
                className="h-9 px-5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-bold rounded-xl transition-all border border-emerald-200">
                Reinstate
              </button>
            )}
            {station.status === 'banned' && (
              <button onClick={() => onUpdateStatus('pending')} disabled={loading}
                className="h-9 px-5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl transition-all">
                Review Again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
