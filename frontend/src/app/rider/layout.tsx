'use client';
import { useEffect, useRef, useState } from 'react';
import { ridersApi } from '@/lib/api';
import { getSocket } from '@/hooks/useSocket';
import { useAuth } from '@/lib/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCylinders } from '@/lib/utils';

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const watchIdRef = useRef<number | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  const { data: riderData } = useQuery({
    queryKey: ['rider', 'me'],
    queryFn: () => ridersApi.getMe().then((r) => r.data.rider),
    enabled: !!user && typeof window !== 'undefined',
    staleTime: 30000,
  });

  const isOnline = riderData?.status === 'available' || riderData?.status === 'busy';

  // Always track location whenever online — regardless of which page the rider is on
  useEffect(() => {
    console.log(`[Rider:Layout] isOnline=${isOnline}, riderStatus=${riderData?.status ?? 'loading'}`);
  }, [isOnline, riderData?.status]);

  // Join personal socket room + listen for new orders from anywhere in the rider app
  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket();
    socket.emit('join:rider', user.id);
    console.log(`[Rider:Socket] Joined rider room: rider:${user.id}`);

    function onNewOrder(order: any) {
      console.log('[Rider:Socket] order:new received:', order);
      toast(`New order: ${formatCylinders(order.cylinders)} — GH₵${order.earning}`, {
        id: 'new-order',
        icon: '🔔',
        duration: 8000,
      });
      queryClient.invalidateQueries({ queryKey: ['rider', 'dashboard'] });
    }

    socket.off('order:new', onNewOrder);
    socket.on('order:new', onNewOrder);
    return () => { socket.off('order:new', onNewOrder); };
  }, [user?.id]);

  // Check and watch permission state
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.permissions) return;
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      setLocationPermission(result.state as any);
      result.onchange = () => {
        console.log(`[Rider:Location] Permission changed to: ${result.state}`);
        setLocationPermission(result.state as any);
      };
    }).catch(() => setLocationPermission('unknown'));
  }, []);

  // Always track location whenever online — regardless of which page the rider is on
  useEffect(() => {
    if (!isOnline) {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        console.log('[Rider:Location] Stopped tracking — rider is offline');
      }
      return;
    }

    if (!navigator.geolocation) {
      console.warn('[Rider:Location] Geolocation not supported on this device');
      return;
    }

    console.log('[Rider:Location] Starting location tracking...');

    // Trigger permission prompt + get first fix immediately
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocationPermission('granted');
        console.log(`[Rider:Location] Initial fix — lat=${coords.latitude}, lng=${coords.longitude}, accuracy=${coords.accuracy}m`);
        ridersApi.updateLocation(coords.latitude, coords.longitude).catch((err) =>
          console.error('[Rider:Location] Initial DB update failed:', err)
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setLocationPermission('denied');
        console.warn(`[Rider:Location] Initial fix failed — code=${err.code} (1=denied, 2=unavailable, 3=timeout), message=${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Continuous watch — fires on every position change
    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng, accuracy } = coords;
        setLocationPermission('granted');
        console.log(`[Rider:Location] Update — lat=${lat}, lng=${lng}, accuracy=${accuracy}m, time=${new Date().toISOString()}`);
        ridersApi.updateLocation(lat, lng).catch((err) =>
          console.error('[Rider:Location] DB update failed:', err)
        );
        // Emit for any socket listeners (station dashboard, admin map)
        getSocket().emit('rider:location:idle', { lat, lng });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setLocationPermission('denied');
        console.error(`[Rider:Location] watchPosition error — code=${err.code} (1=denied, 2=unavailable, 3=timeout), message=${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        console.log('[Rider:Location] Watch cleared on effect cleanup');
      }
    };
  }, [isOnline]);

  return (
    <>
      {/* Permission denied banner */}
      {isOnline && locationPermission === 'denied' && (
        <div className="fixed top-0 inset-x-0 z-50 bg-red-500 text-white px-4 py-3 flex items-center gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">Location access is blocked</p>
            <p className="text-xs text-red-100 leading-tight mt-0.5">
              You won't receive orders. Enable location in your browser/app settings.
            </p>
          </div>
        </div>
      )}

      {/* Live tracking indicator */}
      {isOnline && locationPermission === 'granted' && (
        <div className="fixed bottom-20 right-4 z-40 flex items-center gap-1.5 bg-green-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full shadow-lg">
          <MapPin className="w-3 h-3" />
          Live
        </div>
      )}

      {children}
    </>
  );
}
