'use client';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ridersApi } from '@/lib/api';

let socketInstance: Socket | null = null;
let listenersAttached = false;

export function getSocket(): Socket {
  if (typeof window === 'undefined') throw new Error('getSocket called on server');

  const token = localStorage.getItem('gasgo_token');

  if (socketInstance) {
    const currentAuth = (socketInstance as any).auth?.token;
    if (!currentAuth && token) {
      socketInstance.disconnect();
      socketInstance = null;
      listenersAttached = false;
    } else {
      return socketInstance;
    }
  }

  socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000', {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  if (!listenersAttached) {
    listenersAttached = true;
    socketInstance.on('connect', () => console.log('[Socket] Connected:', socketInstance?.id));
    socketInstance.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));
    socketInstance.on('connect_error', (err) => console.error('[Socket] Connection error:', err.message));
  }

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

    const handleStatus = ({ status }: { status: string }) => onStatusChange(status);
    const handleLocation = (loc: { lat: number; lng: number }) => onLocationUpdate(loc);

    socket.on('order:status', handleStatus);
    socket.on('rider:location:update', handleLocation);

    return () => {
      socket.emit('leave:order', orderId);
      socket.off('order:status', handleStatus);
      socket.off('rider:location:update', handleLocation);
    };
  }, [orderId, onStatusChange, onLocationUpdate]);
}

/**
 * For riders — broadcast GPS position every N seconds while on an active order.
 */
export function useRiderLocationBroadcast(orderId: string | null, onPosition?: (pos: { lat: number; lng: number }) => void) {
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!orderId) return;
    if (!navigator.geolocation) {
      console.warn('[Rider:Broadcast] Geolocation not supported');
      return;
    }

    const socket = getSocket();
    socket.emit('join:order', orderId);

    const broadcast = (coords: GeolocationCoordinates) => {
      const loc = { lat: coords.latitude, lng: coords.longitude };
      socket.emit('rider:location', { orderId, ...loc });
      ridersApi.updateLocation(loc.lat, loc.lng).catch(() => {});
      onPosition?.(loc);
    };

    // Get position immediately so the map can draw the route right away
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => broadcast(coords),
      (err) => console.warn('[Rider:Broadcast] getCurrentPosition error:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    // Then keep watching for updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => broadcast(coords),
      (err) => console.warn('[Rider:Broadcast] watchPosition error:', err.code, err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [orderId]);
}
