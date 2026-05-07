'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Flame, Truck, User, Phone, CreditCard, Lock,
  Car, Hash, ArrowRight, ArrowLeft, CheckCircle2, ChevronLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useOtpTimer, OtpResend } from '@/hooks/useOtpTimer';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'personal' | 'vehicle' | 'otp' | 'success';

interface FormData {
  name: string;
  phone: string;
  nationalId: string;
  password: string;
  vehicleType: 'motorbike' | 'tricycle' | 'van';
  vehiclePlate: string;
}

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS: { id: Step; label: string }[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'vehicle',  label: 'Vehicle'  },
];

// ─── Shared input ─────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function TextInput({
  leadIcon: LeadIcon,
  hasError,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  leadIcon?: React.ElementType;
  hasError?: boolean;
}) {
  return (
    <div className="relative group">
      {LeadIcon && (
        <LeadIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gray-600 transition-colors pointer-events-none" />
      )}
      <input
        className={cn(
          'w-full h-12 rounded-xl border text-sm text-gray-900 bg-gray-50 transition-all duration-150',
          'focus:outline-none focus:bg-white focus:border-gray-400 focus:ring-4 focus:ring-gray-100',
          'placeholder:text-gray-300',
          LeadIcon ? 'pl-11' : 'pl-4',
          'pr-4',
          hasError
            ? 'border-red-300 bg-red-50 focus:ring-red-100 focus:border-red-400'
            : 'border-gray-200',
          className
        )}
        {...props}
      />
    </div>
  );
}

function SubmitButton({ loading, children, onClick, type = 'submit' }: {
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'submit' | 'button';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
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
        : <>{children}<ArrowRight className="w-4 h-4" /></>
      }
    </button>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function Progress({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const done    = i < idx;
        const active  = i === idx;
        return (
          <div key={s.id} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all',
              done   ? 'bg-gray-900 text-white'
              : active ? 'bg-gray-900 text-white ring-4 ring-gray-100'
              : 'bg-gray-100 text-gray-400'
            )}>
              {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn(
              'text-xs font-medium hidden sm:block',
              active ? 'text-gray-900' : done ? 'text-gray-500' : 'text-gray-300'
            )}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn('flex-1 h-px', done ? 'bg-gray-900' : 'bg-gray-100')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1 — Personal ───────────────────────────────────────────────────────

const PREFIX = 'GHA-';

function NationalIdInput({ value, onChange, hasError }: {
  value: string;
  onChange: (val: string) => void;
  hasError?: boolean;
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.toUpperCase();
    if (!raw.startsWith(PREFIX)) {
      onChange(PREFIX);
      return;
    }
    // Strip everything after prefix to digits only, then format as NNNNNNNNN-N
    const digits = raw.slice(PREFIX.length).replace(/\D/g, '').slice(0, 10);
    const formatted = digits.length > 9
      ? digits.slice(0, 9) + '-' + digits.slice(9)
      : digits;
    onChange(PREFIX + formatted);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    if (
      (e.key === 'Backspace' || e.key === 'Delete') &&
      input.selectionStart !== null &&
      input.selectionStart <= PREFIX.length
    ) {
      e.preventDefault();
    }
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    if (!e.target.value) onChange(PREFIX);
  }

  return (
    <div className="relative group">
      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gray-600 transition-colors pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={PREFIX + '000000000-0'}
        className={cn(
          'w-full h-12 rounded-xl border text-sm text-gray-900 bg-gray-50 pl-11 pr-4 uppercase transition-all duration-150',
          'focus:outline-none focus:bg-white focus:border-gray-400 focus:ring-4 focus:ring-gray-100',
          'placeholder:text-gray-300 placeholder:normal-case',
          hasError
            ? 'border-red-300 bg-red-50 focus:ring-red-100 focus:border-red-400'
            : 'border-gray-200'
        )}
      />
    </div>
  );
}

function PersonalStep({ onNext }: { onNext: (data: Pick<FormData, 'name' | 'phone' | 'nationalId' | 'password'>) => void }) {
  const [fields, setFields] = useState({ name: '', phone: '', nationalId: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string) => (val: string) =>
    setFields((f) => ({ ...f, [key]: val }));

  function validate() {
    const e: Record<string, string> = {};
    if (!fields.name.trim()) e.name = 'Full name is required';
    if (!fields.phone.trim()) e.phone = 'Phone number is required';
    if (!/^GHA-\d{9}-\d$/.test(fields.nationalId)) e.nationalId = 'Format must be GHA-NNNNNNNNN-N';
    if (fields.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (fields.password !== fields.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onNext({ name: fields.name, phone: fields.phone, nationalId: fields.nationalId, password: fields.password });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Full legal name" error={errors.name}>
        <TextInput
          leadIcon={User}
          placeholder="As on your national ID"
          value={fields.name}
          onChange={(e) => set('name')(e.target.value)}
          hasError={!!errors.name}
        />
      </Field>
      <Field label="Phone number" error={errors.phone}>
        <div className="relative group flex">
          <div className="flex items-center gap-1.5 px-3 h-12 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-600 font-medium shrink-0">
            <span className="text-base">🇬🇭</span>
            <span>+233</span>
          </div>
          <input
            type="tel"
            placeholder="XX XXX XXXX"
            value={fields.phone}
            onChange={(e) => set('phone')(e.target.value)}
            className={cn(
              'flex-1 h-12 rounded-r-xl border text-sm text-gray-900 bg-gray-50 px-4 transition-all duration-150',
              'focus:outline-none focus:bg-white focus:border-gray-400 focus:ring-4 focus:ring-gray-100',
              'placeholder:text-gray-300',
              errors.phone
                ? 'border-red-300 bg-red-50 focus:ring-red-100 focus:border-red-400'
                : 'border-gray-200'
            )}
          />
        </div>
      </Field>
      <Field label="National ID number" error={errors.nationalId}>
        <NationalIdInput
          value={fields.nationalId}
          onChange={set('nationalId')}
          hasError={!!errors.nationalId}
        />
      </Field>
      <Field label="Password" error={errors.password}>
        <TextInput
          leadIcon={Lock}
          type="password"
          placeholder="Min. 6 characters"
          value={fields.password}
          onChange={(e) => set('password')(e.target.value)}
          hasError={!!errors.password}
        />
      </Field>
      <Field label="Confirm password" error={errors.confirmPassword}>
        <TextInput
          leadIcon={Lock}
          type="password"
          placeholder="Repeat your password"
          value={fields.confirmPassword}
          onChange={(e) => set('confirmPassword')(e.target.value)}
          hasError={!!errors.confirmPassword}
        />
      </Field>
      <SubmitButton>Continue</SubmitButton>
    </form>
  );
}

// ─── Step 2 — Vehicle ────────────────────────────────────────────────────────

const VEHICLE_TYPES = [
  { value: 'motorbike', label: 'Motorbike', emoji: '🏍️' },
  { value: 'tricycle',  label: 'Tricycle',  emoji: '🛺' },
  { value: 'van',       label: 'Van',       emoji: '🚐' },
];

function VehicleStep({
  onNext,
  onBack,
  loading,
}: {
  onNext: (data: Pick<FormData, 'vehicleType' | 'vehiclePlate'>) => void;
  onBack: () => void;
  loading: boolean;
}) {
  const [vehicleType, setVehicleType] = useState<FormData['vehicleType']>('motorbike');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehiclePlate.trim()) { setError('Plate number is required'); return; }
    setError('');
    onNext({ vehicleType, vehiclePlate: vehiclePlate.toUpperCase() });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Vehicle type">
        <div className="grid grid-cols-3 gap-2">
          {VEHICLE_TYPES.map(({ value, label, emoji }) => (
            <button
              key={value}
              type="button"
              onClick={() => setVehicleType(value as FormData['vehicleType'])}
              className={cn(
                'flex flex-col items-center gap-1.5 py-3.5 rounded-xl border-2 text-xs font-semibold transition-all duration-150',
                vehicleType === value
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
              )}
            >
              <span className="text-xl">{emoji}</span>
              {label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Vehicle plate number" error={error}>
        <TextInput
          leadIcon={Hash}
          placeholder="GR-1234-23"
          className="uppercase"
          value={vehiclePlate}
          onChange={(e) => setVehiclePlate(e.target.value)}
          hasError={!!error}
        />
      </Field>

      <div className="space-y-2.5">
        <SubmitButton loading={loading}>Submit application</SubmitButton>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-1.5 w-full text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Go back
        </button>
      </div>
    </form>
  );
}

// ─── Step 3 — OTP ────────────────────────────────────────────────────────────

function OtpStep({
  phone,
  onVerify,
  onBack,
  loading,
}: {
  phone: string;
  onVerify: (code: string) => void;
  onBack: () => void;
  loading: boolean;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const { seconds, canResend, reset: resetTimer } = useOtpTimer();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 4) { setError('Enter the 4-digit code'); return; }
    setError('');
    onVerify(code);
  }

  async function handleResend() {
    setResending(true);
    try {
      await authApi.sendOTP(phone, 'registration');
      resetTimer();
      setCode('');
      toast.success('New code sent');
    } catch {
      toast.error('Could not resend. Try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm text-gray-500 text-center">
        We sent a verification code to{' '}
        <span className="font-semibold text-gray-800">{phone}</span>
      </div>

      <Field label="Verification code" error={error}>
        <TextInput
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="0  0  0  0"
          className="text-center text-xl font-bold tracking-[0.5em]"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          hasError={!!error}
        />
      </Field>

      <div className="space-y-2.5">
        <SubmitButton loading={loading}>Verify number</SubmitButton>
        <OtpResend seconds={seconds} canResend={canResend} resending={resending} onResend={handleResend} />
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-1.5 w-full text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Go back
        </button>
      </div>
    </form>
  );
}

// ─── Success ──────────────────────────────────────────────────────────────────

function SuccessStep({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="text-center space-y-6 py-4">
      <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-8 h-8 text-green-500" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-black text-gray-900">Application submitted!</h3>
        <p className="text-sm text-gray-400 leading-relaxed">
          Our team will review your KYC documents and send you an SMS once your account is approved — usually within 24 hours.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { icon: '📋', label: 'KYC review', sub: '~24 hrs' },
          { icon: '📱', label: 'SMS alert', sub: 'On approval' },
          { icon: '🚀', label: 'Start earning', sub: 'Right away' },
        ].map((item) => (
          <div key={item.label} className="bg-gray-50 rounded-xl p-3">
            <p className="text-xl mb-1">{item.icon}</p>
            <p className="text-xs font-semibold text-gray-700">{item.label}</p>
            <p className="text-[10px] text-gray-400">{item.sub}</p>
          </div>
        ))}
      </div>
      <button
        onClick={onLogin}
        className="w-full h-12 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
      >
        Back to sign in
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RiderRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('personal');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<FormData>>({});

  function handlePersonal(data: Pick<FormData, 'name' | 'phone' | 'nationalId' | 'password'>) {
    setFormData((f) => ({ ...f, ...data }));
    setStep('vehicle');
  }

  async function handleVehicle(data: Pick<FormData, 'vehicleType' | 'vehiclePlate'>) {
    const payload = { ...formData, ...data } as FormData;
    setFormData(payload);
    setLoading(true);
    try {
      await authApi.riderRegister(payload);
      toast.success('Application submitted!');
      setStep('success');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-gray-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-brand-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-sky-600/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">GetGas</span>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
              <Truck className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs text-gray-400 font-medium">Rider Network · Ghana</span>
            </div>
            <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
              Deliver gas.<br />
              <span className="text-brand-500">Earn daily.</span>
            </h1>
            <p className="text-gray-400 text-base leading-relaxed max-w-sm">
              Join hundreds of riders making money on their own schedule. Get paid per delivery, no fixed hours.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '₵80+', label: 'Avg. daily earn' },
              { value: 'Flex', label: 'Work hours' },
              { value: '24h', label: 'KYC turnaround' },
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
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-white">
        <div className="w-full max-w-[400px] space-y-8">

          {/* Mobile logo */}
          <div className="flex lg:hidden flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-gray-900 text-lg">GetGas</span>
          </div>

          {/* Header */}
          <div className="space-y-1 text-center lg:text-left">
            {step !== 'success' && (
              <button
                onClick={() => step === 'vehicle' ? setStep('personal') : router.push('/?role=rider')}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors mb-3 mx-auto lg:mx-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {step === 'vehicle' ? 'Back' : 'Back to sign in'}
              </button>
            )}
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Become a rider</h2>
            <p className="text-sm text-gray-400">
              {step === 'personal' && 'Start with your personal details'}
              {step === 'vehicle'  && 'Tell us about your vehicle'}
              {step === 'otp'      && 'Verify your phone number'}
              {step === 'success'  && 'You\'re all set!'}
            </p>
          </div>

          {/* Progress */}
          {step !== 'success' && <Progress current={step} />}

          {/* Steps */}
          <div className="animate-slide-up">
            {step === 'personal' && <PersonalStep onNext={handlePersonal} />}
            {step === 'vehicle'  && (
              <VehicleStep
                onNext={handleVehicle}
                onBack={() => setStep('personal')}
                loading={loading}
              />
            )}
            {step === 'success' && <SuccessStep onLogin={() => router.push('/rider/login')} />}
          </div>

          {step === 'personal' && (
            <p className="text-center text-sm text-gray-400">
              Already registered?{' '}
              <a href="/rider/login" className="text-gray-900 font-semibold hover:underline">
                Sign in
              </a>
            </p>
          )}

        </div>
      </div>
    </div>
  );
}
