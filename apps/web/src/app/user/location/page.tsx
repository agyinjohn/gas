'use client';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { PickedLocation } from '@/components/LocationPicker';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

export default function SetLocationPage() {
  const router = useRouter();

  function handleConfirm(loc: PickedLocation) {
    localStorage.setItem('gasgo_lat', String(loc.lat));
    localStorage.setItem('gasgo_lng', String(loc.lng));
    localStorage.setItem('gasgo_location_label', loc.formatted.split(',')[0]);
    localStorage.setItem('gasgo_location_mode', 'manual');
    router.replace('/user');
  }

  return (
    <LocationPicker
      onConfirm={handleConfirm}
      onClose={() => router.replace('/user')}
    />
  );
}
