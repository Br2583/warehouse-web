'use client';

import { useEffect } from 'react';
import { pb } from '@/lib/pb';

const FCM_TOKEN_KEY = 'pending_fcm_token';
const FCM_PLATFORM_KEY = 'pending_fcm_platform';

async function saveTokenToBackend(token: string, platform: string): Promise<boolean> {
  const authToken = pb.authStore.token;
  if (!authToken) return false;
  try {
    const res = await fetch('/api/notifications/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ token, platform }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function initPushNotifications(platform: string) {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    if (platform === 'android') {
      await PushNotifications.createChannel({
        id: 'warehouse-high',
        name: 'Warehouse Notifications',
        importance: 5,
        vibration: true,
        sound: 'default',
        visibility: 1,
      });
    }

    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive !== 'granted') return;

    // Add listeners BEFORE calling register() to avoid missing the event
    PushNotifications.addListener('registration', async (token) => {
      localStorage.setItem(FCM_TOKEN_KEY, token.value);
      localStorage.setItem(FCM_PLATFORM_KEY, platform);

      const saved = await saveTokenToBackend(token.value, platform);

      if (!saved) {
        const unsub = pb.authStore.onChange(async () => {
          if (!pb.authStore.isValid) return;
          const ok = await saveTokenToBackend(token.value, platform);
          if (ok) {
            localStorage.removeItem(FCM_TOKEN_KEY);
            localStorage.removeItem(FCM_PLATFORM_KEY);
            unsub();
          }
        });
      } else {
        localStorage.removeItem(FCM_TOKEN_KEY);
        localStorage.removeItem(FCM_PLATFORM_KEY);
      }
    });

    PushNotifications.addListener('registrationError', () => {
      // Token registration failed — clear any cached token so next open tries fresh
      localStorage.removeItem(FCM_TOKEN_KEY);
      localStorage.removeItem(FCM_PLATFORM_KEY);
    });

    PushNotifications.addListener('pushNotificationReceived', (_notification) => {
      // Foreground — in-app badges handle unread counts
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const route = action.notification.data?.route as string | undefined;
      if (route && typeof window !== 'undefined') {
        window.location.href = route;
      }
    });

    await PushNotifications.register();

  } catch {
    // Push notifications not available in this environment
  }
}

export default function CapacitorInit() {
  useEffect(() => {
    const init = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const platform = Capacitor.getPlatform();

        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        if (platform === 'android') {
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
          await StatusBar.setOverlaysWebView({ overlay: false });
        }

        const { Keyboard } = await import('@capacitor/keyboard');
        await Keyboard.setAccessoryBarVisible({ isVisible: false });

        // Retry pending token first (user opened app after a login)
        const pendingToken = localStorage.getItem(FCM_TOKEN_KEY);
        const pendingPlatform = localStorage.getItem(FCM_PLATFORM_KEY) || platform;
        if (pendingToken && pb.authStore.isValid) {
          const ok = await saveTokenToBackend(pendingToken, pendingPlatform);
          if (ok) {
            localStorage.removeItem(FCM_TOKEN_KEY);
            localStorage.removeItem(FCM_PLATFORM_KEY);
          }
        }

        await initPushNotifications(platform);

      } catch {
        // Not in native Capacitor context
      }
    };

    init();
  }, []);

  return null;
}
