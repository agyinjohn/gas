'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useOtpTimer, OtpResend } from '@/hooks/useOtpTimer';

const ROLE_HOME: Record<string, string> = {
  user:    '/user',
  rider:   '/rider',
  station: '/station',
  admin:   '/admin',
};

// ─── Shared components ────────────────────────────────────────────────────────

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function TextInput({ hasError, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  return (
    <input
      className={cn(
        'w-full h-12 rounded-xl border text-sm text-gray-900 bg-gray-50 px-4 transition-all duration-150',
        'focus:outline-none focus:bg-white focus:border-gray-400 focus:ring-4 focus:ring-gray-100',
        'placeholder:text-gray-300',
        hasError ? 'border-red-300 bg-red-50 focus:ring-red-100 focus:border-red-400' : 'border-gray-200',
        className
      )}
      {...props}
    />
  );
}

function PhoneInput({ value, onChange, hasError }: { value: string; onChange: (v: string) => void; hasError?: boolean }) {
  return (
    <div className="flex">
      <div className="flex items-center gap-1.5 px-3 h-12 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-600 font-medium shrink-0 select-none">
        <span className="text-base">🇬🇭</span>
        <span>+233</span>
      </div>
      <input
        type="tel"
        inputMode="numeric"
        placeholder="XXXXXXXXX"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
        className={cn(
          'flex-1 h-12 rounded-r-xl border text-sm text-gray-900 bg-gray-50 px-4 transition-all duration-150',
          'focus:outline-none focus:bg-white focus:border-gray-400 focus:ring-4 focus:ring-gray-100',
          'placeholder:text-gray-300',
          hasError ? 'border-red-300 bg-red-50 focus:ring-red-100 focus:border-red-400' : 'border-gray-200'
        )}
      />
    </div>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={cn(
        'w-full h-12 rounded-xl bg-gray-900 text-white text-sm font-semibold',
        'flex items-center justify-center gap-2',
        'hover:bg-gray-800 active:scale-[0.99] transition-all duration-150',
        'disabled:opacity-60 disabled:cursor-not-allowed'
      )}
    >
      {loading
        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        : <>{children}<ArrowRight className="w-4 h-4" /></>}
    </button>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [localPhone, setLocalPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const e164Ref = useRef('');
  const { seconds, canResend, reset: resetTimer } = useOtpTimer();

  function toE164(local: string) {
    const digits = local.replace(/\D/g, '');
    const stripped = digits.startsWith('0') ? digits.slice(1) : digits;
    return '+233' + stripped;
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    const digits = localPhone.replace(/\D/g, '');
    const stripped = digits.startsWith('0') ? digits.slice(1) : digits;
    if (stripped.length !== 9) { setPhoneError('Enter a valid 9-digit Ghana number'); return; }
    setPhoneError('');
    const computed = toE164(localPhone);
    e164Ref.current = computed;
    setLoading(true);
    try {
      await authApi.sendOTP(computed, 'login');
      setStep('otp');
      resetTimer();
      toast.success('OTP sent');
    } catch {
      toast.error('Could not send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 4) { setCodeError('Enter the verification code'); return; }
    setCodeError('');
    setLoading(true);
    try {
      const res = await authApi.verifyOTP(e164Ref.current, code, 'login');
      const { token, user } = res.data;
      login(token, user);
      // Request location permission after login
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            localStorage.setItem('user_lat', String(coords.latitude));
            localStorage.setItem('user_lng', String(coords.longitude));
          },
          () => {} // silent fail
        );
      }
      router.push(ROLE_HOME[user.role] ?? '/user');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Incorrect OTP. Please try again.';
      setCodeError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (step === 'phone') {
    return (
      <form onSubmit={sendOtp} className="space-y-5">
        <FormField label="Phone number" error={phoneError}>
          <PhoneInput value={localPhone} onChange={setLocalPhone} hasError={!!phoneError} />
        </FormField>
        <SubmitButton loading={loading}>Continue</SubmitButton>
        <p className="text-center text-sm text-gray-400">
          Want to deliver?{' '}
          <a href="/rider/login" className="text-gray-900 font-semibold hover:underline">Sign in as a rider</a>
          {' · '}
          <a href="/rider/register" className="text-gray-900 font-semibold hover:underline">Apply as a rider</a>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={verifyOtp} className="space-y-5">
      <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm text-gray-500 text-center">
        Code sent to{' '}
        <span className="font-semibold text-gray-800">
          +233{localPhone.replace(/\D/g, '').replace(/^0/, '')}
        </span>
      </div>
      <FormField label="Verification code" error={codeError}>
        <TextInput
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="0  0  0  0"
          className="text-center text-xl font-bold tracking-[0.5em]"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          hasError={!!codeError}
        />
      </FormField>
      <SubmitButton loading={loading}>Verify & continue</SubmitButton>
      <OtpResend
        seconds={seconds}
        canResend={canResend}
        resending={resending}
        onResend={async () => {
          setResending(true);
          try {
            await authApi.sendOTP(e164Ref.current, 'login');
            resetTimer();
            setCode('');
            toast.success('New code sent');
          } catch {
            toast.error('Could not resend. Try again.');
          } finally {
            setResending(false);
          }
        }}
      />
      <button
        type="button"
        onClick={() => { setStep('phone'); setCode(''); setCodeError(''); }}
        className="flex items-center justify-center gap-1.5 w-full text-sm text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Use a different number
      </button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">

      {/* ── Left panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-gray-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-brand-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-brand-600/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <Image src="/logo.png" alt="GasGo" width={40} height={40} className="rounded-xl" />
          <span className="text-white font-bold text-lg tracking-tight">GasGo</span>
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

        <p className="text-gray-700 text-xs relative z-10">© 2025 GasGo · All rights reserved</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-white">
        <div className="w-full max-w-[400px] space-y-8">

          {/* Mobile logo — centred */}
          <div className="flex lg:hidden flex-col items-center gap-2 text-center">
            <Image src="/logo.png" alt="GasGo" width={40} height={40} className="rounded-xl" />
            <span className="font-black text-gray-900 text-lg">GasGo</span>
          </div>

          {/* Heading */}
          <div className="space-y-1 text-center lg:text-left">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Welcome back</h2>
            <p className="text-sm text-gray-400">Enter your phone number to continue</p>
          </div>

          <LoginForm />

        </div>
      </div>
    </div>
  );
}
