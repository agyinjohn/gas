'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const ROLE_HOME: Record<string, string> = {
  user:    '/user',
  rider:   '/rider',
  station: '/station',
  admin:   '/admin',
};

function toE164(local: string): string {
  const digits = local.replace(/\D/g, '');
  const stripped = digits.startsWith('0') ? digits.slice(1) : digits;
  return '+233' + stripped;
}

export default function LoginPage() {
  const { login } = useAuth();
  const router    = useRouter();

  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState<{ phone?: string; password?: string; general?: string }>({});

  function validate() {
    const e: typeof errors = {};
    const digits = phone.replace(/\D/g, '').replace(/^0/, '');
    if (digits.length !== 9) e.phone    = 'Enter a valid 9-digit Ghana number';
    if (!password)            e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      // Try unified staff login first (handles riders, station, admin)
      // then fall back to user login
      let res: any;
      try {
        res = await authApi.staffLogin(toE164(phone), password);
        const { token, role, user } = res.data;
        let stationId: string | undefined;
        if (role === 'station') {
          try { stationId = JSON.parse(atob(token.split('.')[1])).stationId; } catch {}
        }
        login(token, { id: user.id, name: user.name, phone: user.phone, role, stationId });
        router.push(ROLE_HOME[role] ?? '/user');
        return;
      } catch (staffErr: any) {
        // If staff login returns 404 (no staff account), try user login
        if (staffErr.response?.status !== 404) throw staffErr;
      }

      res = await authApi.login(toE164(phone), password);
      const { token, user } = res.data;
      login(token, user);
      router.push(ROLE_HOME[user.role] ?? '/user');
    } catch (err: any) {
      const code = err.response?.data?.code;
      const msg  = err.response?.data?.message || 'Login failed. Please try again.';
      if (code === 'PASSWORD_REQUIRED') {
        const userPhone = err.response?.data?.phone || toE164(phone);
        router.push(`/forgot-password?phone=${encodeURIComponent(userPhone)}`);
      } else {
        setErrors({ general: msg });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel (desktop) ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-gray-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] bg-brand-500/10 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-orange-600/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.12]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/40">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-black text-2xl tracking-tight">GasGo</span>
        </div>

        <div className="relative z-10 space-y-10">
          <div className="inline-flex items-center gap-2 bg-brand-500/20 border border-brand-500/40 rounded-lg px-4 py-1.5">
            <span className="w-1.5 h-1.5 bg-brand-300 rounded-full animate-pulse" />
            <span className="text-xs text-brand-200 font-semibold tracking-wide">Live in Ghana</span>
          </div>
          <div className="space-y-5">
            <h1 className="text-[56px] font-black text-white leading-[1.0] tracking-tight">
              Gas delivered<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-orange-300 to-amber-300">
                in minutes.
              </span>
            </h1>
            <p className="text-gray-400 text-[15px] leading-relaxed max-w-[340px]">
              The fastest way to get LPG cylinders to your door. Order, track, and pay — all in one place.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '2,400+', label: 'Orders delivered', color: 'text-brand-400'  },
              { value: '98%',    label: 'On-time rate',     color: 'text-emerald-400' },
              { value: '4.9★',   label: 'Avg. rating',      color: 'text-amber-400'   },
            ].map((s) => (
              <div key={s.label} className="space-y-1">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-gray-600 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-gray-700 text-xs relative z-10">© 2025 GasGo · All rights reserved</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center min-h-screen px-6 py-12 bg-[var(--bg)]">
        <div className="w-full max-w-[400px] space-y-7">

          {/* Mobile logo */}
          <div className="flex lg:hidden flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <span className="font-black text-[var(--text-primary)] text-lg">GetGas</span>
          </div>

          <div className="space-y-1 text-center lg:text-left">
            <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Welcome back</h2>
            <p className="text-sm text-[var(--text-muted)]">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {errors.general && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-sm text-red-500">{errors.general}</p>
              </div>
            )}

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
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setErrors({}); }}
                  className={cn(
                    'flex-1 h-12 rounded-r-xl border text-sm text-[var(--text-primary)] bg-[var(--bg-card2)] px-4 transition-all',
                    'focus:outline-none focus:bg-[var(--bg-card)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-[var(--text-muted)]',
                    errors.phone ? 'border-red-400' : 'border-[var(--border)]'
                  )}
                />
              </div>
              {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-brand-500 font-semibold hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                  className={cn(
                    'w-full h-12 rounded-xl border text-sm text-[var(--text-primary)] bg-[var(--bg-card2)] px-4 pr-11 transition-all',
                    'focus:outline-none focus:bg-[var(--bg-card)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-[var(--text-muted)]',
                    errors.password ? 'border-red-400' : 'border-[var(--border)]'
                  )}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60 shadow-lg shadow-brand-500/25">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-muted)] font-medium">or</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Google sign in */}
          <button
            onClick={() => authApi.googleLogin()}
            className="w-full h-12 rounded-xl border-2 border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card2)] text-[var(--text-primary)] text-sm font-semibold flex items-center justify-center gap-3 transition-all active:scale-[0.99]">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Register + Rider links */}
          <div className="space-y-2 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-brand-500 font-semibold hover:underline">Create one</Link>
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Want to deliver with us?{' '}
              <Link href="/rider/register" className="text-brand-500 font-semibold hover:underline">Apply as a rider</Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
