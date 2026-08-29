'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
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
    <div className="min-h-screen flex bg-white">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-brand-dark flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-brand-orange/10 pointer-events-none" />
        <div className="absolute bottom-0 -left-24 w-[400px] h-[400px] rounded-full bg-brand-orange/5 pointer-events-none" />

        <Link href="/" className="flex items-center gap-2 relative z-10">
          <Image src="/logo.png" alt="GetGas" width={36} height={36} className="rounded-xl" />
          <span className="font-display font-bold text-xl text-white"><span className="text-brand-orange">Get</span>Gas</span>
        </Link>

        <div className="relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 bg-brand-orange/20 border border-brand-orange/30 rounded-full px-4 py-1.5">
            <span className="w-1.5 h-1.5 bg-brand-orange rounded-full animate-pulse" />
            <span className="text-xs text-brand-orange font-semibold tracking-wide">Live in Ghana</span>
          </div>
          <div className="space-y-4">
            <h1 className="font-display text-5xl font-extrabold text-white leading-tight">
              Gas delivered<br />
              <span className="text-brand-orange">in minutes.</span>
            </h1>
            <p className="text-gray-400 text-[15px] leading-relaxed max-w-[340px]">
              The fastest way to get LPG cylinders to your door. Order, track, and pay — all in one place.
            </p>
          </div>
          <div className="space-y-3">
            {['Order in seconds', 'Track your rider live', 'OTP-verified delivery', 'Pay with MoMo or card'].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <CheckCircle2 size={16} className="text-brand-orange flex-shrink-0" />
                <span className="text-sm text-gray-400">{f}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 pt-2">
            {[
              { value: '10,000+', label: 'Orders delivered' },
              { value: '98%',     label: 'On-time rate'     },
              { value: '4.9★',    label: 'Avg. rating'      },
            ].map((s) => (
              <div key={s.label} className="space-y-1">
                <p className="font-display text-2xl font-extrabold text-brand-orange">{s.value}</p>
                <p className="text-[11px] text-gray-500 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-gray-600 text-xs relative z-10">© 2025 GetGas Technologies Ltd.</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-brand-gray">
        <div className="w-full max-w-[400px] space-y-7">

          {/* Mobile logo */}
          <div className="flex lg:hidden flex-col items-center gap-2 text-center">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="GetGas" width={40} height={40} className="rounded-xl" />
              <span className="font-display font-bold text-xl text-brand-dark"><span className="text-brand-orange">Get</span>Gas</span>
            </Link>
          </div>

          <div className="space-y-1">
            <h2 className="font-display text-3xl font-extrabold text-brand-dark tracking-tight">Welcome back</h2>
            <p className="text-sm text-gray-500">Sign in to your account to continue</p>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-5">
            {errors.general && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Phone */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">Phone number</label>
                <div className="flex">
                  <div className="flex items-center gap-1.5 px-3 h-12 bg-brand-gray border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-500 font-medium shrink-0 select-none">
                    <span className="text-base">🇬🇭</span>
                    <span>+233</span>
                  </div>
                  <input
                    type="tel" inputMode="numeric" placeholder="XXXXXXXXX"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setErrors({}); }}
                    className={cn(
                      'flex-1 h-12 rounded-r-xl border text-sm text-brand-dark bg-brand-gray px-4 transition-all',
                      'focus:outline-none focus:bg-white focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 placeholder:text-gray-400',
                      errors.phone ? 'border-red-400' : 'border-gray-200'
                    )}
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} placeholder="Enter your password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                    className={cn(
                      'w-full h-12 rounded-xl border text-sm text-brand-dark bg-brand-gray px-4 pr-11 transition-all',
                      'focus:outline-none focus:bg-white focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 placeholder:text-gray-400',
                      errors.password ? 'border-red-400' : 'border-gray-200'
                    )}
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-dark">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-xs text-brand-orange font-semibold hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full h-12 rounded-full bg-brand-orange hover:bg-orange-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-lg shadow-orange-100">
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">or</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <button
              onClick={() => authApi.googleLogin()}
              className="w-full h-12 rounded-full border border-gray-200 bg-white hover:bg-brand-gray text-brand-dark text-sm font-semibold flex items-center justify-center gap-3 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="space-y-2 text-center">
            <p className="text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-brand-orange font-semibold hover:underline">Create one</Link>
            </p>
            <p className="text-sm text-gray-500">
              Want to deliver with us?{' '}
              <Link href="/rider/register" className="text-brand-orange font-semibold hover:underline">Apply as a rider</Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
