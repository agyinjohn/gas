'use client';
import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  MapPin, CreditCard, Phone, Banknote, ArrowLeft,
  Camera, X, ImagePlus, CheckCircle2, ChevronRight,
  Flame, Star, Loader2, Plus, Minus, ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ordersApi, stationsApi } from '@/lib/api';
import { formatCurrency, ORDER_TYPE_LABELS } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { PaymentMethod } from '@/types';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import type { PickedLocation } from '@/components/LocationPicker';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

const DELIVERY_FEE = 5;
const CYLINDER_SIZES = [6, 7, 10, 12, 15, 19];

const PAYMENT_METHODS = [
  { method: 'mobile_money' as PaymentMethod, icon: Phone,      label: 'Mobile Money',       desc: 'MTN, Vodafone, AirtelTigo' },
  { method: 'card'         as PaymentMethod, icon: CreditCard, label: 'Debit / Credit Card', desc: 'Visa, Mastercard'          },
  { method: 'cash'         as PaymentMethod, icon: Banknote,   label: 'Cash on Delivery',    desc: 'Pay when received'         },
];

const MOBILE_PROVIDERS = [
  { value: 'mtn', label: 'MTN Mobile Money' },
  { value: 'vod', label: 'Vodafone Cash'    },
  { value: 'tgo', label: 'AirtelTigo Money' },
];

interface Listing { size: number; fillPrice: number; isAvailable: boolean; }
interface Station  { id: string; name: string; address: string; distanceKm: number; ratingAvg: number; cylinderListings: Listing[]; lat: number; lng: number; }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4">
      <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3">{title}</h2>
      {children}
    </div>
  );
}

function CylinderPhotoUpload({ photo, onChange }: { photo: string | null; onChange: (v: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Cylinder Photo</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Optional — helps identify your cylinder</p>
        </div>
        <span className="text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--bg-card2)] px-2 py-1 rounded-full">Optional</span>
      </div>
      {photo ? (
        <div className="relative">
          <img src={photo} alt="Cylinder" className="w-full h-44 object-cover rounded-xl border border-[var(--border)]" />
          <button
            type="button"
            onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ''; }}
            className="absolute top-2 right-2 w-7 h-7 bg-[var(--bg-card)] rounded-full shadow-md flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5 text-[var(--text-primary)]" />
          </button>
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-[var(--bg-card)]/90 rounded-full px-2.5 py-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs font-medium text-[var(--text-primary)]">Photo added</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-36 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-brand-500 flex flex-col items-center justify-center gap-2 transition-all group"
        >
          <div className="w-10 h-10 bg-[var(--bg-card2)] group-hover:bg-brand-500/10 rounded-xl flex items-center justify-center transition-colors">
            <ImagePlus className="w-5 h-5 text-[var(--text-muted)] group-hover:text-brand-500 transition-colors" />
          </div>
          <p className="text-sm font-medium text-[var(--text-muted)] group-hover:text-brand-500 transition-colors">Tap to add a photo</p>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Camera className="w-3.5 h-3.5" /><span>Camera or gallery</span>
          </div>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ─── Station Selector ─────────────────────────────────────────────────────────

function StationSelector({ selected, onSelect }: { selected: Station | null; onSelect: (s: Station) => void }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [detecting, setDetecting] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) { setDetecting(false); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => { setCoords({ lat: c.latitude, lng: c.longitude }); setDetecting(false); },
      () => setDetecting(false),
      { timeout: 10000 }
    );
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['stations', 'nearby', coords],
    queryFn:  () => stationsApi.getNearby(coords!.lat, coords!.lng, 25).then((r) => r.data),
    enabled:  !!coords,
  });

  const stations: Station[] = data?.stations ?? [];

  return (
    <Section title="Select Station">
      {(detecting || isLoading) && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Finding nearby stations…
        </div>
      )}
      {!detecting && !isLoading && stations.length === 0 && (
        <p className="text-sm text-[var(--text-muted)] py-2">No stations found nearby.</p>
      )}
      <div className="space-y-2">
        {stations.map((s) => {
          const isSelected = selected?.id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                isSelected ? 'border-brand-500 bg-brand-500/10' : 'border-[var(--border)] hover:border-brand-500/50'
              )}
            >
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', isSelected ? 'bg-brand-500' : 'bg-[var(--bg-card2)]')}>
                <Flame className={cn('w-4 h-4', isSelected ? 'text-white' : 'text-[var(--text-muted)]')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{s.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <MapPin className="w-3 h-3" />{s.distanceKm} km
                  </span>
                  <span className="flex items-center gap-1 text-xs text-amber-500">
                    <Star className="w-3 h-3 fill-current" />{s.ratingAvg?.toFixed(1)}
                  </span>
                </div>
              </div>
              {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

// ─── Order Summary with size + quantity controls ──────────────────────────────

function OrderSummary({
  size, quantity, price, orderType, onSizeChange, onQuantityChange,
}: {
  size: number;
  quantity: number;
  price: number;
  orderType: string;
  onSizeChange: (s: number) => void;
  onQuantityChange: (q: number) => void;
}) {
  const [showSizes, setShowSizes] = useState(false);
  const unitPrice  = price;
  const subtotal   = unitPrice * quantity;
  const total      = subtotal + DELIVERY_FEE;

  return (
    <Section title="Order Summary">
      {/* Size selector */}
      <div className="mb-3">
        <p className="text-xs text-[var(--text-muted)] mb-1.5">Cylinder size</p>
        <button
          onClick={() => setShowSizes((v) => !v)}
          className="w-full flex items-center justify-between p-3 bg-[var(--bg-card2)] rounded-xl border border-[var(--border)]"
        >
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex flex-col items-center justify-center shrink-0">
              <span className="text-white font-black text-sm leading-none">{size}</span>
              <span className="text-white/70 text-[9px]">kg</span>
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">{size}kg Cylinder</span>
          </div>
          <div className="flex items-center gap-2">
            {unitPrice > 0 && (
              <span className="text-sm font-bold text-brand-500">{formatCurrency(unitPrice)}</span>
            )}
            <ChevronDown className={cn('w-4 h-4 text-[var(--text-muted)] transition-transform', showSizes && 'rotate-180')} />
          </div>
        </button>

        {showSizes && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {CYLINDER_SIZES.map((s) => (
              <button
                key={s}
                onClick={() => { onSizeChange(s); setShowSizes(false); }}
                className={cn(
                  'py-2.5 rounded-xl text-sm font-bold border-2 transition-all',
                  size === s
                    ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-brand-500/50'
                )}
              >
                {s}kg
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quantity stepper */}
      <div className="flex items-center justify-between p-3 bg-[var(--bg-card2)] rounded-xl border border-[var(--border)] mb-3">
        <div>
          <p className="text-xs text-[var(--text-muted)]">Quantity</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{quantity} cylinder{quantity > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center disabled:opacity-40 transition-colors hover:border-brand-500"
          >
            <Minus className="w-3.5 h-3.5 text-[var(--text-primary)]" />
          </button>
          <span className="text-base font-black text-[var(--text-primary)] w-6 text-center">{quantity}</span>
          <button
            onClick={() => onQuantityChange(Math.min(10, quantity + 1))}
            disabled={quantity >= 10}
            className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center disabled:opacity-40 transition-colors hover:bg-brand-600"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="space-y-2 text-sm">
        {quantity > 1 && (
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>{formatCurrency(unitPrice)} × {quantity}</span>
            <span className="font-medium text-[var(--text-primary)]">{formatCurrency(subtotal)}</span>
          </div>
        )}
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>Delivery fee</span>
          <span className="font-medium text-[var(--text-primary)]">{formatCurrency(DELIVERY_FEE)}</span>
        </div>
        <div className="border-t border-[var(--border)] pt-2 flex justify-between">
          <span className="font-bold text-[var(--text-primary)]">Total</span>
          <span className="font-black text-brand-500 text-base">{formatCurrency(total)}</span>
        </div>
      </div>
    </Section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const params   = useSearchParams();
  const router   = useRouter();
  const { user } = useAuth();

  const isQuickOrder   = params.get('source') === 'quick';
  const stationIdParam = params.get('stationId');
  const orderType      = params.get('type') || 'delivery';
  const initPrice      = parseFloat(params.get('price') || '0');

  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [cylinderSize,    setCylinderSize]    = useState(parseInt(params.get('size') || '6'));
  const [quantity,        setQuantity]        = useState(1);
  const [cylinderPrice,   setCylinderPrice]   = useState(initPrice);
  const [street,          setStreet]          = useState('');
  const [city,            setCity]            = useState('');
  const [lat,             setLat]             = useState<number | null>(null);
  const [lng,             setLng]             = useState<number | null>(null);
  const [locationLabel,   setLocationLabel]   = useState('');
  const [showPicker,      setShowPicker]      = useState(false);
  const [paymentMethod,   setPaymentMethod]   = useState<PaymentMethod>('mobile_money');
  const [mobileProvider,  setMobileProvider]  = useState('mtn');
  const [cylinderPhoto,   setCylinderPhoto]   = useState<string | null>(null);
  const [loading,         setLoading]         = useState(false);

  const effectiveStationId = stationIdParam ?? selectedStation?.id ?? null;
  const subtotal   = cylinderPrice * quantity;
  const totalAmount = subtotal + DELIVERY_FEE;

  function handleLocationConfirm(loc: PickedLocation) {
    setStreet(loc.street);
    setCity(loc.city);
    setLat(loc.lat);
    setLng(loc.lng);
    setLocationLabel(loc.formatted);
    setShowPicker(false);
  }

  async function handlePlaceOrder() {
    if (isQuickOrder && !selectedStation) { toast.error('Please select a station'); return; }
    if (!effectiveStationId)              { toast.error('No station selected'); return; }
    if (!street.trim() || !city.trim())   { toast.error('Please set your delivery address'); return; }
    if (lat === null || lng === null)      { toast.error('Please pin your location on the map'); return; }

    setLoading(true);
    try {
      const { data } = await ordersApi.create({
        stationId: effectiveStationId,
        cylinderSize,
        quantity,
        orderType,
        deliveryAddress: { street, city, lat: lat!, lng: lng! },
        paymentMethod,
        paymentProvider: paymentMethod === 'mobile_money' ? mobileProvider : undefined,
        ...(cylinderPhoto ? { cylinderPhoto } : {}),
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

  const ctaLabel = loading
    ? null
    : `Place Order · ${formatCurrency(totalAmount)}`;

  return (
    <div className="min-h-full bg-[var(--bg)] pb-28 lg:pb-8">

      {showPicker && (
        <LocationPicker onConfirm={handleLocationConfirm} onClose={() => setShowPicker(false)} />
      )}

      {/* Mobile header */}
      <div className="lg:hidden bg-[var(--bg-card)] border-b border-[var(--border)] px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl hover:bg-[var(--bg-card2)]">
          <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
        <h1 className="text-base font-bold text-[var(--text-primary)]">Checkout</h1>
      </div>

      <div className="px-4 lg:px-8 py-4 lg:py-6 max-w-4xl mx-auto">

        <button
          onClick={() => router.back()}
          className="hidden lg:flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6">

          {/* Left column */}
          <div className="space-y-4">

            {isQuickOrder && (
              <StationSelector selected={selectedStation} onSelect={setSelectedStation} />
            )}

            <OrderSummary
              size={cylinderSize}
              quantity={quantity}
              price={cylinderPrice}
              orderType={orderType}
              onSizeChange={setCylinderSize}
              onQuantityChange={setQuantity}
            />

            <CylinderPhotoUpload photo={cylinderPhoto} onChange={setCylinderPhoto} />

            {/* Delivery address */}
            <Section title="Delivery Address">
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                  locationLabel ? 'border-brand-500 bg-brand-500/10' : 'border-dashed border-[var(--border)] hover:border-brand-500/50'
                )}
              >
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', locationLabel ? 'bg-brand-500' : 'bg-[var(--bg-card2)]')}>
                  <MapPin className={cn('w-4 h-4', locationLabel ? 'text-white' : 'text-[var(--text-muted)]')} />
                </div>
                <div className="flex-1 min-w-0">
                  {locationLabel ? (
                    <>
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{street}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{city}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-[var(--text-muted)]">Set delivery location</p>
                      <p className="text-xs text-[var(--text-muted)]">Tap to pick on map or search</p>
                    </>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              </button>
            </Section>

            {/* Payment method */}
            <Section title="Payment Method">
              <div className="space-y-2">
                {PAYMENT_METHODS.map(({ method, icon: Icon, label, desc }) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                      paymentMethod === method
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-[var(--border)] hover:border-brand-500/50'
                    )}
                  >
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', paymentMethod === method ? 'bg-brand-500' : 'bg-[var(--bg-card2)]')}>
                      <Icon className={cn('w-4 h-4', paymentMethod === method ? 'text-white' : 'text-[var(--text-muted)]')} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                      <p className="text-xs text-[var(--text-muted)]">{desc}</p>
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
                        mobileProvider === value
                          ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                          : 'border-[var(--border)] text-[var(--text-muted)]'
                      )}
                    >
                      {label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}
            </Section>

            <div className="flex items-start gap-2.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl px-4 py-3 text-xs text-blue-400">
              <span className="text-base leading-none">🔒</span>
              <p>Payment held securely in escrow — released to the station only after confirmed delivery.</p>
            </div>
          </div>

          {/* Desktop sticky CTA */}
          <div className="hidden lg:block">
            <div className="sticky top-24 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 space-y-4">
              <h3 className="font-bold text-[var(--text-primary)]">Ready to order?</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>{cylinderSize}kg × {quantity}</span>
                  <span className="font-medium text-[var(--text-primary)]">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Delivery fee</span>
                  <span className="font-medium text-[var(--text-primary)]">{formatCurrency(DELIVERY_FEE)}</span>
                </div>
                <div className="border-t border-[var(--border)] pt-2 flex justify-between">
                  <span className="font-bold text-[var(--text-primary)]">Total</span>
                  <span className="font-black text-brand-500 text-lg">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
              {cylinderPhoto && (
                <div className="flex items-center gap-2 text-xs text-green-500 bg-green-500/10 rounded-xl px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Cylinder photo attached
                </div>
              )}
              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60 shadow-lg shadow-brand-500/25"
              >
                {loading
                  ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : ctaLabel
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-[var(--bg-card)] border-t border-[var(--border)] px-4 py-3 z-20">
        {cylinderPhoto && (
          <div className="flex items-center gap-1.5 text-xs text-green-500 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" /> Cylinder photo attached
          </div>
        )}
        <button
          onClick={handlePlaceOrder}
          disabled={loading}
          className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25"
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : ctaLabel
          }
        </button>
      </div>
    </div>
  );
}
