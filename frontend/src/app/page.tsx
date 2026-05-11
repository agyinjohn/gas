'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useOtpTimer } from '@/hooks/useOtpTimer';

const ROLE_HOME: Record<string, string> = {
  user:    '/user',
  rider:   '/rider',
  station: '/station',
  admin:   '/admin',
};

// ─── Phone step ───────────────────────────────────────────────────────────────

function PhoneStep({
  onSent,
}: {
  onSent: (e164: string, display: string) => void;
}) {
  const [local, setLocal]     = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits   = local.replace(/\D/g, '');
    const stripped = digits.startsWith('0') ? digits.slice(1) : digits;
    if (stripped.length !== 9) { setError('Enter a valid 9-digit Ghana number'); return; }
    setError('');
    const e164 = '+233' + stripped;
    setLoading(true);
    try {
      await authApi.sendOTP(e164, 'login');
      toast.success('OTP sent');
      onSent(e164, stripped);
    } catch {
      toast.error('Could not send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
            value={local}
            onChange={(e) => { setLocal(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
            className={cn(
              'flex-1 h-12 rounded-r-xl border text-sm text-[var(--text-primary)] bg-[var(--bg-card2)] px-4 transition-all',
              'focus:outline-none focus:bg-[var(--bg-card)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
              'placeholder:text-[var(--text-muted)]',
              error ? 'border-red-400 bg-red-500/10' : 'border-[var(--border)]'
            )}
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-60 shadow-lg shadow-brand-500/25"
      >
        {loading
          ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <><span>Continue</span><ArrowRight className="w-4 h-4" /></>}
      </button>

      <p className="text-center text-sm text-[var(--text-muted)]">
        Want to deliver?{' '}
        <Link href="/rider/register" className="text-brand-500 font-semibold hover:underline">Apply as a rider</Link>
      </p>
      <p className="text-center text-sm text-[var(--text-muted)]">
        Staff?{' '}
        <Link href="/staff/login" className="text-brand-500 font-semibold hover:underline">Sign in here</Link>
      </p>
    </form>
  );
}

// ─── OTP digit boxes ──────────────────────────────────────────────────────────

function OtpBoxes({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
}) {
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (value[i]) {
        onChange(value.slice(0, i) + value.slice(i + 1));
      } else if (i > 0) {
        refs[i - 1].current?.focus();
        onChange(value.slice(0, i - 1) + value.slice(i));
      }
    }
  }

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    if (!digit) return;
    const next = value.slice(0, i) + digit + value.slice(i + 1);
    onChange(next.slice(0, 4));
    if (i < 3) refs[i + 1].current?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted) { onChange(pasted); refs[Math.min(pasted.length, 3)].current?.focus(); }
    e.preventDefault();
  }

  return (
    <div className="flex gap-3 justify-center">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className={cn(
            'w-16 h-16 rounded-2xl text-center text-2xl font-black transition-all',
            'focus:outline-none focus:ring-2',
            hasError
              ? 'border-2 border-red-500 bg-red-500/10 text-red-500 focus:ring-red-500/30'
              : value[i]
              ? 'border-2 border-brand-500 bg-brand-500/10 text-[var(--text-primary)] focus:ring-brand-500/30'
              : 'border-2 border-[var(--border)] bg-[var(--bg-card2)] text-[var(--text-primary)] focus:ring-brand-500/30'
          )}
        />
      ))}
    </div>
  );
}

// ─── OTP step ─────────────────────────────────────────────────────────────────

function OtpStep({
  e164,
  displayPhone,
  onBack,
  onVerified,
}: {
  e164: string;
  displayPhone: string;
  onBack: () => void;
  onVerified: (token: string, user: any) => void;
}) {
  const [code, setCode]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [seconds, setSeconds] = useState(90);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (seconds <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  function resetTimer() { setSeconds(90); setCanResend(false); }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 4) { setError('Enter the 4-digit code'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verifyOTP(e164, code, 'login');
      const { token, user } = res.data;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            localStorage.setItem('user_lat', String(coords.latitude));
            localStorage.setItem('user_lng', String(coords.longitude));
          },
          () => {}
        );
      }
      onVerified(token, user);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Incorrect OTP. Please try again.';
      setError(msg);
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await authApi.sendOTP(e164, 'login');
      resetTimer();
      setCode('');
      setError('');
      toast.success('New code sent');
    } catch {
      toast.error('Could not resend. Try again.');
    } finally {
      setResending(false);
    }
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}s`;

  return (
    <form onSubmit={handleVerify} className="space-y-6">
      {/* Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-brand-500/15 rounded-3xl flex items-center justify-center">
          <Image src="/logo.png" alt="GetGas" width={44} height={44} className="rounded-xl" />
        </div>
      </div>

      {/* Heading */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Verify OTP</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Enter 4 digit OTP sent to your mobile<br />
          <span className="font-semibold text-[var(--text-primary)]">+233 {displayPhone}</span>
        </p>
      </div>

      {/* Digit boxes */}
      <OtpBoxes value={code} onChange={setCode} hasError={!!error} />
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}

      {/* Resend */}
      <p className="text-center text-sm text-[var(--text-muted)]">
        Didn&apos;t receive OTP?{' '}
        {canResend ? (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-brand-500 font-semibold hover:underline disabled:opacity-50"
          >
            {resending ? 'Sending…' : 'Resend'}
          </button>
        ) : (
          <span className="text-brand-500 font-semibold">{timeStr}</span>
        )}
      </p>

      {/* Verify button */}
      <button
        type="submit"
        disabled={loading || code.length < 4}
        className="w-full h-14 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-base font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 shadow-lg shadow-brand-500/25"
      >
        {loading
          ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <><span>Verify</span><Check className="w-5 h-5" /></>}
      </button>

      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-center gap-1.5 w-full text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Use a different number
      </button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login } = useAuth();
  const router    = useRouter();
  const [step, setStep]               = useState<'phone' | 'otp'>('phone');
  const [e164, setE164]               = useState('');
  const [displayPhone, setDisplayPhone] = useState('');

  function handleSent(e164: string, display: string) {
    setE164(e164);
    setDisplayPhone(display);
    setStep('otp');
  }

  function handleVerified(token: string, user: any) {
    login(token, user);
    router.push(ROLE_HOME[user.role] ?? '/user');
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-gray-950 flex-col justify-between p-12 relative overflow-hidden">

        {/* Background layers */}
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] bg-brand-500/10 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-orange-600/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-0 w-[300px] h-[300px] bg-violet-600/8 rounded-full blur-[100px] pointer-events-none" />

        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.12]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }} />

        {/* Accent lines */}
        <div className="absolute top-0 right-24 w-px h-full bg-gradient-to-b from-transparent via-white/5 to-transparent" />
        <div className="absolute top-0 right-48 w-px h-full bg-gradient-to-b from-transparent via-white/3 to-transparent" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <Image src="/logo.png" alt="GetGas" width={48} height={48} className="rounded-xl" />
          <span className="text-white font-black text-2xl tracking-tight">GetGas</span>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-10">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-brand-500/20 border border-brand-500/40 rounded-lg px-4 py-1.5">
            <span className="w-1.5 h-1.5 bg-brand-300 rounded-full animate-pulse" />
            <span className="text-xs text-brand-200 font-semibold tracking-wide">Live in Ghana</span>
          </div>

          {/* Headline */}
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

          {/* Divider */}
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
                <p className="text-[11px] text-gray-600 font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-4">
            <p className="text-sm text-gray-400 leading-relaxed italic">
              &ldquo;I ordered gas at 8am and it was at my door by 8:25. GasGo is a lifesaver!”
            </p>
            <div className="flex items-center gap-2.5 mt-3">
              <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
                <span className="text-[11px] font-bold text-brand-400">AB</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Abena Boateng</p>
                <p className="text-[10px] text-gray-600">Customer, Kumasi</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-gray-700 text-xs relative z-10">© 2025 GasGo · All rights reserved</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center min-h-screen px-6 py-12 bg-[var(--bg)]">
        <div className="w-full max-w-[400px] space-y-8">

          {step === 'phone' && (
            <>
              {/* Mobile logo */}
              <div className="flex lg:hidden flex-col items-center gap-3 text-center">
                <Image src="/logo.png" alt="GetGas" width={64} height={64} />
                <span className="font-black text-[var(--text-primary)] text-lg">GetGas</span>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Welcome back</h2>
                  <p className="text-sm text-[var(--text-muted)]">Enter your phone number to continue</p>
                </div>
              </div>
              <div className="hidden lg:block space-y-1 text-center lg:text-left">
                <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Welcome back</h2>
                <p className="text-sm text-[var(--text-muted)]">Enter your phone number to continue</p>
              </div>
              <PhoneStep onSent={handleSent} />
            </>
          )}

          {step === 'otp' && (
            <OtpStep
              e164={e164}
              displayPhone={displayPhone}
              onBack={() => setStep('phone')}
              onVerified={handleVerified}
            />
          )}

        </div>
      </div>
    </div>
  );
}
