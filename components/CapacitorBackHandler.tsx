'use client';

import { useEffect } from 'react';

export default function CapacitorBackHandler() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const setup = async () => {
      try {
        const { App } = await import('@capacitor/app');
        const listener = await App.addListener('backButton', ({ canGoBack }) => {
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
