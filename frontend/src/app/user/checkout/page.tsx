'use client';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  MapPin, CreditCard, Phone, Banknote, ArrowLeft,
  Camera, X, ImagePlus, CheckCircle2, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ordersApi } from '@/lib/api';
import { formatCurrency, ORDER_TYPE_LABELS } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { PaymentMethod } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { PickedLocation } from '@/components/LocationPicker';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

const DELIVERY_FEE = 5;

const PAYMENT_METHODS = [
  { method: 'mobile_money' as PaymentMethod, icon: Phone,       label: 'Mobile Money',       desc: 'MTN, Vodafone, AirtelTigo' },
  { method: 'card'         as PaymentMethod, icon: CreditCard,  label: 'Debit / Credit Card', desc: 'Visa, Mastercard'          },
  { method: 'cash'         as PaymentMethod, icon: Banknote,    label: 'Cash on Delivery',    desc: 'Pay when received'         },
];

const MOBILE_PROVIDERS = [
  { value: 'mtn', label: 'MTN Mobile Money'  },
  { value: 'vod', label: 'Vodafone Cash'     },
  { value: 'tgo', label: 'AirtelTigo Money'  },
];

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <h2 className="text-sm font-bold text-gray-900 mb-3">{title}</h2>
      {children}
    </div>
  );
}

// ─── Cylinder photo upload ────────────────────────────────────────────────────

function CylinderPhotoUpload({
  photo,
  onChange,
}: {
  photo: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Cylinder Photo</h2>
          <p className="text-xs text-gray-400 mt-0.5">Optional — helps identify your cylinder</p>
        </div>
        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
          Optional
        </span>
      </div>

      {photo ? (
        /* Preview */
        <div className="relative">
          <img
            src={photo}
            alt="Cylinder"
            className="w-full h-44 object-cover rounded-xl border border-gray-100"
          />
          <button
            type="button"
            onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ''; }}
            className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs font-medium text-gray-700">Photo added</span>
          </div>
        </div>
      ) : (
        /* Upload area */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-36 rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-300 hover:bg-brand-50/30 flex flex-col items-center justify-center gap-2 transition-all group"
        >
          <div className="w-10 h-10 bg-gray-100 group-hover:bg-brand-100 rounded-xl flex items-center justify-center transition-colors">
            <ImagePlus className="w-5 h-5 text-gray-400 group-hover:text-brand-500 transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 group-hover:text-brand-600 transition-colors">
              Tap to add a photo
            </p>
            <p className="text-xs text-gray-400 mt-0.5">JPG, PNG · Max 5MB</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Camera className="w-3.5 h-3.5" />
            <span>Camera or gallery</span>
          </div>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const stationId     = params.get('stationId')!;
  const cylinderSize  = parseInt(params.get('size') || '6');
  const orderType     = params.get('type') || 'delivery';
  const cylinderPrice = parseFloat(params.get('price') || '0');
  const totalAmount   = cylinderPrice + DELIVERY_FEE;

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

  function handleLocationConfirm(loc: PickedLocation) {
    setStreet(loc.street);
    setCity(loc.city);
    setLat(loc.lat);
    setLng(loc.lng);
    setLocationLabel(loc.formatted);
    setShowPicker(false);
  }

  async function handlePlaceOrder() {
    if (!street.trim() || !city.trim()) {
      toast.error('Please set your delivery address');
      return;
    }
    if (lat === null || lng === null) {
      toast.error('Please pin your location on the map');
      return;
    }
    setLoading(true);
    try {
      const { data } = await ordersApi.create({
        stationId,
        cylinderSize,
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

  return (
    <div className="min-h-full bg-gray-50 pb-28 lg:pb-8">

      {showPicker && (
        <LocationPicker
          onConfirm={handleLocationConfirm}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* ── Mobile header ── */}
      <div className="lg:hidden bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-base font-bold text-gray-900">Checkout</h1>
      </div>

      <div className="px-4 lg:px-8 py-4 lg:py-6 max-w-4xl mx-auto">

        {/* Desktop back */}
        <button
          onClick={() => router.back()}
          className="hidden lg:flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6">

          {/* ── Left column ── */}
          <div className="space-y-4">

            {/* Order summary */}
            <Section title="Order Summary">
              <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-xl mb-3">
                <div className="w-12 h-12 bg-brand-500 rounded-xl flex flex-col items-center justify-center shrink-0">
                  <span className="text-white font-black text-lg leading-none">{cylinderSize}</span>
                  <span className="text-white/70 text-[10px]">kg</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{cylinderSize}kg Cylinder</p>
                  <p className="text-xs text-gray-500">{ORDER_TYPE_LABELS[orderType]}</p>
                </div>
                <p className="ml-auto font-black text-brand-600">{formatCurrency(cylinderPrice)}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Delivery fee</span>
                  <span className="font-medium text-gray-700">{formatCurrency(DELIVERY_FEE)}</span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-black text-brand-600 text-base">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </Section>

            {/* Cylinder photo */}
            <CylinderPhotoUpload photo={cylinderPhoto} onChange={setCylinderPhoto} />

            {/* Delivery address */}
            <Section title="Delivery Address">
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                  locationLabel ? 'border-brand-500 bg-brand-50' : 'border-dashed border-gray-200 hover:border-brand-300'
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  locationLabel ? 'bg-brand-500' : 'bg-gray-100'
                )}>
                  <MapPin className={cn('w-4 h-4', locationLabel ? 'text-white' : 'text-gray-400')} />
                </div>
                <div className="flex-1 min-w-0">
                  {locationLabel ? (
                    <>
                      <p className="text-sm font-semibold text-gray-900 truncate">{street}</p>
                      <p className="text-xs text-gray-400 truncate">{city}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-gray-500">Set delivery location</p>
                      <p className="text-xs text-gray-400">Tap to pick on map or search</p>
                    </>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
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
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-100 hover:border-gray-200'
                    )}
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                      paymentMethod === method ? 'bg-brand-500' : 'bg-gray-100'
                    )}>
                      <Icon className={cn('w-4 h-4', paymentMethod === method ? 'text-white' : 'text-gray-500')} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                    {paymentMethod === method && (
                      <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                    )}
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
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-100 text-gray-600 hover:border-gray-200'
                      )}
                    >
                      {label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}
            </Section>

            {/* Escrow notice */}
            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-xs text-blue-700">
              <span className="text-base leading-none">🔒</span>
              <p>Payment held securely in escrow — released to the station only after confirmed delivery.</p>
            </div>
          </div>

          {/* ── Right column (desktop sticky CTA) ── */}
          <div className="hidden lg:block">
            <div className="sticky top-24 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h3 className="font-bold text-gray-900">Ready to order?</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>{cylinderSize}kg Cylinder</span>
                  <span className="font-medium text-gray-700">{formatCurrency(cylinderPrice)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Delivery fee</span>
                  <span className="font-medium text-gray-700">{formatCurrency(DELIVERY_FEE)}</span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-black text-brand-600 text-lg">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
              {cylinderPhoto && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  Cylinder photo attached
                </div>
              )}
              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60 shadow-lg shadow-brand-500/25"
              >
                {loading
                  ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : `Place Order · ${formatCurrency(totalAmount)}`
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky CTA ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 px-4 py-3 z-20">
        {cylinderPhoto && (
          <div className="flex items-center gap-1.5 text-xs text-green-700 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Cylinder photo attached
          </div>
        )}
        <button
          onClick={handlePlaceOrder}
          disabled={loading}
          className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25"
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : `Place Order · ${formatCurrency(totalAmount)}`
          }
        </button>
      </div>
    </div>
  );
}
