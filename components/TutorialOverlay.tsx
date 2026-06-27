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

const PAD = 10;
const TOOLTIP_W = 288;

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
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [current?.target]);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else onDone();
  };

  const tooltipStyle = (): React.CSSProperties => {
    if (!rect) {
      return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: TOOLTIP_W };
    }
    const pos = current?.position ?? 'bottom';
    const vw = window.innerWidth;
    const clampLeft = (l: number) => Math.max(12, Math.min(l, vw - TOOLTIP_W - 12));

    if (pos === 'bottom') return { position: 'fixed', width: TOOLTIP_W, top: rect.top + rect.height + PAD + 10, left: clampLeft(rect.left + rect.width / 2 - TOOLTIP_W / 2) };
    if (pos === 'top')    return { position: 'fixed', width: TOOLTIP_W, top: rect.top - 160 - PAD, left: clampLeft(rect.left + rect.width / 2 - TOOLTIP_W / 2) };
    if (pos === 'right')  return { position: 'fixed', width: TOOLTIP_W, top: Math.max(12, rect.top + rect.height / 2 - 75), left: rect.left + rect.width + PAD + 10 };
    return                  { position: 'fixed', width: TOOLTIP_W, top: Math.max(12, rect.top + rect.height / 2 - 75), left: rect.left - TOOLTIP_W - PAD - 10 };
  };

  return (
    <div className="fixed inset-0 z-[9999]" onClick={e => e.stopPropagation()}>
      {/* Overlay cutout */}
      {rect ? (
        <>
          <div className="absolute bg-black/60 inset-x-0 top-0" style={{ height: Math.max(0, rect.top - PAD) }} />
          <div className="absolute bg-black/60 inset-x-0 bottom-0" style={{ top: rect.top + rect.height + PAD }} />
          <div className="absolute bg-black/60" style={{ top: rect.top - PAD, left: 0, width: Math.max(0, rect.left - PAD), height: rect.height + PAD * 2 }} />
          <div className="absolute bg-black/60" style={{ top: rect.top - PAD, left: rect.left + rect.width + PAD, right: 0, height: rect.height + PAD * 2 }} />
          <div className="absolute rounded-2xl border-2 border-blue-500 pointer-events-none shadow-[0_0_0_4px_rgba(59,130,246,0.15)]"
            style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }} />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/60" />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.94, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.18 }}
          className="bg-white rounded-2xl shadow-2xl p-5"
          style={tooltipStyle()}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              {step + 1} of {steps.length}
            </span>
            <button onClick={onDone} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="font-bold text-gray-900 text-sm mb-1.5">{current?.title}</h3>
          <p className="text-gray-500 text-xs leading-relaxed">{current?.text}</p>

          {/* Progress dots */}
          <div className="flex gap-1.5 mt-4 mb-1">
            {steps.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-blue-600' : 'w-1.5 bg-gray-200'}`} />
            ))}
          </div>

          <div className="flex items-center justify-between mt-3">
            <button onClick={onDone} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Skip tour
            </button>
            <button
              onClick={next}
              className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {step < steps.length - 1 ? <><span>Next</span><ChevronRight className="w-3.5 h-3.5" /></> : <><span>Done</span><Check className="w-3.5 h-3.5" /></>}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
