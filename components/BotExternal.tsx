'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGreeting, getRandomPhrase } from '@/lib/bot-phrases';

/* ─────────────────────────────────────────────
   SVG character — viewBox 0 0 60 92
   eyeNormX / eyeNormY: -1..1 (normalised)
   blinking: closes eyes
───────────────────────────────────────────── */
function BotCharacter({
  w = 56, h = 84,
  eyeNormX = 0, eyeNormY = 0,
  blinking = false,
}: {
  w?: number; h?: number;
  eyeNormX?: number; eyeNormY?: number;
  blinking?: boolean;
}) {
  const maxEyeShift = 2.6; // SVG units
  const ox = eyeNormX * maxEyeShift;
  const oy = eyeNormY * maxEyeShift;

  return (
    <svg width={w} height={h} viewBox="0 0 60 92" fill="none">
      <defs>
        <linearGradient id="ext-head" x1="0" y1="0" x2="60" y2="51" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60a5fa" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="ext-body" x1="0" y1="58" x2="60" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
      </defs>

      {/* ── CAP ── */}
      {/* Cap body */}
      <rect x="17" y="3" width="26" height="14" rx="5" fill="#1d4ed8" />
      {/* Cap brim */}
      <rect x="9" y="16" width="42" height="5" rx="2.5" fill="#1e40af" />
      {/* Cap highlight stripe */}
      <rect x="17" y="12" width="26" height="2.5" rx="1" fill="rgba(255,255,255,0.18)" />
      {/* Button on top */}
      <circle cx="30" cy="4.5" r="2.5" fill="#93c5fd" />

      {/* ── HEAD (rounded square) ── */}
      <rect x="11" y="20" width="38" height="31" rx="10" fill="url(#ext-head)" />
      {/* Shine */}
      <rect x="15" y="23" width="14" height="7" rx="3.5" fill="rgba(255,255,255,0.13)" />

      {/* Left eye */}
      <circle cx="22" cy="34" r="6.5" fill="white" opacity={blinking ? 0.08 : 1} />
      {/* Right eye */}
      <circle cx="38" cy="34" r="6.5" fill="white" opacity={blinking ? 0.08 : 1} />

      {/* Left pupil */}
      {!blinking && <circle cx={22 + ox} cy={34 + oy} r="3.5" fill="#0f172a" />}
      {/* Right pupil */}
      {!blinking && <circle cx={38 + ox} cy={34 + oy} r="3.5" fill="#0f172a" />}

      {/* Mouth */}
      <path d="M 21 44 Q 30 50.5 39 44" stroke="white" strokeWidth="2.4" strokeLinecap="round" />

      {/* ── NECK ── */}
      <rect x="24" y="51" width="12" height="8" rx="3" fill="#1e40af" />

      {/* ── TORSO ── */}
      <rect x="13" y="58" width="34" height="24" rx="8" fill="url(#ext-body)" />
      {/* WM badge */}
      <rect x="20" y="64" width="20" height="12" rx="3.5" fill="rgba(255,255,255,0.18)" />
      <text x="30" y="73.5" textAnchor="middle" fill="white" fontSize="6.5" fontWeight="900" fontStyle="italic" fontFamily="sans-serif">WM</text>

      {/* ── LEFT ARM ── */}
      <rect x="3" y="60" width="9" height="18" rx="4.5" fill="#1d4ed8" />
      {/* Left hand */}
      <circle cx="7.5" cy="80" r="5.5" fill="#2563eb" />

      {/* ── RIGHT ARM ── */}
      <rect x="48" y="60" width="9" height="18" rx="4.5" fill="#1d4ed8" />
      {/* Right hand */}
      <circle cx="52.5" cy="80" r="5.5" fill="#2563eb" />
    </svg>
  );
}

/* ── Main component ── */
export default function BotExternal() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [eyeNorm, setEyeNorm] = useState({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);
  const faceRef = useRef<HTMLDivElement>(null);
  const phrase = useRef(getRandomPhrase());
  const greeting = getGreeting();

  // Show after short delay on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setDismissed(true), 6000);
    return () => clearTimeout(t);
  }, [visible]);

  // Blink randomly
  useEffect(() => {
    const schedule = (): ReturnType<typeof setTimeout> =>
      setTimeout(() => { setBlinking(true); setTimeout(() => setBlinking(false), 120); schedule(); }, 2500 + Math.random() * 3000);
    const t = schedule();
    return () => clearTimeout(t);
  }, []);

  // Mouse tracking → normalised eye offset
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = faceRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const norm = Math.min(dist, 300) / 300;
      setEyeNorm({ x: (dx / dist) * norm, y: (dy / dist) * norm });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="fixed bottom-5 left-5 z-50 flex items-end gap-3 pointer-events-none"
          style={{ maxWidth: 'calc(100vw - 40px)' }}
        >
          {/* Character */}
          <div ref={faceRef} className="flex-shrink-0 drop-shadow-xl">
            <BotCharacter w={56} h={84} eyeNormX={eyeNorm.x} eyeNormY={eyeNorm.y} blinking={blinking} />
          </div>

          {/* Bubble */}
          <motion.div
            initial={{ opacity: 0, x: -12, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.18, duration: 0.35, ease: 'easeOut' }}
            className="pointer-events-auto relative bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)] max-w-[260px] sm:max-w-[300px] mb-2"
          >
            {/* Close */}
            <button
              onClick={() => setDismissed(true)}
              className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-xs leading-none"
              aria-label="Close"
            >
              ×
            </button>
            <p className="text-[13px] font-semibold text-gray-900 pr-4">{greeting}! 👋</p>
            <p className="text-[12px] text-slate-500 mt-1 leading-[1.5] pr-2">{phrase.current}</p>

            {/* Tail */}
            <div
              className="absolute -left-[7px] bottom-[14px] w-3.5 h-3.5 bg-white border-l border-b border-gray-200"
              style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
