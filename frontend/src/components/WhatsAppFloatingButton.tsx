'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface WhatsAppButtonProps {
  presetMessage?: string;
}

export default function WhatsAppFloatingButton({ presetMessage = "Hi! I need help with my order." }: WhatsAppButtonProps) {
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const startRef = useRef({ x: 0, y: 0, btnX: 0, btnY: 0 });
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [snapping, setSnapping] = useState(false);
  const BTN_SIZE = 56; // w-14/h-14 = 56px

  useEffect(() => {
    // Fetch WhatsApp number from system config using app API (respects baseURL)
    api.get('/api/v1/stations/system-config')
      .then((res) => {
        console.log('WhatsApp config (api) response:', res.data);
        const cfg = res.data?.config;
        if (cfg?.supportWhatsApp) {
          console.log('WhatsApp number found:', cfg.supportWhatsApp);
          setWhatsappNumber(cfg.supportWhatsApp);
        } else {
          console.log('No WhatsApp number in config, button will be hidden');
        }
      })
      .catch((err) => {
        console.error('Failed to load WhatsApp config via api:', err);
        setError(err?.message || 'Failed to load');
      })
      .finally(() => setLoading(false));
  }, []);

  // Initialize position from localStorage or default bottom-right
  useEffect(() => {
    try {
      const raw = localStorage.getItem('whatsapp_btn_pos');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPos(parsed);
          return;
        }
      }
    } catch {}
    // default: 24px from right/bottom
    if (typeof window !== 'undefined') {
      const left = Math.max(8, window.innerWidth - 24 - BTN_SIZE);
      const top = Math.max(8, window.innerHeight - 24 - BTN_SIZE);
      setPos({ x: left, y: top });
    }
  }, []);

  const handleWhatsAppClick = () => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    if (!whatsappNumber) return;
    const cleanNumber = whatsappNumber.replace(/[+\s\-()]/g, '');
    const encodedMessage = encodeURIComponent(presetMessage);
    window.open(`https://wa.me/${cleanNumber}?text=${encodedMessage}`, '_blank');
  };

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!btnRef.current || !pos) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;
    draggingRef.current = true;
    movedRef.current = false;
    startRef.current = { x: e.clientX, y: e.clientY, btnX: pos.x, btnY: pos.y };
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current || !startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
    const newX = Math.min(Math.max(8, startRef.current.btnX + dx), window.innerWidth - BTN_SIZE - 8);
    const newY = Math.min(Math.max(8, startRef.current.btnY + dy), window.innerHeight - BTN_SIZE - 8);
    setPos({ x: newX, y: newY });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!btnRef.current) return;
    try { btnRef.current.releasePointerCapture(e.pointerId); } catch {}
    draggingRef.current = false;
    pointerIdRef.current = null;
    setSnapping(true);
    setTimeout(() => setSnapping(false), 300);
    // Snap to nearest side (left or right)
    setPos((cur) => {
      if (!cur) return cur;
      const mid = window.innerWidth / 2;
      const snappedX = cur.x + BTN_SIZE / 2 < mid ? 16 : window.innerWidth - BTN_SIZE - 16;
      const snappedY = Math.min(Math.max(16, cur.y), window.innerHeight - BTN_SIZE - 16);
      const snapped = { x: snappedX, y: snappedY };
      localStorage.setItem('whatsapp_btn_pos', JSON.stringify(snapped));
      return snapped;
    });
  }, []);

  if (loading || !pos) {
    return (
      <button
        disabled
        className="w-14 h-14 bg-[#25D366]/50 text-white rounded-full flex items-center justify-center shadow-lg z-40 flex-shrink-0"
        style={{ position: 'fixed', left: pos?.x ?? undefined, top: pos?.y ?? undefined, touchAction: 'none', transition: 'left 0.3s cubic-bezier(.4,0,.2,1), top 0.3s cubic-bezier(.4,0,.2,1)' }}
      >
        <Loader2 className="w-6 h-6 animate-spin" />
      </button>
    );
  }

  if (!whatsappNumber) return null;

  return (
    <button
      ref={btnRef}
      onClick={handleWhatsAppClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="w-14 h-14 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl z-40 flex-shrink-0 active:scale-95"
      aria-label="Contact support on WhatsApp"
      title="Contact support on WhatsApp"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        touchAction: 'none',
        transition: snapping ? 'left 0.3s cubic-bezier(.4,0,.2,1), top 0.3s cubic-bezier(.4,0,.2,1)' : 'box-shadow 0.2s, background-color 0.2s, transform 0.1s',
      }}
    >
      <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M24 4C13 4 4 13 4 24c0 3.6 1 7 2.7 9.9L4 44l10.4-2.7C17.2 43 20.5 44 24 44c11 0 20-9 20-20S35 4 24 4z" fill="#fff"/>
        <path d="M24 7.2C14.8 7.2 7.2 14.8 7.2 24c0 3.3.9 6.4 2.6 9.1l.4.7-1.7 6.2 6.4-1.7.7.4c2.6 1.5 5.6 2.4 8.7 2.4 9.2 0 16.8-7.6 16.8-16.8S33.2 7.2 24 7.2z" fill="#25D366"/>
        <path d="M17.5 14.5c-.4-1-.8-1-.9-1h-.8c-.3 0-.7.1-1.1.5-.4.4-1.5 1.4-1.5 3.5s1.5 4 1.7 4.3c.2.3 3 4.7 7.3 6.4 3.6 1.4 4.3 1.1 5.1 1 .8-.1 2.5-1 2.9-2s.4-1.8.3-2c-.1-.2-.4-.3-.9-.5s-2.5-1.2-2.9-1.4c-.4-.2-.7-.2-1 .2-.3.4-1.1 1.4-1.4 1.7-.3.3-.5.3-.9.1-.4-.2-1.8-.7-3.4-2.1-1.3-1.1-2.1-2.5-2.4-2.9-.3-.4 0-.6.2-.8.2-.2.4-.5.6-.7.2-.2.3-.4.4-.7.1-.3 0-.6-.1-.8-.1-.3-.9-2.3-1.2-3.1z" fill="#fff"/>
      </svg>
    </button>
  );
}
