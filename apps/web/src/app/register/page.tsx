'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Eye, EyeOff, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';

type Step = 'phone' | 'otp' | 'details';

function normalizePhone(local: string): string {
  const digits = local.replace(/\D/g, '');
  const stripped = digits.startsWith('0') ? digits.slice(1) : digits;
  return '+233' + stripped;
}

// ─── OTP boxes ────────────────────────────────────────────────────────────────
function OtpBoxes({ value, onChange, hasError }: { value: string; onChange: (v: string) => void; hasError: boolean }) {
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (value[i]) { onChange(value.slice(0, i) + value.slice(i + 1)); }
      else if (i > 0) { refs[i - 1].current?.focus(); onChange(value.slice(0, i - 1) + value.slice(i)); }
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
        <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className={cn(
            'w-16 h-16 rounded-2xl text-center text-2xl font-black transition-all focus:outline-none focus:ring-2',
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const { login } = useAuth();
  const router    = useRouter();

  const [step, setStep]       = useState<Step>('phone');
  const [phone, setPhone]     = useState('');
  const [e164, setE164]       = useState('');
  const [otp, setOtp]         = useState('');
  const [name, setName]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(90);
  const [canResend, setCanResend] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  function startCountdown() {
    setCountdown(90); setCanResend(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((s) => {
        if (s <= 1) { clearInterval(countdownRef.current!); setCanResend(true); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  // Step 1 — send OTP
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    const stripped = digits.startsWith('0') ? digits.slice(1) : digits;
    if (stripped.length !== 9) { setErrors({ phone: 'Enter a valid 9-digit Ghana number' }); return; }
    setErrors({});
    const normalized = normalizePhone(phone);
    setLoading(true);
    try {
      await authApi.sendOTP(normalized, 'registration');
      setE164(normalized);
      setStep('otp');
      startCountdown();
      toast.success('OTP sent to your phone');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Could not send OTP';
      if (err.response?.status === 409) {
        setErrors({ phone: 'This number is already registered. Sign in instead.' });
      } else {
        setErrors({ phone: msg });
      }
    } finally { setLoading(false); }
  }

  // Step 2 — verify OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 4) { setErrors({ otp: 'Enter the 4-digit code' }); return; }
    setErrors({});
    // We don't call the backend here — OTP is verified in the final register call
    setStep('details');
  }

  async function handleResend() {
    setResending(true);
    try {
      await authApi.sendOTP(e164, 'registration');
      setOtp(''); startCountdown();
      toast.success('New code sent');
    } catch { toast.error('Could not resend. Try again.'); }
    finally { setResending(false); }
  }

  // Step 3 — register
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = 'Enter your full name';
    if (password.length < 6)    errs.password = 'Password must be at least 6 characters';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await authApi.register({ phone: e164, otp, name: name.trim(), password });
      const { token, user } = res.data;
      login(token, user);
      toast.success('Account created!');
      router.push('/user');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed';
      if (err.response?.data?.errors?.length) {
        const firstErr = err.response.data.errors[0];
        if (firstErr.path === 'otp' || firstErr.msg?.toLowerCase().includes('otp')) {
          setStep('otp'); setOtp('');
          setErrors({ otp: 'OTP expired or invalid. Please request a new one.' });
        } else {
          setErrors({ general: firstErr.msg || msg });
        }
      } else {
        setErrors({ general: msg });
      }
    } finally { setLoading(false); }
  }

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-gray-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] bg-brand-500/10 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.12]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }} />
        <div className="flex items-center gap-3 relative z-10">
          <Image src="/logo.png" alt="GasGo" width={48} height={48} className="rounded-xl" />
          <span className="text-white font-black text-2xl tracking-tight">GasGo</span>
        </div>
        <div className="relative z-10 space-y-6">
          <h1 className="text-[52px] font-black text-white leading-[1.0] tracking-tight">
            Join thousands<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-orange-300 to-amber-300">
              getting gas fast.
            </span>
          </h1>
          <p className="text-gray-400 text-[15px] leading-relaxed max-w-[340px]">
            Create your account in under a minute and get LPG delivered to your door.
          </p>
          <div className="space-y-3">
            {['Order in seconds', 'Track your rider live', 'Pay with MoMo or card'].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-brand-400" />
                </div>
                <span className="text-sm text-gray-400">{f}</span>
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
          <div className="flex lg:hidden flex-col items-center gap-2">
            <Image src="/logo.png" alt="GasGo" width={48} height={48} className="rounded-xl" />
            <span className="font-black text-[var(--text-primary)] text-lg">GasGo</span>
          </div>

          {/* ── Step 1: Phone ── */}
          {step === 'phone' && (
            <>
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Create account</h2>
                <p className="text-sm text-[var(--text-muted)]">Enter your phone number to get started</p>
              </div>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Phone number</label>
                  <div className="flex">
                    <div className="flex items-center gap-1.5 px-3 h-12 bg-[var(--bg-card2)] border border-r-0 border-[var(--border)] rounded-l-xl text-sm text-[var(--text-muted)] font-medium shrink-0 select-none">
                      <span className="text-base">🇬🇭</span><span>+233</span>
                    </div>
                    <input type="tel" inputMode="numeric" placeholder="XXXXXXXXX"
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
                <button type="submit" disabled={loading}
                  className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-lg shadow-brand-500/25">
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><span>Send OTP</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
              <p className="text-center text-sm text-[var(--text-muted)]">
                Already have an account?{' '}
                <Link href="/" className="text-brand-500 font-semibold hover:underline">Sign in</Link>
              </p>
            </>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <>
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Verify your number</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Enter the 4-digit code sent to<br />
                  <span className="font-semibold text-[var(--text-primary)]">{e164}</span>
                </p>
              </div>
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <OtpBoxes value={otp} onChange={setOtp} hasError={!!errors.otp} />
                {errors.otp && <p className="text-xs text-red-500 text-center">{errors.otp}</p>}
                <p className="text-center text-sm text-[var(--text-muted)]">
                  Didn&apos;t receive it?{' '}
                  {canResend
                    ? <button type="button" onClick={handleResend} disabled={resending}
                        className="text-brand-500 font-semibold hover:underline disabled:opacity-50">
                        {resending ? 'Sending…' : 'Resend'}
                      </button>
                    : <span className="text-brand-500 font-semibold">{timeStr}</span>
                  }
                </p>
                <button type="submit" disabled={otp.length < 4}
                  className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-brand-500/25">
                  <span>Continue</span><ArrowRight className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => { setStep('phone'); setOtp(''); setErrors({}); }}
                  className="flex items-center justify-center gap-1.5 w-full text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Change number
                </button>
              </form>
            </>
          )}

          {/* ── Step 3: Name + Password ── */}
          {step === 'details' && (
            <>
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Almost there!</h2>
                <p className="text-sm text-[var(--text-muted)]">Set your name and a password</p>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
                {errors.general && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <p className="text-sm text-red-500">{errors.general}</p>
                  </div>
                )}
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Full name</label>
                  <input type="text" placeholder="e.g. Kwame Mensah"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrors({}); }}
                    className={cn(
                      'w-full h-12 rounded-xl border text-sm text-[var(--text-primary)] bg-[var(--bg-card2)] px-4 transition-all',
                      'focus:outline-none focus:bg-[var(--bg-card)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-[var(--text-muted)]',
                      errors.name ? 'border-red-400' : 'border-[var(--border)]'
                    )}
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>
                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} placeholder="Min. 6 characters"
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
                  className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-lg shadow-brand-500/25">
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><span>Create Account</span><Check className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
