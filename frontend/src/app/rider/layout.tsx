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

  const isOnline = riderData?.status === 'available' || riderData?.status === 'busy';

  // Join personal socket room once — survives all navigation
  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket();
    socket.emit('join:rider', user.id);
  }, [user?.id]);

  // Location tracking — runs for the entire rider session, not per-page
  useEffect(() => {
    if (!isOnline) return;

    const send = () =>
      navigator.geolocation?.getCurrentPosition(
        ({ coords }) => ridersApi.updateLocation(coords.latitude, coords.longitude).catch(() => {}),
        () => {}
      );

    send(); // immediate on going online
    const interval = setInterval(send, 12000);
    return () => clearInterval(interval);
  }, [isOnline]);

  return <>{children}</>;
}
