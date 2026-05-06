'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  LogOut, MapPin, Plus, ChevronRight, Package,
  HelpCircle, FileText, Shield, Star, Trash2,
  Home, Building, Edit2, Check, X,
} from 'lucide-react';
import { api, usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, Button, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import type { PickedLocation } from '@/components/LocationPicker';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

const ACCOUNT_LINKS = [
  { label: 'Order History',    href: '/user/orders', icon: Package    },
  { label: 'Help & Support',   href: '#',            icon: HelpCircle },
  { label: 'Terms of Service', href: '#',            icon: FileText   },
  { label: 'Privacy Policy',   href: '#',            icon: Shield     },
];

const ADDRESS_LABELS = ['Home', 'Work', 'Other'];

interface Address {
  _id: string;
  label: string;
  street: string;
  city: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}

function getAddressIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes('home')) return Home;
  if (l.includes('work') || l.includes('office')) return Building;
  return MapPin;
}

export default function UserProfilePage() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showPicker, setShowPicker]       = useState(false);
  const [showForm, setShowForm]           = useState(false);
  const [editingAddr, setEditingAddr]     = useState<Address | null>(null);
  const [form, setForm] = useState({ label: 'Home', street: '', city: '', lat: 0, lng: 0, isDefault: false });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.get('/api/v1/users/me').then((r) => r.data.user),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => usersApi.addAddress(data),
    onSuccess: () => {
      toast.success('Address saved');
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      closeForm();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.updateAddress(id, data),
    onSuccess: () => {
      toast.success('Address updated');
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      closeForm();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteAddress(id),
    onSuccess: () => {
      toast.success('Address removed');
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });

  const addresses: Address[] = profile?.savedAddresses || [];

  function openAdd() {
    setEditingAddr(null);
    setForm({ label: 'Home', street: '', city: '', lat: 0, lng: 0, isDefault: addresses.length === 0 });
    setShowForm(true);
  }

  function openEdit(addr: Address) {
    setEditingAddr(addr);
    setForm({ label: addr.label, street: addr.street, city: addr.city, lat: addr.lat, lng: addr.lng, isDefault: addr.isDefault });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingAddr(null);
  }

  function handleLocationConfirm(loc: PickedLocation) {
    setForm((f) => ({ ...f, street: loc.street, city: loc.city, lat: loc.lat, lng: loc.lng }));
    setShowPicker(false);
  }

  function handleSave() {
    if (!form.street || !form.city) return toast.error('Please pick a location on the map');
    if (!form.lat || !form.lng) return toast.error('Please pick a location on the map');
    if (editingAddr) {
      updateMutation.mutate({ id: editingAddr._id, data: form });
    } else {
      addMutation.mutate(form);
    }
  }

  const handleLogout = () => { logout(); router.push('/'); };

  const displayName = profile?.name || user?.name || 'User';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  if (isLoading) {
    return (
      <div className="bg-[var(--bg)] p-4 lg:p-8 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg)] pb-28 lg:pb-8">

      {showPicker && (
        <LocationPicker
          onConfirm={handleLocationConfirm}
          onClose={() => setShowPicker(false)}
          initial={form.lat ? { lat: form.lat, lng: form.lng } : null}
        />
      )}

      {/* Mobile header */}
      <div className="lg:hidden bg-[var(--bg-card)] border-b border-[var(--border)] px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">My Profile</h1>
      </div>

      <div className="px-4 lg:px-8 py-5 max-w-4xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* ── Left: profile + nav ── */}
          <div className="w-full lg:w-72 shrink-0 space-y-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0 shadow-md shadow-brand-500/25">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-[var(--text-primary)] text-base truncate">{displayName}</p>
                  <p className="text-sm text-[var(--text-muted)] truncate">{profile?.phone || user?.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[var(--border)]">
                <div className="bg-brand-500/10 rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-brand-500">{profile?.totalOrders ?? 0}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Orders</p>
                </div>
                <div className="bg-amber-500/10 rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-amber-500">{profile?.loyaltyPoints ?? 0}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Points</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
              {ACCOUNT_LINKS.map(({ label, href, icon: Icon }, i) => (
                <Link key={label} href={href}>
                  <div className={cn(
                    'flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-card2)] transition-colors',
                    i < ACCOUNT_LINKS.length - 1 && 'border-b border-[var(--border)]'
                  )}>
                    <div className="w-8 h-8 bg-[var(--bg-card2)] rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                    <span className="text-sm font-medium text-[var(--text-primary)] flex-1">{label}</span>
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                  </div>
                </Link>
              ))}
            </div>

            <button onClick={handleLogout}
              className="w-full h-11 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
            <p className="text-center text-xs text-[var(--text-muted)]">GasGo v1.0.0</p>
          </div>

          {/* ── Right: addresses ── */}
          <div className="flex-1 space-y-4 w-full">

            {/* Add / Edit form */}
            {showForm && (
              <div className="bg-[var(--bg-card)] border-2 border-brand-500/30 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {editingAddr ? 'Edit Address' : 'New Address'}
                  </h3>
                  <button onClick={closeForm} className="p-1 rounded-lg hover:bg-[var(--bg-card2)]">
                    <X className="w-4 h-4 text-[var(--text-muted)]" />
                  </button>
                </div>
                <div className="flex gap-2 mb-4">
                  {ADDRESS_LABELS.map((l) => (
                    <button key={l} onClick={() => setForm((f) => ({ ...f, label: l }))}
                      className={cn('flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all',
                        form.label === l ? 'border-brand-500 bg-brand-500/10 text-brand-500' : 'border-[var(--border)] text-[var(--text-muted)]'
                      )}>
                      {l}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowPicker(true)}
                  className={cn('w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all mb-4',
                    form.lat ? 'border-brand-500 bg-brand-500/10' : 'border-dashed border-[var(--border)] hover:border-brand-500/50'
                  )}>
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', form.lat ? 'bg-brand-500' : 'bg-[var(--bg-card2)]')}>
                    <MapPin className={cn('w-4 h-4', form.lat ? 'text-white' : 'text-[var(--text-muted)]')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {form.lat ? (
                      <><p className="text-sm font-semibold text-[var(--text-primary)] truncate">{form.street}</p>
                        <p className="text-xs text-[var(--text-muted)]">{form.city}</p></>
                    ) : (
                      <><p className="text-sm font-semibold text-[var(--text-muted)]">Pick location on map</p>
                        <p className="text-xs text-[var(--text-muted)]">Tap to open map</p></>
                    )}
                  </div>
                  {form.lat && <Edit2 className="w-3.5 h-3.5 text-brand-500 shrink-0" />}
                </button>
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                  <div onClick={() => setForm((f) => ({ ...f, isDefault: !f.isDefault }))}
                    className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                      form.isDefault ? 'bg-brand-500 border-brand-500' : 'border-[var(--text-muted)]'
                    )}>
                    {form.isDefault && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-[var(--text-primary)]">Set as default address</span>
                </label>
                <div className="flex gap-2">
                  <button onClick={closeForm}
                    className="flex-1 h-11 rounded-xl border-2 border-[var(--border)] text-sm font-semibold text-[var(--text-muted)] transition-all">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={addMutation.isPending || updateMutation.isPending}
                    className="flex-1 h-11 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition-all disabled:opacity-60">
                    {addMutation.isPending || updateMutation.isPending ? 'Saving…' : editingAddr ? 'Update' : 'Save Address'}
                  </button>
                </div>
              </div>
            )}

            {/* Saved Addresses */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Saved Addresses</h3>
                {!showForm && (
                  <button onClick={openAdd} className="flex items-center gap-1 text-xs text-brand-500 font-semibold">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                )}
              </div>
              {addresses.length > 0 ? (
                <div className="space-y-2">
                  {addresses.map((addr) => {
                    const Icon = getAddressIcon(addr.label);
                    return (
                      <div key={addr._id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card2)] border border-[var(--border)]">
                        <div className="w-9 h-9 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-brand-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{addr.label}</p>
                            {addr.isDefault && (
                              <span className="text-[11px] font-semibold bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded-full">Default</span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-muted)] truncate">{addr.street}, {addr.city}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!addr.isDefault && (
                            <button onClick={() => updateMutation.mutate({ id: addr._id, data: { isDefault: true } })}
                              className="w-7 h-7 rounded-lg hover:bg-green-500/10 flex items-center justify-center transition-colors">
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            </button>
                          )}
                          <button onClick={() => openEdit(addr)}
                            className="w-7 h-7 rounded-lg hover:bg-brand-500/10 flex items-center justify-center transition-colors">
                            <Edit2 className="w-3.5 h-3.5 text-brand-500" />
                          </button>
                          <button onClick={() => deleteMutation.mutate(addr._id)} disabled={deleteMutation.isPending}
                            className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center transition-colors">
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-[var(--border)] rounded-2xl">
                  <MapPin className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-sm font-medium text-[var(--text-muted)]">No saved addresses</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Add one for faster checkout</p>
                  <button onClick={openAdd} className="mt-3 text-xs text-brand-500 font-semibold hover:underline">+ Add address</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
