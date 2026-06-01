'use client';
import { LogOut, X } from 'lucide-react';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SignOutConfirmModal({ onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-[var(--bg-card)] rounded-3xl p-6 space-y-5 shadow-2xl border border-[var(--border)]">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center shrink-0">
            <LogOut className="w-5 h-5 text-red-500" />
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-[var(--bg-card2)] flex items-center justify-center"
          >
            <X className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>

        <div>
          <h2 className="text-lg font-black text-[var(--text-primary)]">Sign out?</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            You'll need to sign in again to access your account.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card2)] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
