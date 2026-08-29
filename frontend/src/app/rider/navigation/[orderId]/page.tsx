'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Navigation, Phone, MapPin,
  CheckCircle, Package, AlertCircle, Wifi, WifiOff,
} from 'lucide-react';
import { ordersApi, ridersApi } from '@/lib/api';
import { Card, Button, Input } from '@/components/ui';
import { formatCylinders, formatCurrency } from '@/lib/utils';
import { getSocket } from '@/hooks/useSocket';
import toast from 'react-hot-toast';

export default function RiderNavigationPage() {
  const params  = useParams();
  const orderId = params.orderId as string;
  const queryClient = useQueryClient();
  const [otpInput, setOtpInput]           = useState('');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [streaming, setStreaming]         = useState(false);
  const [streamError, setStreamError]     = useState<string | null>(null);

  // Refs so callbacks always see latest values without re-subscribing
  const watchIdRef   = useRef<number | null>(null);
  const wakeLockRef  = useRef<WakeLockSentinel | null>(null);
  const orderIdRef   = useRef(orderId);
  orderIdRef.current = orderId;

  const { data: orderData, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(orderId).then((r) => r.data.order),
    refetchInterval: 10000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) =>
      ordersApi.updateStatus(orderId, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success('Status updated');
    },
  });

  const confirmDeliveryMutation = useMutation({
    mutationFn: (otp: string) => ordersApi.confirmDelivery(orderId, otp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success('Delivery confirmed!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Invalid OTP');
    },
  });

  const orderStatus = orderData?.status;
  const isActive    = ['accepted', 'at_station', 'en_route'].includes(orderStatus ?? '');

  // ── Broadcast a single position ───────────────────────────────────────────
  const broadcast = useCallback((coords: GeolocationCoordinates) => {
    const loc = { lat: coords.latitude, lng: coords.longitude };
    setCurrentLocation(loc);
    setStreamError(null);

    const socket = getSocket();
    socket.emit('rider:location', { orderId: orderIdRef.current, ...loc });
    ridersApi.updateLocation(loc.lat, loc.lng).catch(() => {});

    console.log(`[Rider:GPS] lat=${loc.lat.toFixed(6)}, lng=${loc.lng.toFixed(6)} → emitted`);
  }, []);

  // ── Acquire Wake Lock so screen/tab stays active ──────────────────────────
  const acquireWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      console.log('[Rider:GPS] Wake lock acquired');
      if (wakeLockRef.current) {
        wakeLockRef.current.addEventListener('release', () => {
          console.log('[Rider:GPS] Wake lock released');
        });
      }
    } catch (err) {
      console.warn('[Rider:GPS] Wake lock failed:', err);
    }
  }, []);

  // ── Start watchPosition ───────────────────────────────────────────────────
  const startStreaming = useCallback(() => {
    if (!navigator.geolocation) {
      setStreamError('Geolocation not supported on this device');
      return;
    }
    if (watchIdRef.current !== null) return; // already watching

    console.log('[Rider:GPS] Starting watchPosition...');
    setStreaming(true);

    // Get one immediate fix first
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => broadcast(coords),
      (err) => console.warn('[Rider:GPS] Initial fix failed:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    // Then watch continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => broadcast(coords),
      (err) => {
        console.error('[Rider:GPS] watchPosition error:', err.code, err.message);
        setStreamError(`GPS error: ${err.message}`);
        // On permission denied, stop trying
        if (err.code === 1) stopStreaming();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    acquireWakeLock();
  }, [broadcast, acquireWakeLock]);

  const stopStreaming = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
    setStreaming(false);
    console.log('[Rider:GPS] Stopped watchPosition');
  }, []);

  // ── Start/stop based on order status ─────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    socket.emit('join:order', orderId);

    if (isActive) {
      startStreaming();
    } else {
      stopStreaming();
    }

    return () => {
      stopStreaming();
    };
  }, [orderId, isActive, startStreaming, stopStreaming]);

  // ── Re-acquire wake lock + resume on tab visibility change ────────────────
  useEffect(() => {
    const onVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isActive) {
        console.log('[Rider:GPS] Tab visible — checking stream...');
        // Re-acquire wake lock if it was released while hidden
        if (!wakeLockRef.current) await acquireWakeLock();
        // Restart watchPosition if it was killed by the browser
        if (watchIdRef.current === null) {
          console.log('[Rider:GPS] watchPosition was stopped — restarting');
          startStreaming();
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [isActive, acquireWakeLock, startStreaming]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-2" />
          <p className="text-gray-500">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="text-center py-8">
          <p className="text-gray-500">Order not found</p>
        </Card>
      </div>
    );
  }

  const order    = orderData;
  const station  = typeof order.stationId === 'object' ? order.stationId : null;
  const customer = typeof order.userId === 'object' ? order.userId : null;

  const openMaps = (lat: number, lng: number, label: string) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${label}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand-500 text-white px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold">Navigation</h1>
          {/* Live GPS indicator */}
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
            streaming ? 'bg-white/20' : 'bg-white/10 opacity-60'
          }`}>
            {streaming
              ? <><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />GPS Live</>
              : <><WifiOff className="w-3 h-3" />GPS Off</>
            }
          </div>
        </div>
        <p className="text-brand-100 text-sm">Order #{order._id.slice(-8).toUpperCase()}</p>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* GPS error banner */}
        {streamError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">Location error</p>
              <p className="text-xs text-red-600">{streamError}</p>
            </div>
            <button
              onClick={startStreaming}
              className="text-xs font-bold text-red-600 underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Order Summary */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-2">Order Details</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-600">Items:</span> {formatCylinders(order.cylinders)} · {order.orderType}</p>
            <p><span className="text-gray-600">Total:</span> {formatCurrency(order.totalAmount)}</p>
            <p><span className="text-gray-600">Payment:</span> {order.paymentMethod}</p>
          </div>
        </Card>

        {/* Step: Go to station */}
        {order.status === 'accepted' && station && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900">Go to Station</h3>
            </div>
            <div className="flex items-start gap-3 mb-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">{station.name}</p>
                <p className="text-sm text-gray-600">{station.address}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => openMaps(station.lat, station.lng, station.name)} className="flex-1">
                <Navigation className="w-4 h-4 mr-1" /> Navigate
              </Button>
              <Button
                variant="secondary"
                onClick={() => updateStatusMutation.mutate({ status: 'at_station', note: 'Arrived at station' })}
                loading={updateStatusMutation.isPending}
              >
                I'm Here
              </Button>
            </div>
          </Card>
        )}

        {/* Step: Collect cylinders */}
        {order.status === 'at_station' && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold text-gray-900">Collect Cylinders</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">Collect the cylinders and confirm when ready to deliver.</p>
            <Button
              onClick={() => updateStatusMutation.mutate({ status: 'en_route', note: 'Cylinders collected, heading to customer' })}
              loading={updateStatusMutation.isPending}
              className="w-full"
            >
              <CheckCircle className="w-4 h-4 mr-1" /> Cylinders Collected — Start Delivery
            </Button>
          </Card>
        )}

        {/* Step: Deliver to customer */}
        {order.status === 'en_route' && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Navigation className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-gray-900">Deliver to Customer</h3>
            </div>
            <div className="flex items-start gap-3 mb-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">{order.deliveryAddress.street}</p>
                <p className="text-sm text-gray-600">{order.deliveryAddress.city}</p>
              </div>
            </div>
            <Button
              onClick={() => openMaps(order.deliveryAddress.lat, order.deliveryAddress.lng, 'Delivery Address')}
              className="w-full"
            >
              <Navigation className="w-4 h-4 mr-1" /> Navigate to Customer
            </Button>
          </Card>
        )}

        {/* Customer */}
        {customer && (
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Customer</h3>
              {customer.phone && (
                <a href={`tel:${customer.phone}`}>
                  <Button size="sm" variant="secondary">
                    <Phone className="w-4 h-4 mr-1" /> Call
                  </Button>
                </a>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="font-bold text-blue-600">{customer.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{customer.name}</p>
                <p className="text-sm text-gray-500">{customer.phone}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Delivery confirmation OTP */}
        {order.status === 'en_route' && (
          <Card className="bg-green-50 border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold text-green-900">Confirm Delivery</h3>
            </div>
            <p className="text-sm text-green-700 mb-4">Ask the customer for their 4-digit delivery code.</p>
            <div className="space-y-3">
              <Input
                type="text"
                placeholder="Enter 4-digit OTP"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                className="text-center text-lg tracking-widest"
              />
              <Button
                onClick={() => {
                  if (otpInput.length !== 4) return toast.error('Please enter the 4-digit OTP');
                  confirmDeliveryMutation.mutate(otpInput);
                }}
                loading={confirmDeliveryMutation.isPending}
                className="w-full"
                disabled={otpInput.length !== 4}
              >
                Confirm Delivery
              </Button>
            </div>
          </Card>
        )}

        {/* Live location status */}
        <Card className={streaming ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}>
          <div className="flex items-center gap-2">
            {streaming
              ? <Wifi className="w-4 h-4 text-blue-600" />
              : <WifiOff className="w-4 h-4 text-gray-400" />
            }
            <div className="flex-1">
              <p className={`text-sm font-semibold ${streaming ? 'text-blue-700' : 'text-gray-500'}`}>
                {streaming ? 'Location sharing active' : 'Location sharing inactive'}
              </p>
              {currentLocation && (
                <p className="text-xs text-blue-500 font-mono mt-0.5">
                  {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
                </p>
              )}
            </div>
            {!streaming && isActive && (
              <button onClick={startStreaming} className="text-xs font-bold text-brand-500">
                Start
              </button>
            )}
          </div>
        </Card>

        {/* Support */}
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-red-900">Need Help?</h3>
          </div>
          <div className="space-y-2">
            <Button variant="danger" size="sm" className="w-full">Report Issue</Button>
            <Button variant="secondary" size="sm" className="w-full">Contact Support</Button>
          </div>
        </Card>

      </div>
    </div>
  );
}
