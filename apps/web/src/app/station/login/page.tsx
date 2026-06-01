'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, ArrowRight, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { stationAuthApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useOtpTimer, OtpResend } from '@/hooks/useOtpTimer';
import Link from 'next/link';

function toE164(local: string) {
  const digits = local.replace(/\D/g, '');
  const stripped = digits.startsWith('0') ? digits.slice(1) : digits;
  return '+233' + stripped;
}

export default function StationLoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [step, setStep]         = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone]       = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [code, setCode]         = useState('');
  const [codeError, setCodeError] = useState('');
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const e164Ref = useRef('');
  const { seconds, canResend, reset: resetTimer } = useOtpTimer();

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '').replace(/^0/, '');
    if (digits.length !== 9) { setPhoneError('Enter a valid 9-digit Ghana number'); return; }
    setPhoneError('');
    e164Ref.current = toE164(phone);
    setLoading(true);
    try {
      await stationAuthApi.sendOTP(e164Ref.current);
      setStep('otp');
      resetTimer();
      toast.success('OTP sent');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not send OTP');
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
      const res = await stationAuthApi.verifyOTP(e164Ref.current, code, 'login');
      const { token, user, station } = res.data;
      login(token, {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: 'station',
      });
      router.push('/station');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Incorrect OTP. Please try again.';
      setCodeError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[52%] bg-gray-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-brand-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">GasGo</span>
        </div>
        <div className="relative z-10 space-y-4">
          <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
            Station<br /><span className="text-brand-500">Portal</span>
          </h1>
          <p className="text-gray-400 text-base leading-relaxed max-w-sm">
            Manage your orders, inventory, pricing and track your station's performance.
          </p>
        </div>
        <p className="text-gray-700 text-xs relative z-10">© 2025 GasGo · All rights reserved</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-white">
        <div className="w-full max-w-[400px] space-y-8">

          <div className="flex lg:hidden flex-col items-center gap-2">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-gray-900 text-lg">GasGo</span>
          </div>

          <div className="space-y-1 text-center lg:text-left">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Station sign in</h2>
            <p className="text-sm text-gray-400">Enter your registered phone number</p>
          </div>

          {step === 'phone' ? (
            <form onSubmit={sendOtp} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400">Phone number</label>
                <div className="flex">
                  <div className="flex items-center gap-1.5 px-3 h-12 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-600 font-medium shrink-0 select-none">
                    <span className="text-base">🇬🇭</span>
                    <span>+233</span>
                  </div>
                  <input
                    type="tel" inputMode="numeric" placeholder="XXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className={cn(
                      'flex-1 h-12 rounded-r-xl border text-sm text-gray-900 bg-gray-50 px-4 transition-all',
                      'focus:outline-none focus:bg-white focus:border-gray-400 focus:ring-4 focus:ring-gray-100 placeholder:text-gray-300',
                      phoneError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    )}
                  />
                </div>
                {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-12 rounded-xl bg-gray-900 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-60 transition-all">
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><span>Continue</span><ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-5">
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm text-gray-500 text-center">
                Code sent to{' '}
                <span className="font-semibold text-gray-800">
                  +233{phone.replace(/\D/g, '').replace(/^0/, '')}
                </span>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400">Verification code</label>
                <input
                  type="text" inputMode="numeric" maxLength={4}
                  placeholder="0  0  0  0"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className={cn(
                    'w-full h-12 rounded-xl border text-center text-xl font-bold tracking-[0.5em] bg-gray-50 transition-all',
                    'focus:outline-none focus:bg-white focus:border-gray-400 focus:ring-4 focus:ring-gray-100 placeholder:text-gray-300 placeholder:tracking-normal',
                    codeError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  )}
                />
                {codeError && <p className="text-xs text-red-500">{codeError}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-12 rounded-xl bg-gray-900 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-60 transition-all">
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><span>Verify & sign in</span><ArrowRight className="w-4 h-4" /></>
                }
              </button>
              <OtpResend
                seconds={seconds} canResend={canResend} resending={resending}
                onResend={async () => {
                  setResending(true);
                  try {
                    await stationAuthApi.sendOTP(e164Ref.current);
                    resetTimer(); setCode('');
                    toast.success('New code sent');
                  } catch { toast.error('Could not resend'); }
                  finally { setResending(false); }
                }}
              />
              <button type="button" onClick={() => { setStep('phone'); setCode(''); setCodeError(''); }}
                className="flex items-center justify-center gap-1.5 w-full text-sm text-gray-400 hover:text-gray-700 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" /> Use a different number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
