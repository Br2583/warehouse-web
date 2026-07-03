'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGreeting, getRandomPhrase } from '@/lib/bot-phrases';

/* ─────────────────────────────────────────────
   Bot character — viewBox 0 0 60 88
   Inspired by classic round-head robot icon:
   antenna · round head with ear bumps ·
   visor with tracking eyes · teardrop body
───────────────────────────────────────────── */
function BotCharacter({
  w = 56, h = 82,
  eyeNormX = 0, eyeNormY = 0,
  blinking = false,
}: {
  w?: number; h?: number;
  eyeNormX?: number; eyeNormY?: number;
  blinking?: boolean;
}) {
  const maxShift = 2.2;
  const ox = eyeNormX * maxShift;
  const oy = eyeNormY * maxShift;

  return (
    <svg width={w} height={h} viewBox="0 0 60 88" fill="none">
      {/* ── ANTENNA ── */}
      <line x1="30" y1="8" x2="30" y2="15" stroke="#1d4ed8" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="30" cy="5.5" r="3.5" fill="#60a5fa" />

      {/* ── EARS (side bumps, drawn first so head sits on top) ── */}
      <circle cx="8"  cy="30" r="7.5" fill="#1d4ed8" />
      <circle cx="52" cy="30" r="7.5" fill="#1d4ed8" />

      {/* ── HEAD ── */}
      <circle cx="30" cy="30" r="21" fill="#1d4ed8" />
      {/* shine */}
      <ellipse cx="23" cy="21" rx="8" ry="5" fill="rgba(255,255,255,0.12)" transform="rotate(-20 23 21)" />

      {/* ── VISOR (white pill across head) ── */}
      <rect x="11" y="23" width="38" height="15" rx="7.5" fill="white" />

      {/* ── EYES inside visor ── */}
      {!blinking ? (
        <>
          <circle cx={22 + ox} cy={30.5 + oy} r="5" fill="#0f172a" />
          <circle cx={38 + ox} cy={30.5 + oy} r="5" fill="#0f172a" />
        </>
      ) : (
        <>
          <rect x={17 + ox} y="29" width="10" height="3.5" rx="1.75" fill="#0f172a" />
          <rect x={33 + ox} y="29" width="10" height="3.5" rx="1.75" fill="#0f172a" />
        </>
      )}

      {/* ── BODY (teardrop / shield) ── */}
      <path d="M 18 53 L 42 53 C 48 63 41 79 30 84 C 19 79 12 63 18 53 Z" fill="#1d4ed8" />
      {/* body shine */}
      <ellipse cx="30" cy="58" rx="9" ry="3.5" fill="rgba(255,255,255,0.1)" />

      {/* WM text */}
      <text
        x="30" y="72"
        textAnchor="middle"
        fill="white"
        fontSize="9.5"
        fontWeight="900"
        fontStyle="italic"
        fontFamily="system-ui, sans-serif"
      >WM</text>
    </svg>
  );
}

/* ── Main component ── */
export default function BotExternal() {
  const [visible, setVisible]   = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [eyeNorm, setEyeNorm]   = useState({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);
  const faceRef = useRef<HTMLDivElement>(null);
  const phrase  = useRef(getRandomPhrase());
  const greeting = getGreeting();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setDismissed(true), 6000);
    return () => clearTimeout(t);
  }, [visible]);

  useEffect(() => {
    const schedule = (): ReturnType<typeof setTimeout> =>
      setTimeout(() => { setBlinking(true); setTimeout(() => setBlinking(false), 130); schedule(); }, 2500 + Math.random() * 3000);
    const t = schedule();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = faceRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = e.clientX - cx;
      const dy   = e.clientY - cy;
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
          <div ref={faceRef} className="flex-shrink-0 drop-shadow-xl">
            <BotCharacter w={56} h={82} eyeNormX={eyeNorm.x} eyeNormY={eyeNorm.y} blinking={blinking} />
          </div>

          <motion.div
            initial={{ opacity: 0, x: -12, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.18, duration: 0.35, ease: 'easeOut' }}
            className="pointer-events-auto relative bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)] max-w-[260px] sm:max-w-[300px] mb-3"
          >
            <button
              onClick={() => setDismissed(true)}
              className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-xs leading-none"
              aria-label="Close"
            >×</button>
            <p className="text-[13px] font-semibold text-gray-900 pr-4">{greeting}! 👋</p>
            <p className="text-[12px] text-slate-500 mt-1 leading-[1.5] pr-2">{phrase.current}</p>
            <div className="absolute -left-[7px] bottom-[14px] w-3.5 h-3.5 bg-white border-l border-b border-gray-200"
              style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
