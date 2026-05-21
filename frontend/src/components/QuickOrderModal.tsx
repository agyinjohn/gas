'use client';
import { useState, useEffect } from 'react';
import { X, MapPin, Flame, Loader2, AlertCircle, Camera, CheckCircle2 } from 'lucide-react';
import { stationsApi, ordersApi, api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn, calcDeliveryFee } from '@/lib/utils';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import type { PickedLocation } from '@/components/LocationPicker';
import { checkoutPhoto } from '@/lib/checkoutPhoto';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

interface Station {
  id: string;
  _id?: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
  ratingAvg: number;
  outOfStock: boolean;
  cylinderListings: Array<{
    size: number;
    fillPrice: number;
    exchangePrice: number;
    stockCount: number;
    isAvailable: boolean;
  }>;
}

interface SelectedCylinder {
  size: number;
  price: number;
  quantity: number;
}

type Step = 'amount' | 'confirm' | 'loading';

export default function QuickOrderModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('amount');
  
  // Step 1: Amount entry
  const [amount, setAmount] = useState('');
  
  // Step 2: Confirmation
  const [station, setStation] = useState<Station | null>(null);
  const [selectedCylinder, setSelectedCylinder] = useState<SelectedCylinder | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [userLocation, setUserLocation] = useState<PickedLocation | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<PickedLocation | null>(null);
  const [sameAsPickup, setSameAsPickup] = useState(true);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Get user's current location on mount
  useEffect(() => {
    const lat = localStorage.getItem('gasgo_lat');
    const lng = localStorage.getItem('gasgo_lng');
    const label = localStorage.getItem('gasgo_location_label');
    if (lat && lng) {
      const location = {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        street: label || 'Current location',
        city: '',
        formatted: label || 'Current location',
      };
      setUserLocation(location);
      setDeliveryLocation(location);
    }
  }, []);

  // Step 1: Find station for amount
  async function handleFindStation() {
    const amountVal = parseFloat(amount);
    if (!amountVal || amountVal < 1) {
      toast.error('Enter a valid amount');
      return;
    }

    if (!userLocation) {
      toast.error('Could not get your location');
      return;
    }

    setStep('loading');
    try {
      // Get nearby stations
      const { data } = await stationsApi.getNearby(userLocation.lat, userLocation.lng, 25);
      const stations: Station[] = data.stations.map((s: any) => ({
        ...s,
        id: s._id?.toString() ?? s.id,
      }));

      if (stations.length === 0) {
        toast.error('No stations found nearby');
        setStep('amount');
        return;
      }

      // Find first station with a cylinder that fits the budget
      let foundStation: Station | null = null;
      let foundCylinder: SelectedCylinder | null = null;

      for (const s of stations) {
        if (s.outOfStock) continue;

        // Sort listings by price ascending
        const available = s.cylinderListings.filter((l) => l.isAvailable && l.fillPrice > 0);
        const sorted = available.sort((a, b) => a.fillPrice - b.fillPrice);

        // Find first cylinder with price >= amount
        for (const listing of sorted) {
          if (listing.fillPrice >= amountVal) {
            foundStation = s;
            foundCylinder = {
              size: listing.size,
              price: listing.fillPrice,
              quantity: 1,
            };
            break;
          }
        }

        if (foundStation) break;
      }

      if (!foundStation || !foundCylinder) {
        // No station with cylinder matching budget
        const cheapest = stations[0]?.cylinderListings.filter((l) => l.isAvailable && l.fillPrice > 0);
        const minPrice = cheapest ? Math.min(...cheapest.map((l) => l.fillPrice)) : null;
        const msg = minPrice
          ? `Nearest station's minimum amount is ₵${minPrice}`
          : 'No available options at nearby stations';
        toast.error(msg);
        setStep('amount');
        return;
      }

      setStation(foundStation);
      setSelectedCylinder(foundCylinder);
      const fee = calcDeliveryFee(foundStation.distanceKm);
      setDeliveryFee(fee);
      setStep('confirm');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error finding station');
      setStep('amount');
    }
  }

  // Handle photo upload
  async function handlePhotoCapture() {
    try {
      setUploadingPhoto(true);
      const data = await checkoutPhoto();
      if (data?.url) {
        setPhotoUrl(data.url);
        toast.success('Photo uploaded');
      }
    } catch (err: any) {
      toast.error(err.message || 'Photo upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  }

  // Place the order
  async function handlePlaceOrder() {
    if (!station || !selectedCylinder || !userLocation || !deliveryLocation) {
      toast.error('Missing required information');
      return;
    }

    setPlacingOrder(true);
    try {
      const response = await ordersApi.create({
        stationId: station.id,
        cylinders: [
          {
            size: selectedCylinder.size,
            quantity: selectedCylinder.quantity,
            customPrice: selectedCylinder.price,
          },
        ],
        orderType: 'delivery',
        pickupAddress: {
          street: userLocation.street,
          city: userLocation.city || 'Accra',
          lat: userLocation.lat,
          lng: userLocation.lng,
        },
        deliveryAddress: {
          street: deliveryLocation.street,
          city: deliveryLocation.city || 'Accra',
          lat: deliveryLocation.lat,
          lng: deliveryLocation.lng,
        },
        paymentMethod: 'mobile_money',
        deliveryPhotoUrl: photoUrl,
        isScheduled: false,
      });

      toast.success('Order placed! 🎉');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="w-full bg-[var(--bg-primary)] rounded-t-3xl p-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {step === 'amount' ? 'Quick Order' : 'Confirm Your Order'}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[var(--bg-card)] flex items-center justify-center"
          >
            <X className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
        </div>

        {/* Step 1: Amount Entry */}
        {step === 'amount' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                How much do you want to fill?
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-[var(--text-muted)]">
                  ₵
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="50"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={cn(
                    'w-full h-12 pl-8 pr-4 rounded-xl border bg-[var(--bg-card2)] text-[var(--text-primary)] text-lg font-bold',
                    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                    'border-[var(--border)]'
                  )}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                We'll find the nearest station and suggest the best option for you.
              </p>
            </div>

            <button
              onClick={handleFindStation}
              className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold transition-colors"
            >
              Find Station & Confirm
            </button>
          </div>
        )}

        {/* Step 2: Confirmation */}
        {step === 'confirm' && station && selectedCylinder && (
          <div className="space-y-4">
            {/* Station Info */}
            <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border)]">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-brand-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[var(--text-primary)]">{station.name}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{station.address}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-[var(--text-muted)]">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {station.distanceKm} km away
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border)]">
              <div className="space-y-2 mb-3 pb-3 border-b border-[var(--border)]">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">{selectedCylinder.size}kg Cylinder</span>
                  <span className="font-semibold text-[var(--text-primary)]">₵{selectedCylinder.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Delivery Fee</span>
                  <span className="font-semibold text-[var(--text-primary)]">₵{deliveryFee}</span>
                </div>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-brand-500">₵{selectedCylinder.price + deliveryFee}</span>
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Delivery Location</h4>
              {userLocation && (
                <div className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)]">From your current location</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                    {userLocation.formatted}
                  </p>
                  <button
                    onClick={() => setShowLocationPicker(true)}
                    className="text-xs text-brand-500 font-semibold mt-2"
                  >
                    Change location
                  </button>
                </div>
              )}
            </div>

            {/* Photo Upload */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Photo (Optional)</h4>
              {photoUrl ? (
                <div className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border)] flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Photo uploaded</p>
                    <p className="text-xs text-[var(--text-muted)]">Will be shared with the rider</p>
                  </div>
                  <button
                    onClick={() => setPhotoUrl(null)}
                    className="text-xs text-red-500 font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  onClick={handlePhotoCapture}
                  disabled={uploadingPhoto}
                  className="w-full h-12 rounded-xl border-2 border-dashed border-[var(--border)] flex items-center justify-center gap-2 text-[var(--text-muted)] hover:text-brand-500 transition-colors disabled:opacity-50"
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      Add photo
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep('amount')}
                className="flex-1 h-12 rounded-xl border border-[var(--border)] text-[var(--text-primary)] font-bold transition-colors hover:bg-[var(--bg-card)]"
              >
                Back
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                className="flex-1 h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {placingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Placing...
                  </>
                ) : (
                  'Place Order'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-3" />
            <p className="text-[var(--text-muted)] font-medium">Finding nearest station...</p>
          </div>
        )}

        {/* Location Picker Modal */}
        {showLocationPicker && (
          <div className="fixed inset-0 bg-black/50 flex items-end z-[100]">
            <div className="w-full bg-[var(--bg-primary)] rounded-t-3xl p-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Change Delivery Location</h3>
                <button
                  onClick={() => setShowLocationPicker(false)}
                  className="w-9 h-9 rounded-full bg-[var(--bg-card)] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <LocationPicker
                onPick={(loc) => {
                  setDeliveryLocation(loc);
                  setShowLocationPicker(false);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
