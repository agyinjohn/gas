'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, AlertCircle, History, DollarSign, Check, ChevronRight, Plus, X } from 'lucide-react';
import { stationsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatCurrency, CYLINDER_SIZES, CYLINDER_LABELS, CYLINDER_CATEGORY, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const CATEGORIES = ['Small', 'Medium', 'Large'] as const;

const CAT_STYLE: Record<string, { badge: string; dot: string }> = {
  Small:  { badge: 'bg-brand-50 text-brand-600 border-brand-200',  dot: 'bg-brand-500'  },
  Medium: { badge: 'bg-brand-50 text-brand-600 border-brand-200',  dot: 'bg-brand-500'  },
  Large:  { badge: 'bg-brand-50 text-brand-600 border-brand-200',  dot: 'bg-brand-500'  },
};

interface Entry { fillPrice: number; exchangePrice: number; }

export default function StationPricingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const stationId = user?.stationId || (() => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gasgo_token') : null;
      if (!token) return '';
      return JSON.parse(atob(token.split('.')[1])).stationId || '';
    } catch { return ''; }
  })();
  const [tab, setTab] = useState<'pricing' | 'history'>('pricing');
  const [form, setForm] = useState<Record<number, Entry>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [allSizes, setAllSizes] = useState<number[]>([]);
  const [newSize, setNewSize] = useState('');
  const [newFillPrice, setNewFillPrice] = useState('');
  const [newExchangePrice, setNewExchangePrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number] | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingSize, setAddingSize] = useState(false);

  const { data: stationData, isLoading } = useQuery({
    queryKey: ['station', 'details', stationId],
    queryFn: () => stationsApi.getById(stationId).then((r) => r.data.station),
    enabled: !!stationId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ size, fillPrice, exchangePrice }: { size: number; fillPrice: number; exchangePrice: number }) =>
      stationsApi.updatePrices(stationId, { size, fillPrice, exchangePrice }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['station', 'details', stationId] }),
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update'),
  });

  useEffect(() => {
    if (!stationData?.cylinderListings) return;
    const map: Record<number, Entry> = {};
    const sizes = new Set<number>();
    
    CYLINDER_SIZES.forEach((s) => sizes.add(s));
    stationData.cylinderListings.forEach((l: any) => sizes.add(l.size));
    
    Array.from(sizes).forEach((s) => {
      const existing = stationData.cylinderListings.find((l: any) => l.size === s);
      map[s] = { fillPrice: existing?.fillPrice ?? 0, exchangePrice: existing?.exchangePrice ?? 0 };
    });
    
    setAllSizes(Array.from(sizes).sort((a, b) => a - b));
    setForm(map);
  }, [stationData]);

  function set(size: number, field: keyof Entry, val: string) {
    setForm((f) => ({ ...f, [size]: { ...f[size], [field]: parseFloat(val) || 0 } }));
  }

  function getListing(size: number) {
    return stationData?.cylinderListings?.find((l: any) => l.size === size);
  }

  function hasChanged(size: number) {
    const l = getListing(size);
    const e = form[size];
    if (!e) return false;
    if (!l) return e.fillPrice > 0;
    return l.fillPrice !== e.fillPrice || l.exchangePrice !== e.exchangePrice;
  }

  async function save(size: number) {
    const e = form[size];
    if (!e) return;
    if (e.fillPrice <= 0) return toast.error('Fill price must be greater than 0');
    if (e.exchangePrice > e.fillPrice) return toast.error('Exchange price cannot exceed fill price');
    setSaving(size);
    try {
      await updateMutation.mutateAsync({ size, fillPrice: e.fillPrice, exchangePrice: e.exchangePrice });
      toast.success(`${size}kg prices saved`);
    } finally {
      setSaving(null);
    }
  }

  async function saveAll() {
    const changed = allSizes.filter((s) => hasChanged(s));
    if (changed.length === 0) return toast('No changes to save');
    const invalid = changed.filter((s) => {
      const e = form[s];
      return e.fillPrice <= 0 || e.exchangePrice > e.fillPrice;
    });
    if (invalid.length > 0) return toast.error(`Fix errors on ${invalid.map((s) => s + 'kg').join(', ')} before saving`);
    setSaving(-1);
    try {
      await Promise.all(changed.map((s) =>
        updateMutation.mutateAsync({ size: s, fillPrice: form[s].fillPrice, exchangePrice: form[s].exchangePrice })
      ));
      toast.success(`${changed.length} size${changed.length > 1 ? 's' : ''} saved successfully`);
    } finally {
      setSaving(null);
    }
  }

  async function addCustomSize() {
    const size = parseInt(newSize);
    const fillPrice = parseFloat(newFillPrice);
    const exchangePrice = parseFloat(newExchangePrice);

    if (!size || size <= 0) return toast.error('Enter a valid size');
    if (allSizes.includes(size)) return toast.error('Size already exists');
    if (fillPrice <= 0) return toast.error('Fill price must be greater than 0');
    if (exchangePrice > fillPrice) return toast.error('Exchange price cannot exceed fill price');

    setAddingSize(true);
    try {
      // Save to backend immediately
      await updateMutation.mutateAsync({ size, fillPrice, exchangePrice });
      
      // Update local state
      setAllSizes([...allSizes, size].sort((a, b) => a - b));
      setForm((f) => ({ ...f, [size]: { fillPrice, exchangePrice } }));
      
      setNewSize('');
      setNewFillPrice('');
      setNewExchangePrice('');
      setSelectedCategory(null);
      setShowAddModal(false);
      toast.success(`${size}kg added with prices`);
    } finally {
      setAddingSize(false);
    }
  }

  const changedCount = allSizes.filter((s) => hasChanged(s)).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6 py-6 max-w-4xl mx-auto space-y-6">

      {/* Tabs */}
      <div className="flex gap-2 bg-[var(--bg-card)] border border-[var(--border)] p-1 rounded-xl w-fit shadow-sm">
        {[
          { key: 'pricing', label: 'Prices',  icon: DollarSign },
          { key: 'history', label: 'History', icon: History    },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === key ? 'bg-[var(--bg-card2)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'pricing' && (
        <div className="space-y-8">

          {/* Sticky Save All bar */}
          {changedCount > 0 && (
            <div className="sticky top-14 z-10 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center justify-between shadow-sm">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                <span className="text-brand-600 font-black">{changedCount}</span> unsaved change{changedCount > 1 ? 's' : ''}
              </p>
              <button
                onClick={saveAll}
                disabled={saving === -1}
                className="flex items-center gap-2 h-9 px-5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl disabled:opacity-60 transition-all shadow-lg shadow-brand-500/25"
              >
                {saving === -1
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Save className="w-4 h-4" /> Save All</>}
              </button>
            </div>
          )}

          {/* Add Custom Size Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 h-10 px-4 bg-[var(--bg-card)] hover:bg-[var(--bg-card2)] text-purple-600 text-sm font-semibold rounded-xl border border-purple-200 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Custom Size
          </button>

          {CATEGORIES.map((cat) => {
            const sizes = allSizes.filter((s) => CYLINDER_CATEGORY[s] === cat);
            
            if (sizes.length === 0) return null;
            
            const style = CAT_STYLE[cat];
            return (
              <div key={cat}>
                {/* Category header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className={cn('flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border', style.badge)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
                    {cat}
                  </span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-xs text-[var(--text-muted)]">{sizes.length} sizes</span>
                </div>

                {/* Size grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sizes.map((size) => {
                    const entry = form[size] ?? { fillPrice: 0, exchangePrice: 0 };
                    const listing = getListing(size);
                    const changed = hasChanged(size);
                    const invalid = entry.exchangePrice > entry.fillPrice && entry.exchangePrice > 0;
                    const isSaving = saving === size;
                    const discount = entry.fillPrice > 0 && entry.exchangePrice > 0 && !invalid
                      ? ((1 - entry.exchangePrice / entry.fillPrice) * 100).toFixed(0)
                      : null;

                    return (
                      <div key={size} className={cn(
                        'bg-[var(--bg-card)] rounded-2xl border p-4 shadow-sm transition-all',
                        invalid ? 'border-red-200' : changed ? 'border-brand-300 shadow-brand-500/10' : 'border-[var(--border)]'
                      )}>
                        {/* Size badge + save */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              'w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0',
                              changed ? 'bg-brand-500' : 'bg-[var(--bg-card2)]'
                            )}>
                              <span className={cn('text-base font-black leading-none', changed ? 'text-white' : 'text-[var(--text-primary)]')}>{size}</span>
                              <span className={cn('text-[9px] font-bold', changed ? 'text-white/70' : 'text-[var(--text-muted)]')}>kg</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[var(--text-primary)]">{size}kg</p>
                              <p className="text-[10px] text-[var(--text-muted)] leading-tight max-w-[100px] truncate">
                                {CYLINDER_LABELS[size]?.split('—')[1]?.trim() || 'Custom'}
                              </p>
                            </div>
                          </div>
                          {changed ? (
                            <button onClick={() => save(size)} disabled={isSaving || saving === -1 || invalid}
                              className="flex items-center gap-1 h-7 px-2.5 bg-brand-500 hover:bg-brand-600 text-white text-[11px] font-bold rounded-lg disabled:opacity-50 transition-all shrink-0">
                              {isSaving
                                ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                : <><Save className="w-3 h-3" /> Save</>
                              }
                            </button>
                          ) : listing?.fillPrice > 0 ? (
                            <span className="flex items-center gap-1 text-[11px] text-brand-600 font-semibold shrink-0">
                              <Check className="w-3 h-3" /> Set
                            </span>
                          ) : null}
                        </div>

                        {/* Inputs */}
                        <div className="space-y-2">
                          <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1">Fill Price</label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-semibold">₵</span>
                              <input
                                type="number" step="0.01" min="0"
                                value={entry.fillPrice || ''}
                                onChange={(e) => set(size, 'fillPrice', e.target.value)}
                                placeholder="0.00"
                                className={cn(
                                  'w-full h-9 rounded-lg border bg-[var(--bg-card2)] pl-6 pr-2 text-sm font-semibold text-[var(--text-primary)] transition-all',
                                  'focus:outline-none focus:bg-[var(--bg-card)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                                  'border-[var(--border)] placeholder:text-[var(--text-muted)]'
                                )}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1">Exchange Price</label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-semibold">₵</span>
                              <input
                                type="number" step="0.01" min="0"
                                value={entry.exchangePrice || ''}
                                onChange={(e) => set(size, 'exchangePrice', e.target.value)}
                                placeholder="0.00"
                                className={cn(
                                  'w-full h-9 rounded-lg border bg-[var(--bg-card2)] pl-6 pr-2 text-sm font-semibold text-[var(--text-primary)] transition-all',
                                  'focus:outline-none focus:bg-[var(--bg-card)] focus:ring-2',
                                  invalid
                                    ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
                                    : 'border-[var(--border)] focus:border-brand-500 focus:ring-brand-500/20',
                                  'placeholder:text-[var(--text-muted)]'
                                )}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Footer info */}
                        <div className="mt-2.5 pt-2.5 border-t border-[var(--border)]">
                          {invalid ? (
                            <div className="flex items-center gap-1.5 text-[11px] text-red-500">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              Exchange must be ≤ fill price
                            </div>
                          ) : discount ? (
                            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                              <span>Exchange discount</span>
                              <span className="font-semibold text-[var(--text-primary)]">{discount}% off</span>
                            </div>
                          ) : listing?.fillPrice > 0 ? (
                            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                              <span>Fill</span>
                              <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(listing.fillPrice)}</span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-[var(--text-muted)]">No price set yet</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {stationData?.priceChangeLog?.length > 0 ? (
            [...stationData.priceChangeLog].reverse().slice(0, 30).map((c: any, i: number) => (
              <div key={i} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-[var(--bg-card2)] rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-[var(--text-primary)]">{c.size}kg</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{c.size}kg Price Update</p>
                    <p className="text-xs text-[var(--text-muted)]">{new Date(c.changedAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Fill', old: c.oldFillPrice, nw: c.newFillPrice },
                    { label: 'Exchange', old: c.oldExchangePrice, nw: c.newExchangePrice },
                  ].map(({ label, old, nw }) => (
                    <div key={label} className="bg-[var(--bg-card2)] rounded-xl px-3 py-2">
                      <p className="text-[10px] text-[var(--text-muted)] mb-1 uppercase tracking-widest font-semibold">{label}</p>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[var(--text-muted)]">{formatCurrency(old)}</span>
                        <ChevronRight className="w-3 h-3 text-gray-300" />
                        <span className="font-bold text-[var(--text-primary)]">{formatCurrency(nw)}</span>
                        <span className={cn(
                          'ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                          nw > old ? 'bg-red-50 text-red-500' : nw < old ? 'bg-brand-50 text-brand-600' : 'bg-gray-100 text-gray-500'
                        )}>
                          {nw > old ? '▲' : nw < old ? '▼' : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] py-16 text-center shadow-sm">
              <History className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-sm font-semibold text-[var(--text-muted)]">No price history yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Changes appear here after you save prices</p>
            </div>
          )}
        </div>
      )}

      {/* Add Custom Size Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full space-y-6 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Add Custom Size</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewSize('');
                  setNewFillPrice('');
                  setNewExchangePrice('');
                  setSelectedCategory(null);
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!selectedCategory ? (
              <div className="space-y-3">
                <p className="text-sm text-[var(--text-primary)]">Select a category for this size:</p>
                {CATEGORIES.map((cat) => {
                  const style = CAT_STYLE[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        'w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                        'hover:border-current hover:shadow-md',
                        style.badge
                      )}
                    >
                      <span className={cn('w-3 h-3 rounded-full', style.dot)} />
                      <span className="font-semibold">{cat}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-[var(--bg-card2)] rounded-lg">
                  <span className={cn('w-2.5 h-2.5 rounded-full', CAT_STYLE[selectedCategory].dot)} />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedCategory}</span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Size (kg)</label>
                  <input
                    type="number"
                    min="1"
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    placeholder="Enter size"
                    autoFocus
                    className={cn(
                      'w-full h-10 rounded-lg border px-3 text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-card)] focus:outline-none focus:ring-2 placeholder:text-[var(--text-muted)]',
                      newSize && allSizes.includes(parseInt(newSize))
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
                        : 'border-[var(--border)] focus:border-brand-500 focus:ring-brand-500/20'
                    )}
                  />
                  {newSize && allSizes.includes(parseInt(newSize)) && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> This size already exists
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Fill Price (₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newFillPrice}
                    onChange={(e) => setNewFillPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-10 rounded-lg border border-[var(--border)] px-3 text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-card)] focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-[var(--text-muted)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Exchange Price (₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newExchangePrice}
                    onChange={(e) => setNewExchangePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-10 rounded-lg border border-[var(--border)] px-3 text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-card)] focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-[var(--text-muted)]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setNewSize('');
                      setNewFillPrice('');
                      setNewExchangePrice('');
                      setSelectedCategory(null);
                    }}
                    className="flex-1 h-10 rounded-lg border border-[var(--border)] text-[var(--text-primary)] font-semibold hover:bg-[var(--bg-card2)] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addCustomSize}
                    disabled={addingSize || !!(newSize && allSizes.includes(parseInt(newSize)))}
                    className="flex-1 h-10 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {addingSize ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Size'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
