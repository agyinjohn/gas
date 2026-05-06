'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  MapPin, Star, ArrowLeft, Package, RefreshCw, Truck,
  CheckCircle2, ShieldCheck, Zap, Phone, CreditCard,
  Banknote, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { stationsApi, ordersApi, usersApi } from '@/lib/api';
import { Station, OrderType, PaymentMethod } from '@/types';
import { formatCurrency, CYLINDER_LABELS, ORDER_TYPE_LABELS } from '@/lib/utils';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import type { PickedLocation } from '@/components/LocationPicker';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });


const ORDER_TYPES = [
  { type: 'delivery' as OrderType, icon: Truck, label: 'New Delivery', desc: 'Get a pre-filled cylinder delivered' },
  { type: 'exchange' as OrderType, icon: RefreshCw, label: 'Exchange', desc: 'Coming soon', disabled: true },
];

const PAYMENT_METHODS = [
  { method: 'mobile_money' as PaymentMethod, icon: Phone, label: 'Mobile Money', desc: 'MTN, Vodafone, AirtelTigo' },
  { method: 'card' as PaymentMethod, icon: CreditCard, label: 'Debit / Credit Card', desc: 'Visa, Mastercard' },
  { method: 'cash' as PaymentMethod, icon: Banknote, label: 'Cash on Delivery', desc: 'Pay when received' },
];

const MOBILE_PROVIDERS = [
  { value: 'mtn', label: 'MTN' },
  { value: 'vod', label: 'Vodafone' },
  { value: 'tgo', label: 'AirtelTigo' },
];

const STEPS = ['Choose', 'Details', 'Confirm'];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-0 px-4 py-3 bg-white border-b border-gray-100">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
              i < step ? 'bg-brand-500 text-white' :
                i === step ? 'bg-brand-500 text-white ring-4 ring-brand-100' :
                  'bg-gray-100 text-gray-400'
            )}>
              {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn('text-[10px] font-semibold', i <= step ? 'text-brand-600' : 'text-gray-400')}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn('flex-1 h-0.5 mx-1 mb-4 rounded-full transition-colors', i < step ? 'bg-brand-500' : 'bg-gray-100')} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Cylinder card ────────────────────────────────────────────────────────────

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="animate-pulse px-4 py-5 space-y-4">
      <div className="h-5 bg-gray-200 rounded w-1/3" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-24 bg-gray-200 rounded-2xl" />
        <div className="h-24 bg-gray-200 rounded-2xl" />
      </div>
      {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-200 rounded-2xl" />)}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [orderType, setOrderType] = useState<OrderType>('delivery');
  const [cart, setCart] = useState<Record<number, number>>({}); // size -> quantity
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_money');
  const [mobileProvider, setMobileProvider] = useState('mtn');
  const [loading, setLoading] = useState(false);

  // derive street/city from locationLabel for display
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');

  const totalQty = Object.values(cart).reduce((a, b) => a + b, 0);

  function setQty(size: number, delta: number) {
    setCart((prev) => {
      const next = (prev[size] ?? 0) + delta;
      if (next <= 0) { const { [size]: _, ...rest } = prev; return rest; }
      const listing = station?.cylinderListings.find((l) => l.size === size);
      if (listing && next > listing.stockCount) return prev;
      return { ...prev, [size]: next };
    });
  }

  const { data: station, isLoading } = useQuery({
    queryKey: ['station', id],
    queryFn: () => stationsApi.getById(id).then((r) => r.data.station as Station),
  });

  const { data: userData } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => usersApi.getMe().then((r) => r.data.user),
    staleTime: 60000,
  });

  const savedAddresses = userData?.savedAddresses ?? [];
  const defaultAddress = savedAddresses.find((a: any) => a.isDefault) ?? savedAddresses[0] ?? null;

  // Auto-select default address on first load
  useEffect(() => {
    if (defaultAddress && !street) {
      setStreet(defaultAddress.street);
      setCity(defaultAddress.city);
      setLat(defaultAddress.lat);
      setLng(defaultAddress.lng);
      setLocationLabel(defaultAddress.street + ', ' + defaultAddress.city);
    }
  }, [defaultAddress]);

  const available = station?.cylinderListings.filter((l) => l.isAvailable && l.stockCount > 0) ?? [];

  // Compute totals from cart
  const cartItems = Object.entries(cart).map(([size, qty]) => {
    const listing = station?.cylinderListings.find((l) => l.size === Number(size))!;
    const unitPrice = orderType === 'exchange' ? listing.exchangePrice : listing.fillPrice;
    return { size: Number(size), quantity: qty, unitPrice, subtotal: unitPrice * qty };
  });
  const cylinderSubtotal = cartItems.reduce((a, b) => a + b.subtotal, 0);
  const deliveryFee = totalQty === 0 ? 5 : totalQty === 1 ? 5 : totalQty === 2 ? 7.5 : 10;
  const total = cylinderSubtotal + deliveryFee;

  function goNext() {
    if (step === 0 && totalQty === 0) { toast.error('Add at least one cylinder'); return; }
    if (step === 1 && (!street.trim() || !city.trim())) { toast.error('Set your delivery location on the map'); return; }
    setStep((s) => s + 1);
  }

  function handleLocationConfirm(loc: PickedLocation) {
    setStreet(loc.street);
    setCity(loc.city);
    setLat(loc.lat);
    setLng(loc.lng);
    setLocationLabel(loc.formatted);
    setShowPicker(false);
  }

  async function handlePlaceOrder() {
    setLoading(true);
    try {
      const { data } = await ordersApi.create({
        stationId: id,
        cylinders: cartItems.map(({ size, quantity }) => ({ size, quantity })),
        orderType,
        deliveryAddress: { street, city, lat: lat ?? 0, lng: lng ?? 0 },
        paymentMethod,
        paymentProvider: paymentMethod === 'mobile_money' ? mobileProvider : undefined,
      });

      if (data.payment?.authorizationUrl) {
        window.location.href = data.payment.authorizationUrl;
      } else {
        toast.success('Order placed!');
        router.push(`/user/orders/${data.order._id || data.order.id}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) return <LoadingSkeleton />;

  if (!station) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Station not found</p>
          <Link href="/user" className="text-brand-500 text-sm font-medium">← Go back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 pb-28 lg:pb-0">

      {showPicker && (
        <LocationPicker
          onConfirm={handleLocationConfirm}
          onClose={() => setShowPicker(false)}
        />
      )}
      {/* ── Station header ── */}
      <div className="bg-white border-b border-gray-100 px-4 lg:px-8 pt-5 pb-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/user" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All stations
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-black text-gray-900">{station.name}</h1>
              <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-0.5 mb-2">
                <MapPin className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                <span className="truncate">{station.address}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-full px-3 py-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                <span className="text-amber-700 text-xs font-bold">{station.ratingAvg.toFixed(1)}</span>
                <span className="text-amber-500 text-xs">({station.totalOrders})</span>
              </div>
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="text-green-700 text-xs font-medium">Open · 8AM–6PM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Step indicator ── */}
      <div className="max-w-5xl mx-auto">
        <StepBar step={step} />
      </div>

      {/* ── Step content ── */}
      <div className="px-4 lg:px-8 py-5 max-w-5xl mx-auto">
        <div className="flex gap-8 items-start">
          <div className="flex-1 space-y-5">

            {/* ── Step 0: Choose type + size ── */}
            {step === 0 && (
              <>
                {/* Order type */}
                <div>
                  <h2 className="text-sm font-bold text-gray-900 mb-2.5">Order Type</h2>
                  <div className="grid grid-cols-2 gap-2.5">
                    {ORDER_TYPES.map(({ type, icon: Icon, label, desc, disabled }) => (
                      <button
                        key={type}
                        onClick={() => !disabled && setOrderType(type)}
                        disabled={disabled}
                        className={cn(
                          'p-4 rounded-2xl border-2 text-left transition-all relative',
                          disabled ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed' :
                          orderType === type ? 'border-brand-500 bg-brand-50' : 'border-gray-100 bg-white hover:border-gray-200'
                        )}
                      >
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-2.5', orderType === type && !disabled ? 'bg-brand-500' : 'bg-gray-100')}>
                          <Icon className={cn('w-4 h-4', orderType === type && !disabled ? 'text-white' : 'text-gray-400')} />
                        </div>
                        <p className={cn('text-sm font-bold', disabled ? 'text-gray-400' : orderType === type ? 'text-brand-700' : 'text-gray-800')}>{label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                        {disabled && (
                          <span className="absolute top-2 right-2 text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Soon</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cylinder sizes */}
                <div>
                  <h2 className="text-sm font-bold text-gray-900 mb-1">Select Cylinders</h2>
                  <p className="text-xs text-gray-400 mb-2.5">Tick to select, use +/− to adjust quantity</p>
                  {available.length === 0 ? (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
                      <span className="text-2xl">📦</span>
                      <p className="text-sm font-bold text-red-600 mt-2">Station is out of stock</p>
                      <p className="text-xs text-red-400 mt-1">No cylinders are currently available at this station</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {available.map((listing) => {
                        const qty = cart[listing.size] ?? 0;
                        const checked = qty > 0;
                        const unitPrice = orderType === 'exchange' ? listing.exchangePrice : listing.fillPrice;
                        const savings = orderType === 'exchange' ? listing.fillPrice - listing.exchangePrice : 0;
                        const lowStock = listing.stockCount <= 5;
                        return (
                          <div
                            key={listing.size}
                            className={cn(
                              'bg-white rounded-2xl border-2 p-4 transition-all',
                              checked ? 'border-brand-500 bg-brand-50 shadow-lg shadow-brand-500/10' : 'border-gray-100 hover:border-gray-200'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              {/* Checkbox */}
                              <button
                                onClick={() => checked ? setQty(listing.size, -qty) : setQty(listing.size, 1)}
                                className="shrink-0"
                              >
                                <div className={cn(
                                  'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                                  checked ? 'bg-brand-500 border-brand-500' : 'border-gray-300 bg-white'
                                )}>
                                  {checked && (
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                              </button>

                              {/* Cylinder icon */}
                              <div className={cn(
                                'w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0',
                                checked ? 'bg-brand-500' : 'bg-gray-50'
                              )}>
                                <span className={cn('text-lg font-black leading-none', checked ? 'text-white' : 'text-gray-700')}>{listing.size}</span>
                                <span className={cn('text-[10px] font-bold', checked ? 'text-white/70' : 'text-gray-400')}>kg</span>
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 text-sm">{listing.size}kg &middot; {formatCurrency(unitPrice)}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className={cn(
                                    'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                                    lowStock ? 'text-amber-700 bg-amber-50' : 'text-green-700 bg-green-50'
                                  )}>
                                    {lowStock ? `Only ${listing.stockCount} left` : `${listing.stockCount} in stock`}
                                  </span>
                                  {savings > 0 && (
                                    <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                      Save {formatCurrency(savings)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Quantity stepper — only visible when checked */}
                              {checked && (
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => setQty(listing.size, -1)}
                                    className="w-7 h-7 rounded-full border-2 border-brand-200 bg-white flex items-center justify-center text-brand-600 font-bold hover:bg-brand-100 transition-all"
                                  >−</button>
                                  <span className="w-5 text-center font-black text-sm text-brand-600">{qty}</span>
                                  <button
                                    onClick={() => setQty(listing.size, 1)}
                                    disabled={qty >= listing.stockCount}
                                    className="w-7 h-7 rounded-full border-2 border-brand-200 bg-white flex items-center justify-center text-brand-600 font-bold hover:bg-brand-100 transition-all disabled:opacity-30"
                                  >+</button>
                                </div>
                              )}
                            </div>

                            {/* Subtotal row */}
                            {checked && (
                              <div className="mt-3 pt-3 border-t border-brand-100 flex justify-between text-xs">
                                <span className="text-brand-600">{qty} × {formatCurrency(unitPrice)}</span>
                                <span className="font-bold text-brand-700">{formatCurrency(unitPrice * qty)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Out of stock */}
                {station.cylinderListings.some((l) => !l.isAvailable || l.stockCount === 0) && (
                  <div>
                    <h2 className="text-sm font-bold text-gray-400 mb-2">Out of Stock</h2>
                    <div className="space-y-2">
                      {station.cylinderListings.filter((l) => !l.isAvailable || l.stockCount === 0).map((l) => (
                        <div key={l.size} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 opacity-50">
                          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex flex-col items-center justify-center shrink-0">
                            <span className="text-2xl font-black text-gray-400">{l.size}</span>
                            <span className="text-[11px] text-gray-400">kg</span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-500 text-sm">{l.size}kg Cylinder</p>
                            <p className="text-xs text-gray-400">{CYLINDER_LABELS[l.size]}</p>
                          </div>
                          <span className="ml-auto text-xs text-red-400 bg-red-50 px-2.5 py-1 rounded-full font-medium">Out of stock</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Step 1: Delivery address + payment ── */}
            {step === 1 && (
              <>
                {/* Cart recap */}
                {totalQty > 0 && (
                  <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 space-y-2">
                    {cartItems.map((item) => (
                      <div key={item.size} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-500 rounded-xl flex flex-col items-center justify-center shrink-0">
                          <span className="text-white font-black text-sm leading-none">{item.size}</span>
                          <span className="text-white/70 text-[10px]">kg</span>
                        </div>
                        <p className="flex-1 font-bold text-gray-900 text-sm">{item.size}kg × {item.quantity}</p>
                        <p className="font-black text-brand-600">{formatCurrency(item.subtotal)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Delivery address */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
                  <h2 className="text-sm font-bold text-gray-900">Delivery Address</h2>

                  {/* Saved addresses */}
                  {savedAddresses.length > 0 && (
                    <div className="space-y-2">
                      {savedAddresses.map((addr: any) => {
                        const selected = addr.street === street && addr.city === city;
                        return (
                          <button
                            key={addr._id}
                            type="button"
                            onClick={() => {
                              setStreet(addr.street);
                              setCity(addr.city);
                              setLat(addr.lat);
                              setLng(addr.lng);
                              setLocationLabel(addr.street + ', ' + addr.city);
                            }}
                            className={cn(
                              'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                              selected ? 'border-brand-500 bg-brand-50' : 'border-gray-100 hover:border-gray-200'
                            )}
                          >
                            <div className={cn(
                              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                              selected ? 'bg-brand-500' : 'bg-gray-100'
                            )}>
                              <MapPin className={cn('w-3.5 h-3.5', selected ? 'text-white' : 'text-gray-400')} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">{addr.label}</p>
                                {addr.isDefault && (
                                  <span className="text-[10px] font-bold text-brand-600 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded-full">Default</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 truncate">{addr.street}, {addr.city}</p>
                            </div>
                            {selected && (
                              <svg className="w-4 h-4 text-brand-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-xs text-gray-400">or use a different location</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                    </div>
                  )}

                  {/* Map picker */}
                  <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                      locationLabel && !savedAddresses.some((a: any) => a.street === street)
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-dashed border-gray-200 hover:border-brand-300'
                    )}
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                      locationLabel && !savedAddresses.some((a: any) => a.street === street) ? 'bg-brand-500' : 'bg-gray-100'
                    )}>
                      <MapPin className={cn('w-4 h-4', locationLabel && !savedAddresses.some((a: any) => a.street === street) ? 'text-white' : 'text-gray-400')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-500">Pick a different location</p>
                      <p className="text-xs text-gray-400">Open map to search or pin</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </button>
                </div>

                {/* Payment method */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <h2 className="text-sm font-bold text-gray-900 mb-3">Payment Method</h2>
                  <div className="space-y-2">
                    {PAYMENT_METHODS.map(({ method, icon: Icon, label, desc }) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                          paymentMethod === method ? 'border-brand-500 bg-brand-50' : 'border-gray-100 hover:border-gray-200'
                        )}
                      >
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', paymentMethod === method ? 'bg-brand-500' : 'bg-gray-100')}>
                          <Icon className={cn('w-4 h-4', paymentMethod === method ? 'text-white' : 'text-gray-500')} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{label}</p>
                          <p className="text-xs text-gray-400">{desc}</p>
                        </div>
                        {paymentMethod === method && <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />}
                      </button>
                    ))}
                  </div>
                  {paymentMethod === 'mobile_money' && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {MOBILE_PROVIDERS.map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => setMobileProvider(value)}
                          className={cn(
                            'py-2 px-3 rounded-xl text-xs font-semibold border-2 transition-all',
                            mobileProvider === value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-100 text-gray-600 hover:border-gray-200'
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Step 2: Review & confirm ── */}
            {step === 2 && totalQty > 0 && (
              <>
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                  <h2 className="text-sm font-bold text-gray-900">Order Review</h2>

                  {/* Cylinders */}
                  <div className="space-y-2">
                    {cartItems.map((item) => (
                      <div key={item.size} className="flex items-center gap-3 bg-brand-50 rounded-xl p-3">
                        <div className="w-10 h-10 bg-brand-500 rounded-xl flex flex-col items-center justify-center shrink-0">
                          <span className="text-white font-black text-sm leading-none">{item.size}</span>
                          <span className="text-white/70 text-[10px]">kg</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-sm">{item.size}kg × {item.quantity}</p>
                          <p className="text-xs text-brand-600 font-medium">{ORDER_TYPE_LABELS[orderType]}</p>
                        </div>
                        <p className="font-bold text-brand-600">{formatCurrency(item.subtotal)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-2.5 text-sm">
                    <MapPin className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">{street}</p>
                      <p className="text-gray-500">{city}</p>
                    </div>
                  </div>

                  {/* Payment */}
                  <div className="flex items-center gap-2.5 text-sm">
                    {(() => {
                      const pm = PAYMENT_METHODS.find((p) => p.method === paymentMethod)!;
                      const Icon = pm.icon;
                      return (
                        <>
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{pm.label}</p>
                            {paymentMethod === 'mobile_money' && (
                              <p className="text-xs text-gray-500">{MOBILE_PROVIDERS.find((p) => p.value === mobileProvider)?.label}</p>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Price breakdown */}
                  <div className="border-t border-gray-100 pt-4 space-y-2.5">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Cylinders ({totalQty})</span>
                      <span className="font-semibold text-gray-800">{formatCurrency(cylinderSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Delivery fee</span>
                      <span className="font-semibold text-gray-800">{formatCurrency(deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="font-black text-brand-600 text-xl">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>

                {/* Trust badges */}
                <div className="space-y-2">
                  {[
                    { icon: ShieldCheck, text: 'Payment held in escrow until delivery' },
                    { icon: Zap, text: 'Delivered within 30–60 minutes' },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-xs text-gray-500">
                      <Icon className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Desktop inline nav buttons ── */}
            <div className="hidden lg:flex gap-3 pt-2">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="h-12 px-5 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm flex items-center gap-1.5 hover:border-gray-300 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              )}
              {step < 2 ? (
                <button
                  onClick={goNext}
                  disabled={step === 0 && totalQty === 0}
                  className="flex-1 h-12 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 shadow-lg shadow-brand-500/25"
                >
                  {step === 0 ? `Continue · ${totalQty > 0 ? formatCurrency(total) : 'Add cylinders'}` : 'Review Order'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  className="flex-1 h-12 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-lg shadow-brand-500/25"
                >
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : `Place Order · ${formatCurrency(total)}`
                  }
                </button>
              )}
            </div>
          </div>

          {/* ── Desktop sticky order summary sidebar ── */}
          {totalQty > 0 && (
            <div className="hidden lg:block w-80 shrink-0">
              <div className="sticky top-24 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Order Summary</h3>

                <div className="space-y-2">
                  {cartItems.map((item) => (
                    <div key={item.size} className="flex items-center gap-3 bg-brand-50 rounded-xl p-3">
                      <div className="w-10 h-10 bg-brand-500 rounded-xl flex flex-col items-center justify-center shrink-0">
                        <span className="text-white font-black text-sm leading-none">{item.size}</span>
                        <span className="text-white/70 text-[10px]">kg</span>
                      </div>
                      <p className="flex-1 font-bold text-gray-900 text-sm">{item.size}kg × {item.quantity}</p>
                      <p className="font-bold text-brand-600 text-sm">{formatCurrency(item.subtotal)}</p>
                    </div>
                  ))}
                </div>

                {street && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">{street}</p>
                      <p className="text-gray-500">{city}</p>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-4 space-y-2.5">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Cylinders ({totalQty})</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(cylinderSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Delivery fee</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-black text-brand-600 text-xl">{formatCurrency(total)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  {[
                    { icon: ShieldCheck, text: 'Payment held in escrow' },
                    { icon: Zap, text: 'Delivered in 30–60 minutes' },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-xs text-gray-500">
                      <Icon className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky bottom nav (mobile only) ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 px-4 py-3 z-40">
        <div className="flex gap-3 max-w-lg mx-auto">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="h-12 px-5 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm flex items-center gap-1.5 hover:border-gray-300 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}

          {step < 2 ? (
            <button
              onClick={goNext}
              disabled={step === 0 && totalQty === 0}
              className="flex-1 h-12 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 shadow-lg shadow-brand-500/25"
            >
              {step === 0 ? `Continue · ${totalQty > 0 ? formatCurrency(total) : 'Add cylinders'}` : 'Review Order'}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="flex-1 h-12 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-lg shadow-brand-500/25"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : `Place Order · ${formatCurrency(total)}`
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
