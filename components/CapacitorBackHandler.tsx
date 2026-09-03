'use client';

import { useEffect } from 'react';
import { popOverlay } from '@/lib/overlay-back';

export default function CapacitorBackHandler() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const setup = async () => {
      try {
        const { App } = await import('@capacitor/app');
        const listener = await App.addListener('backButton', ({ canGoBack }) => {
          // 1) Close the top open overlay (modal/sheet/form/lightbox) first.
          if (popOverlay()) return;
          // 2) Otherwise walk the navigation history, or exit at the root.
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
        cleanup = () => listener.remove();
      } catch {
        // Not running inside Capacitor — browser/web, ignore silently
      }
    };
    setup();
    return () => cleanup?.();
  }, []);

  return null;
}
