'use client';

import { useEffect } from 'react';
import { pb } from '@/lib/pb';

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

        // Push notifications
        await initPushNotifications(platform);

      } catch {
        // Not in native Capacitor context — browser or SSR
      }
    };
    init();
  }, []);

  return null;
}

async function initPushNotifications(platform: string) {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Request permission
    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive !== 'granted') return;

    // Register with FCM
    await PushNotifications.register();

    // When FCM returns a token — save to our backend
    PushNotifications.addListener('registration', async (token) => {
      const authToken = pb.authStore.token;
      if (!authToken) return;

      try {
        await fetch('/api/notifications/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ token: token.value, platform }),
        });
      } catch {
        // Silently fail — non-critical
      }
    });

    // Notification received while app is in foreground — handled by in-app UI
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      // The app is open — the in-app BottomNav badge already shows unread counts
      // We can optionally show a toast here in the future
      console.info('[Push] Received in foreground:', notification.title);
    });

    // User taps a notification — navigate to the right route
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const route = action.notification.data?.route as string | undefined;
      if (route && typeof window !== 'undefined') {
        window.location.href = route;
      }
    });

  } catch {
    // Push notifications not available (e.g. missing google-services.json in dev)
  }
}
