'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const token     = params.get('token');
    const userId    = params.get('userId');
    const name      = params.get('name') ?? 'User';
    const needsPhone = params.get('needsPhone') === '1';
    const error     = params.get('error');

    if (error) {
      router.replace('/?error=google_auth_failed');
      return;
    }

    if (!token || !userId) {
      router.replace('/');
      return;
    }

    // Store auth — phone is placeholder for Google users until they add it
    login(token, { id: userId, name, phone: '', role: 'user' });

    if (needsPhone) {
      // Google user without phone — go to add-phone flow
      router.replace('/user?addPhone=1');
    } else {
      router.replace('/user');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
        <p className="text-sm text-gray-400">Signing you in…</p>
      </div>
    </div>
  );
}
