'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function StationDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/user/checkout?stationId=${id}`);
  }, [id, router]);
  return null;
}
