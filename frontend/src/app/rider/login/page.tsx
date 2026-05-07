'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function toE164(local: string) {
  const digits = local.replace(/\D/g, '');
  const stripped = digits.startsWith('0') ? digits.slice(1) : digits;
  return '+233' + stripped;
}

export default function RiderLoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState<{ phone?: string; password?: string }>({});
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    const digits = phone.replace(/\D/g, '').replace(/^0/, '');
    if (digits.length !== 9) errs.phone = 'Enter a valid 9-digit Ghana number';
    if (!password)           errs.password = 'Password is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await authApi.riderLogin(toE164(phone), password);
      const { token, rider } = res.data;
      login(token, { id: rider.id, name: rider.name, phone: rider.phone, role: 'rider' });
      router.push('/rider');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid phone or password';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg)]">

      {/* Left panel — always dark */}
      <div className="hidden lg:flex lg:w-[52%] bg-gray-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-brand-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <Image src="/logo.png" alt="GetGas" width={40} height={40} className="rounded-xl" />
          <span className="text-white font-bold text-lg tracking-tight">GetGas</span>
        </div>
        <div className="relative z-10 space-y-4">
          <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
            Earn by Delivering Gas<br /><span className="text-brand-500">in minutes</span>
          </h1>
          <p className="text-gray-400 text-base leading-relaxed max-w-sm">
            Join the fastest LPG delivery network. Accept requests, deliver with ease, and earn — all in one place.
          </p>
        </div>
        <p className="text-gray-700 text-xs relative z-10">© 2025 GetGas · All rights reserved</p>
      </div>

      {/* Right panel — theme-aware */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-[var(--bg)]">
        <div className="w-full max-w-[400px] space-y-8">

          {/* Mobile logo */}
          <div className="flex lg:hidden flex-col items-center gap-2">
            <Image src="/logo.png" alt="GetGas" width={64} height={64} />
            <span className="font-black text-[var(--text-primary)] text-lg">GetGas</span>
          </div>

          <div className="space-y-1 text-center lg:text-left">
            <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Rider sign in</h2>
            <p className="text-sm text-[var(--text-muted)]">Enter your phone number and password</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Phone number
              </label>
              <div className="flex">
                <div className="flex items-center gap-1.5 px-3 h-12 bg-[var(--bg-card2)] border border-r-0 border-[var(--border)] rounded-l-xl text-sm text-[var(--text-muted)] font-medium shrink-0 select-none">
                  <span className="text-base">🇬🇭</span>
                  <span>+233</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className={cn(
                    'flex-1 h-12 rounded-r-xl border text-sm text-[var(--text-primary)] bg-[var(--bg-card2)] px-4 transition-all',
                    'focus:outline-none focus:bg-[var(--bg-card)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                    'placeholder:text-[var(--text-muted)]',
                    errors.phone ? 'border-red-400 bg-red-500/10' : 'border-[var(--border)]'
                  )}
                />
              </div>
              {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    'w-full h-12 rounded-xl border text-sm text-[var(--text-primary)] bg-[var(--bg-card2)] pl-11 pr-4 transition-all',
                    'focus:outline-none focus:bg-[var(--bg-card)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                    'placeholder:text-[var(--text-muted)]',
                    errors.password ? 'border-red-400 bg-red-500/10' : 'border-[var(--border)]'
                  )}
                />
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-lg shadow-brand-500/25"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>Sign in</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          <p className="text-center text-sm text-[var(--text-muted)]">
            Not registered?{' '}
            <Link href="/rider/register" className="text-brand-500 font-semibold hover:underline">Apply as a rider</Link>
          </p>

          <div className="border-t border-[var(--border)] pt-5 text-center">
            <p className="text-xs text-[var(--text-muted)] mb-2">Looking to order gas?</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] hover:text-brand-500 transition-colors"
            >
              <span>Sign in as a customer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
