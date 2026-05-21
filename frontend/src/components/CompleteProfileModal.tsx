'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { authApi, usersApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CompleteProfileModal() {
  const { user, updateUser, login } = useAuth();

  const missingName  = !user?.name?.trim() || /^user\s+\S+$/i.test(user.name.trim());
  const missingPhone = !user?.phone || user.phone.startsWith('google_');

  const [name, setName]   = useState(user?.name ?? '');
  const [phone, setPhone] = useState('');
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});

  if (!user || user.role !== 'user') return null;
  if (!missingName && !missingPhone) return null;

  async function handleSubmit(e: React.FormEvent) {
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

      // Add phone if missing (Google user) — no OTP required
      if (missingPhone) {
        const res = await authApi.addPhone(phone);
        const { token, user: updatedUser } = res.data;
        login(token, updatedUser);
      }

      toast.success('Profile updated!');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update profile';
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-[var(--bg-card)] rounded-3xl p-6 space-y-5 shadow-2xl">

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

        <form onSubmit={handleSubmit} className="space-y-4">

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
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Save & Continue'
            }
          </button>
        </form>
      </div>
    </div>
  );
}
