'use client';

import { useState, useRef } from 'react';
import {
  BuildingOffice2Icon, QrCodeIcon, ArchiveBoxIcon,
  ClipboardDocumentListIcon, CheckCircleIcon, XMarkIcon,
} from '@heroicons/react/24/outline';

interface Slide {
  icon: React.ReactNode;
  title: string;
  body: string;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    icon: <BuildingOffice2Icon className="w-14 h-14" />,
    title: 'Welcome to Warehouse Manager',
    body: 'Your complete tool for managing vaults, work orders, and your team — from any device.',
    accent: '#2563eb',
  },
  {
    icon: <QrCodeIcon className="w-14 h-14" />,
    title: 'Scan QR Codes Instantly',
    body: 'Tap the menu icon → Scan QR Code. Point the camera at any vault label and open it immediately.',
    accent: '#7c3aed',
  },
  {
    icon: <ArchiveBoxIcon className="w-14 h-14" />,
    title: 'Track Every Vault',
    body: 'View vaults on the grid map or list. Add photos, status, client info, and generate QR labels.',
    accent: '#059669',
  },
  {
    icon: <ClipboardDocumentListIcon className="w-14 h-14" />,
    title: 'Manage Work Orders',
    body: 'Create and assign cleaning, restoration, and delivery tasks. Your team sees them instantly.',
    accent: '#d97706',
  },
  {
    icon: <CheckCircleIcon className="w-14 h-14" />,
    title: "You're all set!",
    body: 'Everything is ready. Find help anytime in the Support section if you need it.',
    accent: '#16a34a',
  },
];

interface TutorialProps {
  onDismiss: () => void;
}

export default function Tutorial({ onDismiss }: TutorialProps) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const next = () => {
    if (isLast) { onDismiss(); return; }
    setIndex(i => i + 1);
  };

  const prev = () => setIndex(i => Math.max(0, i - 1));

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -50) next();
    else if (dx > 50) prev();
    touchStartX.current = null;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950/90 backdrop-blur-sm px-4">
      <div
        className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Accent bar */}
        <div className="h-1.5 w-full" style={{ backgroundColor: slide.accent }} />

        {/* Skip */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-300 hover:text-gray-500 transition-colors"
          aria-label="Skip tutorial"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="px-8 pt-8 pb-6 flex flex-col items-center text-center min-h-[340px]">
          {/* Icon */}
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6"
            style={{ backgroundColor: slide.accent + '18', color: slide.accent }}
          >
            {slide.icon}
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-3 leading-snug">{slide.title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed">{slide.body}</p>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex flex-col gap-4">
          {/* Dots */}
          <div className="flex justify-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === index ? 20 : 8,
                  height: 8,
                  backgroundColor: i === index ? slide.accent : '#e5e7eb',
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            {index > 0 && (
              <button
                onClick={prev}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold transition-colors active:scale-95"
              style={{ backgroundColor: slide.accent }}
            >
              {isLast ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
