'use client';
import { useState, useEffect, useCallback } from 'react';

const RESEND_SECONDS = 60;

export function useOtpTimer() {
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!active) return;
    if (seconds <= 0) { setActive(false); return; }
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds, active]);

  const reset = useCallback(() => {
    setSeconds(RESEND_SECONDS);
    setActive(true);
  }, []);

  const canResend = !active && seconds <= 0;

  return { seconds, canResend, reset };
}

// ─── OTP Resend row ───────────────────────────────────────────────────────────

interface OtpResendProps {
  seconds: number;
  canResend: boolean;
  resending: boolean;
  onResend: () => void;
}

export function OtpResend({ seconds, canResend, resending, onResend }: OtpResendProps) {
  // SVG ring params
  const r = 10;
  const circ = 2 * Math.PI * r;
  const progress = seconds / 60;
  const dash = circ * progress;

  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      {canResend ? (
        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          className="text-gray-900 font-semibold hover:underline disabled:opacity-50"
        >
          {resending ? 'Sending…' : 'Resend code'}
        </button>
      ) : (
        <>
          {/* Circular countdown */}
          <svg width="24" height="24" className="-rotate-90">
            <circle cx="12" cy="12" r={r} fill="none" stroke="#e5e7eb" strokeWidth="2" />
            <circle
              cx="12" cy="12" r={r}
              fill="none"
              stroke="#111827"
              strokeWidth="2"
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 1s linear' }}
            />
          </svg>
          <span className="text-gray-400">
            Resend in <span className="font-semibold text-gray-700">{seconds}s</span>
          </span>
        </>
      )}
    </div>
  );
}
