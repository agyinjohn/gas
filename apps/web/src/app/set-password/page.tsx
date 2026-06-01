'use client';
import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';

type Step = 'otp' | 'password';

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

export default function SetPasswordPage() {
  const { login } = useAuth();
  const router    = useRouter();
  const params    = useSearchParams();
  const phone     = params.get('phone') ?? '';

  const [step, setStep]         = useState<Step>('otp');
  const [otp, setOtp]           = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [sending, setSending]   = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [errors, setErrors]     = useState<Record<string, string>>({});

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

  async function sendOtp() {
    setSending(true);
    try {
      await authApi.sendOTP(phone, 'registration');
      startCountdown();
      toast.success('OTP sent to your phone');
    } catch {
      toast.error('Could not send OTP. Try again.');
    } finally { setSending(false); }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 4) { setErrors({ otp: 'Enter the 4-digit code' }); return; }
    setErrors({});
    setStep('password');
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (password.length < 6)      errs.password = 'Password must be at least 6 characters';
    if (password !== confirm)      errs.confirm  = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await authApi.setPassword({ phone, otp, password });
      const { token, user } = res.data;
      login(token, user);
      toast.success('Password set! Welcome back.');
      router.replace('/user');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to set password';
      if (msg.toLowerCase().includes('otp')) {
        setStep('otp'); setOtp('');
        setErrors({ otp: 'OTP expired. Please request a new one.' });
      } else {
        setErrors({ general: msg });
      }
    } finally { setLoading(false); }
  }

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 py-12 bg-[var(--bg)]">
      <div className="w-full max-w-[400px] space-y-7">

        <div className="flex flex-col items-center gap-2">
          <Image src="/logo.png" alt="GasGo" width={48} height={48} className="rounded-xl" />
          <span className="font-black text-[var(--text-primary)] text-lg">GasGo</span>
        </div>

        {/* ── Step 1: OTP ── */}
        {step === 'otp' && (
          <>
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Set your password</h2>
              <p className="text-sm text-[var(--text-muted)]">
                First, verify it's you. We'll send a code to<br />
                <span className="font-semibold text-[var(--text-primary)]">{phone}</span>
              </p>
            </div>

            {countdown === 0 && canResend && (
              <button onClick={sendOtp} disabled={sending}
                className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-lg shadow-brand-500/25">
                {sending
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><span>Send OTP</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            )}

            {countdown > 0 && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <OtpBoxes value={otp} onChange={setOtp} hasError={!!errors.otp} />
                {errors.otp && <p className="text-xs text-red-500 text-center">{errors.otp}</p>}
                <p className="text-center text-sm text-[var(--text-muted)]">
                  Didn&apos;t receive it?{' '}
                  {canResend
                    ? <button type="button" onClick={sendOtp} disabled={sending}
                        className="text-brand-500 font-semibold hover:underline disabled:opacity-50">
                        {sending ? 'Sending…' : 'Resend'}
                      </button>
                    : <span className="text-brand-500 font-semibold">{timeStr}</span>
                  }
                </p>
                <button type="submit" disabled={otp.length < 4}
                  className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-brand-500/25">
                  <span>Continue</span><ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            <p className="text-center text-sm text-[var(--text-muted)]">
              <Link href="/" className="flex items-center justify-center gap-1.5 hover:text-[var(--text-primary)] transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </Link>
            </p>
          </>
        )}

        {/* ── Step 2: Set Password ── */}
        {step === 'password' && (
          <>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Create a password</h2>
              <p className="text-sm text-[var(--text-muted)]">You'll use this to sign in from now on</p>
            </div>
            <form onSubmit={handleSetPassword} className="space-y-4">
              {errors.general && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-500">{errors.general}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">New password</label>
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
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Confirm password</label>
                <input type={showPw ? 'text' : 'password'} placeholder="Repeat your password"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setErrors({}); }}
                  className={cn(
                    'w-full h-12 rounded-xl border text-sm text-[var(--text-primary)] bg-[var(--bg-card2)] px-4 transition-all',
                    'focus:outline-none focus:bg-[var(--bg-card)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-[var(--text-muted)]',
                    errors.confirm ? 'border-red-400' : 'border-[var(--border)]'
                  )}
                />
                {errors.confirm && <p className="text-xs text-red-500">{errors.confirm}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-lg shadow-brand-500/25">
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><span>Set Password & Sign In</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}
