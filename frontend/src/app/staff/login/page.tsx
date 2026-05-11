'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, ArrowRight, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const ROLE_HOME: Record<string, string> = {
  admin:   '/admin',
  rider:   '/rider',
  station: '/station',
};

function toE164(local: string) {
  const digits = local.replace(/\D/g, '');
  const stripped = digits.startsWith('0') ? digits.slice(1) : digits;
  return '+233' + stripped;
}

export default function StaffLoginPage() {
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
      const res = await authApi.staffLogin(toE164(phone), password);
      const { token, role, user } = res.data;
      let stationId: string | undefined;
      if (role === 'station') {
        try { stationId = JSON.parse(atob(token.split('.')[1])).stationId; } catch {}
      }
      login(token, { id: user.id, name: user.name, phone: user.phone, role, stationId });
      router.push(ROLE_HOME[role] ?? '/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid phone or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-gray-950 flex-col justify-between p-12 relative overflow-hidden">

        {/* Blobs */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-orange-500/8 rounded-full blur-[100px] pointer-events-none" />

        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.10]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        <div className="absolute top-0 right-24 w-px h-full bg-gradient-to-b from-transparent via-white/5 to-transparent" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/40">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-black text-2xl tracking-tight">GetGas</span>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-brand-500/20 border border-brand-500/40 rounded-lg px-4 py-1.5">
            <span className="w-1.5 h-1.5 bg-brand-300 rounded-full animate-pulse" />
            <span className="text-xs text-brand-200 font-semibold tracking-wide">Staff Portal · Ghana</span>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-5xl font-black text-white leading-[1.05] tracking-tight">
              Run your<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-orange-300 to-amber-300">
                station smarter.
              </span>
            </h1>
            <p className="text-gray-400 text-[15px] leading-relaxed max-w-[320px]">
              Manage orders, track deliveries, and grow your LPG business — all from one dashboard.
            </p>
          </div>

          <div className="w-12 h-0.5 bg-gradient-to-r from-brand-500 to-transparent rounded-full" />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '2,400+', label: 'Orders delivered', color: 'text-brand-400'  },
              { value: '98%',    label: 'On-time rate',     color: 'text-emerald-400' },
              { value: '4.9★',   label: 'Avg. rating',      color: 'text-amber-400'   },
            ].map((s) => (
              <div key={s.label} className="space-y-1">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-gray-500 font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-4">
            <p className="text-sm text-gray-400 leading-relaxed italic">
              &ldquo;GetGas has transformed how we manage deliveries. Orders come in, riders pick up, customers get their gas — seamlessly.&rdquo;
            </p>
            <div className="flex items-center gap-2.5 mt-3">
              <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
                <span className="text-[11px] font-bold text-brand-400">KA</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Kwame Asante</p>
                <p className="text-[10px] text-gray-600">Station Manager, Accra</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-gray-700 text-xs relative z-10">© 2025 GetGas · All rights reserved</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center min-h-screen px-6 py-12 bg-[var(--bg)]">
        <div className="w-full max-w-[400px] space-y-8">

          {/* Mobile logo */}
          <div className="flex lg:hidden flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <span className="font-black text-[var(--text-primary)] text-lg">GetGas Staff</span>
          </div>

          <div className="space-y-1 text-center lg:text-left">
            <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Welcome back</h2>
            <p className="text-sm text-[var(--text-muted)]">Sign in with your phone number and password</p>
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
                  type="tel" inputMode="numeric" placeholder="XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className={cn(
                    'flex-1 h-12 rounded-r-xl border text-sm text-[var(--text-primary)] bg-[var(--bg-card2)] px-4 transition-all',
                    'focus:outline-none focus:bg-[var(--bg-card)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-[var(--text-muted)]',
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
                  type="password" placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    'w-full h-12 rounded-xl border text-sm text-[var(--text-primary)] bg-[var(--bg-card2)] pl-11 pr-4 transition-all',
                    'focus:outline-none focus:bg-[var(--bg-card)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-[var(--text-muted)]',
                    errors.password ? 'border-red-400 bg-red-500/10' : 'border-[var(--border)]'
                  )}
                />
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-lg shadow-brand-500/25">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>Sign in</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          <div className="space-y-2 text-center">
            <p className="text-xs text-[var(--text-muted)]">
              Are you a customer?{' '}
              <Link href="/" className="text-brand-500 font-semibold hover:underline">Order gas here</Link>
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Want to be a rider?{' '}
              <Link href="/rider/register" className="text-brand-500 font-semibold hover:underline">Apply here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
