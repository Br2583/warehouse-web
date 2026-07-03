'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGreeting, getRandomPhrase } from '@/lib/bot-phrases';

/* ── SVG face with eyes that follow the mouse ── */
function BotFace({ size = 56, eyeOffsetX = 0, eyeOffsetY = 0, blinking = false }: {
  size?: number;
  eyeOffsetX?: number;
  eyeOffsetY?: number;
  blinking?: boolean;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  const eyeR = size * 0.115;
  const pupilR = size * 0.065;
  const maxOff = size * 0.055;
  const ox = Math.max(-maxOff, Math.min(maxOff, eyeOffsetX));
  const oy = Math.max(-maxOff, Math.min(maxOff, eyeOffsetY));

  const leyX = cx - size * 0.22;
  const reyX = cx + size * 0.22;
  const eyY  = cy - size * 0.07;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="bg-ext" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>
        <radialGradient id="shine-ext" cx="35%" cy="25%" r="55%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* Head */}
      <circle cx={cx} cy={cy} r={r - 1} fill="url(#bg-ext)" />
      <circle cx={cx} cy={cy} r={r - 1} fill="url(#shine-ext)" />

      {/* Left eye white */}
      <circle cx={leyX} cy={eyY} r={eyeR} fill="white" opacity={blinking ? 0.1 : 1} />
      {/* Right eye white */}
      <circle cx={reyX} cy={eyY} r={eyeR} fill="white" opacity={blinking ? 0.1 : 1} />

      {/* Left pupil */}
      {!blinking && (
        <circle cx={leyX + ox} cy={eyY + oy} r={pupilR} fill="#0f172a" />
      )}
      {/* Right pupil */}
      {!blinking && (
        <circle cx={reyX + ox} cy={eyY + oy} r={pupilR} fill="#0f172a" />
      )}

      {/* Mouth */}
      <path
        d={`M ${cx - size * 0.18} ${cy + size * 0.2} Q ${cx} ${cy + size * 0.33} ${cx + size * 0.18} ${cy + size * 0.2}`}
        stroke="white"
        strokeWidth={size * 0.045}
        strokeLinecap="round"
        fill="none"
        opacity={0.9}
      />

      {/* Antenna */}
      <line x1={cx} y1={2} x2={cx} y2={size * 0.14} stroke="white" strokeWidth={size * 0.045} strokeLinecap="round" opacity={0.6} />
      <circle cx={cx} cy={2} r={size * 0.055} fill="#60a5fa" />
    </svg>
  );
}

/* ── Main component ── */
export default function BotExternal() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [eyeOff, setEyeOff] = useState({ x: 0, y: 0 });
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
    const blink = () => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 120);
    };
    const schedule = () => setTimeout(() => { blink(); schedule(); }, 2500 + Math.random() * 3000);
    const t = schedule();
    return () => clearTimeout(t);
  }, []);

  // Mouse tracking → move eyes
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = faceRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const maxDist = 300;
      const factor = Math.min(dist, maxDist) / maxDist;
      setEyeOff({ x: (dx / dist || 0) * factor * 3.5, y: (dy / dist || 0) * factor * 3.5 });
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
          {/* Face */}
          <div ref={faceRef} className="flex-shrink-0 drop-shadow-xl">
            <BotFace size={56} eyeOffsetX={eyeOff.x} eyeOffsetY={eyeOff.y} blinking={blinking} />
          </div>

          {/* Bubble */}
          <motion.div
            initial={{ opacity: 0, x: -12, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.18, duration: 0.35, ease: 'easeOut' }}
            className="pointer-events-auto relative bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)] max-w-[260px] sm:max-w-[300px]"
          >
            {/* Close */}
            <button
              onClick={() => setDismissed(true)}
              className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-xs leading-none"
              aria-label="Close"
            >
              ×
            </button>

            <p className="text-[13px] font-semibold text-gray-900 pr-4">
              {greeting}! 👋
            </p>
            <p className="text-[12px] text-slate-500 mt-1 leading-[1.5] pr-2">
              {phrase.current}
            </p>

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
