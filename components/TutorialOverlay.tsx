'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check } from 'lucide-react';

export interface TutorialStep {
  target?: string;
  title: string;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const TOOLTIP_W = 300;
const TOOLTIP_H = 190; // conservative estimate for clamping
const MARGIN = 12;

export default function TutorialOverlay({
  steps,
  onDone,
}: {
  steps: TutorialStep[];
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<TargetRect | null>(null);

  const current = steps[step];

  const measure = useCallback(() => {
    if (!current?.target) { setRect(null); return; }
    const el = document.querySelector(`[data-tutorial="${current.target}"]`);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    // Clamp the highlight rect to the visible viewport so it never overflows
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const top = Math.max(0, r.top);
    const left = Math.max(0, r.left);
    const right = Math.min(vw, r.right);
    const bottom = Math.min(vh, r.bottom);
    setRect({ top, left, width: right - left, height: bottom - top });
    // Only scroll if the element is mostly off screen
    if (r.top < 0 || r.bottom > vh) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [current?.target]);

  useEffect(() => {
    // Small delay so layout settles before measuring
    const t = setTimeout(measure, 80);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); };
  }, [measure]);

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else onDone();
  };

  const tooltipStyle = (): React.CSSProperties => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // No target — center on screen
    if (!rect) {
      return {
        position: 'fixed',
        width: TOOLTIP_W,
        top: Math.max(MARGIN, vh / 2 - TOOLTIP_H / 2),
        left: Math.max(MARGIN, vw / 2 - TOOLTIP_W / 2),
      };
    }

    const clampLeft = (l: number) =>
      Math.max(MARGIN, Math.min(l, vw - TOOLTIP_W - MARGIN));

    const centerLeft = clampLeft(rect.left + rect.width / 2 - TOOLTIP_W / 2);

    // Available space in each direction
    const spaceBelow = vh - (rect.top + rect.height + PAD);
    const spaceAbove = rect.top - PAD;

    // If the highlighted element is very tall (fills most of the screen),
    // pin the tooltip to the bottom of the viewport, centered
    const elementIsLarge = rect.height > vh * 0.45;
    if (elementIsLarge) {
      return {
        position: 'fixed',
        width: TOOLTIP_W,
        bottom: MARGIN,
        left: clampLeft(vw / 2 - TOOLTIP_W / 2),
      };
    }

    const preferredPos = current?.position ?? 'bottom';

    // Bottom: enough space below?
    if (preferredPos === 'bottom' && spaceBelow >= TOOLTIP_H + 4) {
      return {
        position: 'fixed',
        width: TOOLTIP_W,
        top: rect.top + rect.height + PAD + 8,
        left: centerLeft,
      };
    }

    // Top: enough space above?
    if ((preferredPos === 'top' || spaceBelow < TOOLTIP_H + 4) && spaceAbove >= TOOLTIP_H + 4) {
      return {
        position: 'fixed',
        width: TOOLTIP_W,
        top: rect.top - TOOLTIP_H - PAD - 8,
        left: centerLeft,
      };
    }

    // Right
    if (preferredPos === 'right' && rect.left + rect.width + PAD + TOOLTIP_W + MARGIN <= vw) {
      return {
        position: 'fixed',
        width: TOOLTIP_W,
        top: Math.max(MARGIN, Math.min(rect.top + rect.height / 2 - TOOLTIP_H / 2, vh - TOOLTIP_H - MARGIN)),
        left: rect.left + rect.width + PAD + 8,
      };
    }

    // Left
    if (preferredPos === 'left' && rect.left - PAD - TOOLTIP_W - 8 >= MARGIN) {
      return {
        position: 'fixed',
        width: TOOLTIP_W,
        top: Math.max(MARGIN, Math.min(rect.top + rect.height / 2 - TOOLTIP_H / 2, vh - TOOLTIP_H - MARGIN)),
        left: rect.left - TOOLTIP_W - PAD - 8,
      };
    }

    // Fallback: most space wins, pinned to viewport edge
    if (spaceBelow >= spaceAbove) {
      const top = rect.top + rect.height + PAD + 8;
      return {
        position: 'fixed',
        width: TOOLTIP_W,
        // Clamp so it never goes off the bottom
        top: Math.min(top, vh - TOOLTIP_H - MARGIN),
        left: centerLeft,
      };
    }

    return {
      position: 'fixed',
      width: TOOLTIP_W,
      top: Math.max(MARGIN, rect.top - TOOLTIP_H - PAD - 8),
      left: centerLeft,
    };
  };

  // Compute the highlight box clamped to viewport
  const highlightBox = rect
    ? {
        top: Math.max(0, rect.top - PAD),
        left: Math.max(0, rect.left - PAD),
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[9999]" onClick={e => e.stopPropagation()}>
      {/* Overlay cutout */}
      {highlightBox ? (
        <>
          {/* Top strip */}
          <div className="absolute bg-black/60 inset-x-0 top-0"
            style={{ height: Math.max(0, highlightBox.top) }} />
          {/* Bottom strip */}
          <div className="absolute bg-black/60 inset-x-0 bottom-0"
            style={{ top: highlightBox.top + highlightBox.height }} />
          {/* Left strip */}
          <div className="absolute bg-black/60"
            style={{ top: highlightBox.top, left: 0, width: Math.max(0, highlightBox.left), height: highlightBox.height }} />
          {/* Right strip */}
          <div className="absolute bg-black/60"
            style={{ top: highlightBox.top, left: highlightBox.left + highlightBox.width, right: 0, height: highlightBox.height }} />
          {/* Blue border ring */}
          <div
            className="absolute rounded-2xl border-2 border-blue-500 pointer-events-none"
            style={{
              top: highlightBox.top,
              left: highlightBox.left,
              width: highlightBox.width,
              height: highlightBox.height,
              boxShadow: '0 0 0 4px rgba(59,130,246,0.2)',
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/60" />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.93, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93 }}
          transition={{ duration: 0.18 }}
          className="bg-white rounded-2xl shadow-2xl p-5"
          style={tooltipStyle()}
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              {step + 1} of {steps.length}
            </span>
            <button
              onClick={onDone}
              className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
              aria-label="Close tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="font-bold text-gray-900 text-sm mb-1.5 leading-snug">
            {current?.title}
          </h3>
          <p className="text-gray-500 text-xs leading-relaxed">
            {current?.text}
          </p>

          {/* Progress dots */}
          <div className="flex gap-1.5 mt-4 mb-3">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-blue-600' : 'w-1.5 bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={onDone}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip tour
            </button>
            <button
              onClick={next}
              className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 active:scale-95 transition-all"
            >
              {step < steps.length - 1
                ? <><span>Next</span><ChevronRight className="w-3.5 h-3.5" /></>
                : <><span>Done</span><Check className="w-3.5 h-3.5" /></>}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
