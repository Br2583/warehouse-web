'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

// Retry every intervalMs for up to maxAttempts, stopping as soon as it succeeds.
// Returns a cleanup function to cancel.
function startTokenRetry(fcmToken: string, platform: string): () => void {
  let attempts = 0;
  const MAX = 12; // 12 × 5s = 60s total window
  const INTERVAL = 5000;

  const id = setInterval(async () => {
    attempts++;
    if (attempts > MAX) { clearInterval(id); return; }
    if (!pb.authStore.isValid) return;

    const ok = await saveTokenToBackend(fcmToken, platform);
    if (ok) {
      localStorage.removeItem(FCM_TOKEN_KEY);
      localStorage.removeItem(FCM_PLATFORM_KEY);
      clearInterval(id);
    }
  }, INTERVAL);

  return () => clearInterval(id);
}

async function initPushNotifications(platform: string) {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    if (platform === 'android') {
      try {
        await PushNotifications.createChannel({
          id: 'warehouse-high',
          name: 'Warehouse Notifications',
          importance: 5,
          vibration: true,
          sound: 'default',
          visibility: 1,
        });
      } catch { /* channel already exists */ }
    }

    const permStatus = await PushNotifications.requestPermissions();
    // 'prompt' means not yet decided — Android will show the dialog and we get the result.
    // If still not granted after the dialog, we bail silently and retry on next app open.
    if (permStatus.receive !== 'granted') return;

    PushNotifications.addListener('registration', async (token) => {
      const fcmToken = token.value;
      localStorage.setItem(FCM_TOKEN_KEY, fcmToken);
      localStorage.setItem(FCM_PLATFORM_KEY, platform);

      if (pb.authStore.isValid) {
        const ok = await saveTokenToBackend(fcmToken, platform);
        if (ok) {
          localStorage.removeItem(FCM_TOKEN_KEY);
          localStorage.removeItem(FCM_PLATFORM_KEY);
          return;
        }
      }

      // Auth not ready or save failed — retry loop + onChange covers both cases
      const stopRetry = startTokenRetry(fcmToken, platform);

      const unsub = pb.authStore.onChange(async () => {
        if (!pb.authStore.isValid) return;
        const ok = await saveTokenToBackend(fcmToken, platform);
        if (ok) {
          localStorage.removeItem(FCM_TOKEN_KEY);
          localStorage.removeItem(FCM_PLATFORM_KEY);
          stopRetry();
          unsub();
        }
      });
    });

    PushNotifications.addListener('registrationError', () => {
      localStorage.removeItem(FCM_TOKEN_KEY);
      localStorage.removeItem(FCM_PLATFORM_KEY);
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
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;

      // Deep link handler — opens the scanned QR path inside the app
      try {
        const { App } = await import('@capacitor/app');
        App.addListener('appUrlOpen', (event) => {
          try {
            const url = new URL(event.url);
            if (url.hostname === 'managerwarehouse.cc') {
              router.push(url.pathname + url.search);
            }
          } catch { /* malformed URL */ }
        });
      } catch { /* App plugin not available */ }

      const platform = Capacitor.getPlatform();

      // StatusBar + Keyboard in their own try-catch — must NOT block push init
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        if (platform === 'android') {
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
          await StatusBar.setOverlaysWebView({ overlay: false });
        }
        const { Keyboard } = await import('@capacitor/keyboard');
        await Keyboard.setAccessoryBarVisible({ isVisible: false });
      } catch { /* UI plugins optional — never block push */ }

      // Retry any pending token from a previous session before calling register() again
      const pendingToken = localStorage.getItem(FCM_TOKEN_KEY);
      const pendingPlatform = localStorage.getItem(FCM_PLATFORM_KEY) || platform;
      if (pendingToken) {
        if (pb.authStore.isValid) {
          const ok = await saveTokenToBackend(pendingToken, pendingPlatform);
          if (ok) {
            localStorage.removeItem(FCM_TOKEN_KEY);
            localStorage.removeItem(FCM_PLATFORM_KEY);
          }
        }
        if (localStorage.getItem(FCM_TOKEN_KEY)) {
          startTokenRetry(pendingToken, pendingPlatform);
        }
      }

      await initPushNotifications(platform);
    };

    init();
  }, []);

  return null;
}
