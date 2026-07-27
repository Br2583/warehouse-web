'use client';

import { useEffect } from 'react';

export default function CapacitorInit() {
  useEffect(() => {
    const init = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const platform = Capacitor.getPlatform();

        // Status bar: white background matching TopBar, dark icons
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        if (platform === 'android') {
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
          await StatusBar.setOverlaysWebView({ overlay: false });
        }

        // Keyboard: hide the iOS accessory bar (Done/Previous/Next bar)
        const { Keyboard } = await import('@capacitor/keyboard');
        await Keyboard.setAccessoryBarVisible({ isVisible: false });

      } catch {
        // Not in native Capacitor context — browser or SSR
      }
    };
    init();
  }, []);

  return null;
}
