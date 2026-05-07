'use client';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  const token = typeof window !== 'undefined' ? localStorage.getItem('gasgo_token') : null;

  // If socket exists but was created without a token (unauthenticated), destroy and recreate
  if (socketInstance) {
    const currentAuth = (socketInstance as any).auth?.token;
    if (!currentAuth && token) {
      console.log('[Socket] Recreating socket with auth token');
      socketInstance.disconnect();
      socketInstance = null;
    } else {
      return socketInstance;
    }
  }

  console.log('[Socket] Creating new socket connection, token present:', !!token);
  socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000', {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socketInstance.on('connect', () => {
    console.log('[Socket] Connected:', socketInstance?.id);
  });
  socketInstance.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });
  socketInstance.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  return socketInstance;
}

export function useOrderTracking(
  orderId: string | null,
  onStatusChange: (status: string) => void,
  onLocationUpdate: (loc: { lat: number; lng: number }) => void
) {
  useEffect(() => {
    if (!orderId) return;

    const socket = getSocket();
    socket.emit('join:order', orderId);

    socket.on('order:status', ({ status }: { status: string }) => onStatusChange(status));
    socket.on('rider:location:update', onLocationUpdate);

    return () => {
      socket.emit('leave:order', orderId);
      socket.off('order:status');
      socket.off('rider:location:update');
    };
  }, [orderId, onStatusChange, onLocationUpdate]);
}

/**
 * For riders — broadcast GPS position every N seconds while on an active order.
 */
export function useRiderLocationBroadcast(orderId: string | null, intervalMs = 12000) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const socket = getSocket();

    const broadcast = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        socket.emit('rider:location', {
          orderId,
          lat: coords.latitude,
          lng: coords.longitude,
        });
      });
    };

    broadcast();
    intervalRef.current = setInterval(broadcast, intervalMs);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [orderId, intervalMs]);
}
