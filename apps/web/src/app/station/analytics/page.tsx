'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StationAnalyticsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard since all analytics content is now there
    router.replace('/station');
  }, [router]);

  return (
    <div className="px-4 lg:px-6 py-6 max-w-6xl mx-auto pb-8">
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
