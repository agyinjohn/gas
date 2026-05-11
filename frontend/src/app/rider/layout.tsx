'use client';
import { useEffect } from 'react';
import { ridersApi } from '@/lib/api';
import { getSocket } from '@/hooks/useSocket';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const { data: riderData } = useQuery({
    queryKey: ['rider', 'me'],
    queryFn: () => ridersApi.getMe().then((r) => r.data.rider),
    enabled: !!user && typeof window !== 'undefined',
    staleTime: 30000,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['rider', 'dashboard'],
    queryFn: () => ridersApi.getDashboard().then((r) => r.data.dashboard),
    enabled: !!user && typeof window !== 'undefined',
    refetchInterval: 15000,
  });

  const isOnline = riderData?.status === 'available' || riderData?.status === 'busy';
  const activeOrderId = dashboardData?.activeOrder?._id ?? null;

  // Join personal socket room once
  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket();
    socket.emit('join:rider', user.id);
  }, [user?.id]);

  // Location tracking — broadcast via socket + REST for entire rider session
  useEffect(() => {
    console.log('[Rider:Layout] isOnline:', isOnline, '| activeOrderId:', activeOrderId);
    if (!isOnline) return;

    const socket = getSocket();

    const send = () =>
      navigator.geolocation?.getCurrentPosition(
        ({ coords }) => {
          const { latitude: lat, longitude: lng } = coords;
          console.log('[Rider:Layout] Got GPS:', lat, lng);
          // Always persist to DB
          ridersApi.updateLocation(lat, lng).catch(() => {});
          // If there's an active order, also broadcast via socket
          if (activeOrderId) {
            socket.emit('rider:location', { orderId: activeOrderId, lat, lng });
            console.log(`[Rider:Layout] Emitting location for order ${activeOrderId}: lat=${lat}, lng=${lng}`);
          }
        },
        (err) => console.error('[Rider:Layout] GPS error code:', err.code, err.message),
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
      );

    send();
    const interval = setInterval(send, 5000);
    return () => clearInterval(interval);
  }, [isOnline, activeOrderId]);

  return <>{children}</>;
}
