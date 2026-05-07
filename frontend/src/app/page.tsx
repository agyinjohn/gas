'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
        <a href="/rider/login" className="text-brand-500 font-semibold hover:underline">Sign in as a rider</a>
        {' · '}
        <a href="/rider/register" className="text-brand-500 font-semibold hover:underline">Apply as a rider</a>
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
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-brand-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-brand-600/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <Image src="/logo.png" alt="GetGas" width={40} height={40} className="rounded-xl" />
          <span className="text-white font-bold text-lg tracking-tight">GetGas</span>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-gray-400 font-medium">Live in Ghana</span>
            </div>
            <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
              Gas delivered<br />
              <span className="text-brand-500">in minutes.</span>
            </h1>
            <p className="text-gray-400 text-base leading-relaxed max-w-sm">
              The fastest way to get LPG cylinders to your door. Order, track, and pay — all in one place.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '2,400+', label: 'Orders delivered' },
              { value: '98%',    label: 'On-time rate'     },
              { value: '4.9★',   label: 'Avg. rating'      },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-gray-700 text-xs relative z-10">© 2025 GetGas · All rights reserved</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-[var(--bg)]">
        <div className="w-full max-w-[400px] space-y-8">

          {step === 'phone' && (
            <>
              {/* Mobile logo */}
              <div className="flex lg:hidden flex-col items-center gap-2 text-center">
                <Image src="/logo.png" alt="GetGas" width={64} height={64} />
                <span className="font-black text-[var(--text-primary)] text-lg">GetGas</span>
              </div>
              <div className="space-y-1 text-center lg:text-left">
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
