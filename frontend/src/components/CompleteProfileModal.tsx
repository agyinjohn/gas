'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { authApi, usersApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { User, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

type Step = 'details' | 'otp';

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
    <div className="flex gap-2.5 justify-center">
      {[0, 1, 2, 3].map((i) => (
        <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1}
          autoFocus={i === 0}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className={cn(
            'w-14 h-14 rounded-2xl text-center text-2xl font-black transition-all focus:outline-none focus:ring-2',
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

export default function CompleteProfileModal() {
  const { user, updateUser, login } = useAuth();

  const missingName = !user?.name?.trim() || /^user\s+\S+$/i.test(user.name.trim());
  const missingPhone = !user?.phone || user.phone.startsWith('google_') || user.phone === '';

  const [step, setStep]   = useState<Step>('details');
  const [name, setName]   = useState(user?.name ?? '');
  const [phone, setPhone] = useState('');
  const [otp, setOtp]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  function startCountdown() {
    setCountdown(60);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((s) => {
        if (s <= 1) { clearInterval(countdownRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  if (!user || user.role !== 'user') return null;
  if (!missingName && !missingPhone) return null;

  // ─── Step 1: name + phone, then send the verification code ──────────────────
  async function handleSubmitDetails(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (missingName && !name.trim()) {
      errs.name = 'Enter your name';
    }

    if (missingPhone) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 9) {
        errs.phone = 'Enter a valid phone number';
      }
    }

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      // Save name if missing
      if (missingName) {
        await usersApi.updateMe({ name: name.trim() });
        updateUser({ name: name.trim() });
      }

      // Phone must be verified by OTP before it is attached to the account
      if (missingPhone) {
        await authApi.sendAddPhoneOTP(phone);
        setOtp('');
        setStep('otp');
        startCountdown();
        toast.success('Verification code sent to your phone');
      } else {
        toast.success('Profile updated!');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update profile';
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  }

  // ─── Step 2: verify the code and attach the phone ───────────────────────────
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 4) { setErrors({ otp: 'Enter the 4-digit code' }); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await authApi.addPhone(phone, otp);
      const { token, user: updatedUser } = res.data;
      login(token, updatedUser);
      toast.success('Phone number verified!');
    } catch (err: any) {
      setErrors({ otp: err.response?.data?.message || 'Invalid code. Try again.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setErrors({});
    try {
      await authApi.sendAddPhoneOTP(phone);
      setOtp('');
      startCountdown();
      toast.success('New code sent');
    } catch (err: any) {
      setErrors({ otp: err.response?.data?.message || 'Could not resend. Try again.' });
    } finally {
      setResending(false);
    }
  }

  const displayPhone = '+233 ' + phone.replace(/\D/g, '').replace(/^0/, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-[var(--bg-card)] rounded-3xl p-6 space-y-5 shadow-2xl">

        {step === 'details' ? (
          <>
            <div>
              <h2 className="text-lg font-black text-[var(--text-primary)]">Complete your profile</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {missingName && missingPhone
                  ? 'We need your name and phone number to continue'
                  : missingName
                  ? 'What should we call you?'
                  : 'Add your phone number to place orders'}
              </p>
            </div>

            {errors.general && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                <p className="text-xs text-red-500">{errors.general}</p>
              </div>
            )}

            <form onSubmit={handleSubmitDetails} className="space-y-4">

              {/* Name field */}
              {missingName && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Full name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="e.g. Kwame Mensah"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setErrors({}); }}
                      className={cn(
                        'w-full h-12 rounded-xl border text-sm text-[var(--text-primary)] bg-[var(--bg-card2)] pl-10 pr-4 transition-all',
                        'focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-[var(--text-muted)]',
                        errors.name ? 'border-red-400' : 'border-[var(--border)]'
                      )}
                    />
                  </div>
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>
              )}

              {/* Phone field */}
              {missingPhone && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Phone number</label>
                  <div className="flex">
                    <div className="flex items-center gap-1.5 px-3 h-12 bg-[var(--bg-card2)] border border-r-0 border-[var(--border)] rounded-l-xl text-sm text-[var(--text-muted)] font-medium shrink-0">
                      <span>🇬🇭</span><span>+233</span>
                    </div>
                    <input
                      type="tel" inputMode="numeric" placeholder="XXXXXXXXX"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setErrors({}); }}
                      className={cn(
                        'flex-1 h-12 rounded-r-xl border text-sm text-[var(--text-primary)] bg-[var(--bg-card2)] px-4 transition-all',
                        'focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-[var(--text-muted)]',
                        errors.phone ? 'border-red-400' : 'border-[var(--border)]'
                      )}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                  <p className="text-[11px] text-[var(--text-muted)]">We&apos;ll text you a code to verify this number</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : missingPhone ? 'Send verification code' : 'Save & Continue'
                }
              </button>
            </form>
          </>
        ) : (
          <>
            <div>
              <button
                type="button"
                onClick={() => { setStep('details'); setOtp(''); setErrors({}); }}
                className="flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-3"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Change number
              </button>
              <h2 className="text-lg font-black text-[var(--text-primary)]">Verify your number</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Enter the 4-digit code we sent to <span className="font-semibold text-[var(--text-primary)]">{displayPhone}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <OtpBoxes value={otp} onChange={(v) => { setOtp(v); setErrors({}); }} hasError={!!errors.otp} />
              {errors.otp && <p className="text-xs text-red-500 text-center">{errors.otp}</p>}

              <button
                type="submit"
                disabled={loading || otp.length < 4}
                className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : 'Verify & Continue'
                }
              </button>

              <p className="text-center text-xs text-[var(--text-muted)]">
                {countdown > 0
                  ? <>Resend code in {countdown}s</>
                  : <button type="button" onClick={handleResend} disabled={resending}
                      className="font-semibold text-brand-500 hover:text-brand-600 disabled:opacity-60">
                      {resending ? 'Sending…' : 'Resend code'}
                    </button>
                }
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
