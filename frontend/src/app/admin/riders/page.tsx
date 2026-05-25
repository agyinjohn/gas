'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, CheckCircle, XCircle, Eye, Search, Bike,
  Star, TrendingUp, Clock, X, Phone, CreditCard,
  ShieldCheck, ShieldX, Ban, RotateCcw, ExternalLink, MapPin,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const KYC_STYLE: Record<string, { badge: string; dot: string }> = {
  pending:  { badge: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-400'  },
  approved: { badge: 'bg-green-50 text-green-700 border-green-200',   dot: 'bg-green-500'  },
  rejected: { badge: 'bg-red-50 text-red-700 border-red-200',         dot: 'bg-red-500'    },
};

const STATUS_STYLE: Record<string, string> = {
  available:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  busy:       'bg-blue-50 text-blue-700 border-blue-200',
  offline:    'bg-gray-100 text-gray-500 border-gray-200',
  suspended:  'bg-red-50 text-red-700 border-red-200',
};

const VEHICLE_ICON: Record<string, string> = {
  motorbike: '🏍️',
  tricycle:  '🛺',
  van:       '🚐',
};

const FILTERS = [
  { label: 'All',         value: ''         },
  { label: 'Pending KYC', value: 'pending'  },
  { label: 'Approved',    value: 'approved' },
  { label: 'Rejected',    value: 'rejected' },
];

export default function AdminRidersPage() {
  const queryClient = useQueryClient();
  const [kycFilter, setKycFilter] = useState('');
  const [search, setSearch]       = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [selected, setSelected]   = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'riders', kycFilter, search, zoneFilter],
    queryFn: () => adminApi.getRiders({
      kycStatus: kycFilter || undefined,
      search: search || undefined,
      zoneId: zoneFilter || undefined,
    }).then((r) => r.data),
  });

  const { data: allData } = useQuery({
    queryKey: ['admin', 'riders', 'all-stats'],
    queryFn: () => adminApi.getRiders({}).then((r) => r.data),
    staleTime: 60000,
  });

  const kycMutation = useMutation({
    mutationFn: ({ id, kycStatus, reason }: { id: string; kycStatus: string; reason?: string }) =>
      adminApi.updateRiderKYC(id, kycStatus, reason),
    onSuccess: (_, { kycStatus }) => {
      toast.success(`KYC ${kycStatus}`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'riders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      setSelected(null);
      setShowRejectInput(false);
      setRejectReason('');
    },
    onError: () => toast.error('Failed to update KYC'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateRiderStatus(id, status),
    onSuccess: (_, { status }) => {
      toast.success(`Rider ${status}`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'riders'] });
      setSelected(null);
    },
    onError: () => toast.error('Failed to update status'),
  });

  const zoneMutation = useMutation({
    mutationFn: ({ riderId, zoneId }: { riderId: string; zoneId: string | null }) =>
      adminApi.assignRiderZone(riderId, zoneId),
    onSuccess: () => {
      toast.success('Zone updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'riders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'riders', 'all-stats'] });
    },
    onError: () => toast.error('Failed to update zone'),
  });

  const { data: zonesData } = useQuery({
    queryKey: ['admin', 'zones'],
    queryFn: () => adminApi.getZones().then((r) => r.data.zones),
  });
  const zones: any[] = zonesData || [];

  const riders = data?.riders || [];
  const allRiders = allData?.riders || [];
  const pending    = allRiders.filter((r: any) => r.kycStatus === 'pending').length;
  const approved   = allRiders.filter((r: any) => r.kycStatus === 'approved').length;
  const suspended  = allRiders.filter((r: any) => r.status === 'suspended').length;
  const totalTrips = allRiders.reduce((s: number, r: any) => s + (r.totalTrips || 0), 0);

  const mutating = kycMutation.isPending || statusMutation.isPending || zoneMutation.isPending;

  return (
    <div className="px-4 lg:px-6 py-6 max-w-7xl mx-auto space-y-5 pb-10">

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pending KYC',   value: pending,   icon: Clock,       color: 'text-amber-600',  bg: 'bg-amber-50'  },
          { label: 'Approved',      value: approved,  icon: ShieldCheck, color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Suspended',     value: suspended, icon: Ban,         color: 'text-red-600',    bg: 'bg-red-50'    },
          { label: 'Total Trips',   value: totalTrips,icon: TrendingUp,  color: 'text-blue-600',   bg: 'bg-blue-50'   },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-2xl font-black leading-none ${color}`}>{value}</p>
            <p className="text-xs font-semibold text-gray-600 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Search + filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, phone, plate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        {/* Zone filter */}
        <select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[160px]"
        >
          <option value="">All Zones</option>
          <option value="unassigned">Unassigned</option>
          {zones.map((z: any) => (
            <option key={z._id} value={z._id}>{z.name} ({z.city})</option>
          ))}
        </select>
        <div className="flex gap-1.5 bg-white border border-gray-200 rounded-xl p-1">
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setKycFilter(value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                kycFilter === value
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : riders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center shadow-sm">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">No riders found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Rider', 'Vehicle', 'Trips / Rating', 'Earnings', 'KYC', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {riders.map((rider: any) => (
                  <tr key={rider._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                          <span className="text-sm font-black text-violet-600">
                            {rider.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{rider.name}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" />{rider.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-800 capitalize">
                        {VEHICLE_ICON[rider.vehicleType] || '🚗'} {rider.vehicleType}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">{rider.vehiclePlate}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900">{rider.totalTrips || 0} trips</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {rider.ratingAvg?.toFixed(1) || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900">GH₵{(rider.totalEarnings || 0).toFixed(0)}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border', KYC_STYLE[rider.kycStatus]?.badge)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', KYC_STYLE[rider.kycStatus]?.dot)} />
                        {rider.kycStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex text-[11px] font-bold px-2.5 py-1 rounded-full border', STATUS_STYLE[rider.status] || STATUS_STYLE.offline)}>
                        {rider.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => { setSelected(rider); setShowRejectInput(false); setRejectReason(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {riders.map((rider: any) => (
              <div key={rider._id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <span className="text-base font-black text-violet-600">{rider.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{rider.name}</p>
                    <p className="text-xs text-gray-400">{rider.phone}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', KYC_STYLE[rider.kycStatus]?.badge)}>
                      {rider.kycStatus}
                    </span>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', STATUS_STYLE[rider.status] || STATUS_STYLE.offline)}>
                      {rider.status}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: 'Vehicle', value: `${VEHICLE_ICON[rider.vehicleType] || ''} ${rider.vehicleType}` },
                    { label: 'Trips',   value: rider.totalTrips || 0 },
                    { label: 'Rating',  value: rider.ratingAvg?.toFixed(1) || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-[10px] text-gray-400 font-semibold">{label}</p>
                      <p className="text-xs font-bold text-gray-800 mt-0.5 capitalize">{value}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setSelected(rider); setShowRejectInput(false); setRejectReason(''); }}
                  className="w-full h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Eye className="w-3.5 h-3.5" /> Review Rider
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Detail Drawer ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative ml-auto w-full max-w-md h-full bg-white shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                <span className="text-base font-black text-violet-600">{selected.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{selected.name}</p>
                <p className="text-xs text-gray-400">{selected.phone}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all shrink-0"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Status badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border', KYC_STYLE[selected.kycStatus]?.badge)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', KYC_STYLE[selected.kycStatus]?.dot)} />
                  KYC: {selected.kycStatus}
                </span>
                <span className={cn('inline-flex text-xs font-bold px-3 py-1.5 rounded-full border', STATUS_STYLE[selected.status] || STATUS_STYLE.offline)}>
                  {selected.status}
                </span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Vehicle Type',  value: `${VEHICLE_ICON[selected.vehicleType] || ''} ${selected.vehicleType}`, icon: Bike },
                  { label: 'Plate Number',  value: selected.vehiclePlate,                                                  icon: CreditCard },
                  { label: 'Total Trips',   value: selected.totalTrips || 0,                                               icon: TrendingUp },
                  { label: 'Rating',        value: selected.ratingAvg ? `⭐ ${selected.ratingAvg.toFixed(2)}` : '—',      icon: Star },
                  { label: 'Total Earnings',value: `GH₵${(selected.totalEarnings || 0).toFixed(2)}`,                      icon: TrendingUp },
                  { label: 'Joined',        value: new Date(selected.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }), icon: Clock },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-sm font-semibold text-gray-900 capitalize">{value}</p>
                  </div>
                ))}
              </div>

              {/* National ID */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">National ID</p>
                <p className="text-sm font-semibold text-gray-900 font-mono">{selected.nationalId || '—'}</p>
              </div>

              {/* Bank account */}
              {selected.bankAccount?.accountNumber && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Bank / MoMo Account</p>
                  <p className="text-sm font-semibold text-gray-900">{selected.bankAccount.accountName}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{selected.bankAccount.accountNumber}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{selected.bankAccount.provider}</p>
                </div>
              )}

              {/* KYC document */}
              {selected.kycDocumentUrl && (
                <a
                  href={selected.kycDocumentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-all"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  View KYC Document
                </a>
              )}

              {/* Zone assignment */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Assigned Zone</p>
                <select
                  value={selected.assignedZone || ''}
                  onChange={(e) => zoneMutation.mutate({ riderId: selected._id, zoneId: e.target.value || null })}
                  disabled={mutating}
                  className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
                >
                  <option value="">— No zone assigned —</option>
                  {zones.map((z: any) => (
                    <option key={z._id} value={z._id}>{z.name} ({z.city})</option>
                  ))}
                </select>
              </div>

              {/* Rejection reason */}
              {selected.kycRejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-700 mb-1">Rejection Reason</p>
                  <p className="text-xs text-red-600">{selected.kycRejectionReason}</p>
                </div>
              )}

              {/* Reject reason input */}
              {showRejectInput && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Rejection Reason</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Document not legible, ID expired..."
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  />
                </div>
              )}
            </div>

            {/* Drawer actions */}
            <div className="px-5 py-4 border-t border-gray-100 space-y-2 shrink-0">
              {selected.kycStatus === 'pending' && !showRejectInput && (
                <div className="flex gap-2">
                  <button
                    onClick={() => kycMutation.mutate({ id: selected._id, kycStatus: 'approved' })}
                    disabled={mutating}
                    className="flex-1 h-11 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" /> Approve KYC
                  </button>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    disabled={mutating}
                    className="flex-1 h-11 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold disabled:opacity-60 transition-all flex items-center justify-center gap-2 border border-red-200"
                  >
                    <ShieldX className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}

              {showRejectInput && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                    className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => kycMutation.mutate({ id: selected._id, kycStatus: 'rejected', reason: rejectReason || 'Document not valid' })}
                    disabled={mutating}
                    className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                  >
                    {mutating
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <><XCircle className="w-4 h-4" /> Confirm Reject</>
                    }
                  </button>
                </div>
              )}

              {selected.kycStatus === 'approved' && selected.status !== 'suspended' && (
                <button
                  onClick={() => statusMutation.mutate({ id: selected._id, status: 'suspended' })}
                  disabled={mutating}
                  className="w-full h-11 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold disabled:opacity-60 transition-all flex items-center justify-center gap-2 border border-red-200"
                >
                  <Ban className="w-4 h-4" /> Suspend Rider
                </button>
              )}

              {selected.status === 'suspended' && (
                <button
                  onClick={() => statusMutation.mutate({ id: selected._id, status: 'active' })}
                  disabled={mutating}
                  className="w-full h-11 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Reinstate Rider
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
