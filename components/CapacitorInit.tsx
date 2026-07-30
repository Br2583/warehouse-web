'use client';

import { useEffect } from 'react';
import { pb } from '@/lib/pb';

const FCM_TOKEN_KEY = 'pending_fcm_token';
const FCM_PLATFORM_KEY = 'pending_fcm_platform';

// Debug keys — read by the profile diagnostics panel
const DBG_INIT_AT = 'fcm_dbg_init_at';
const DBG_REG_AT = 'fcm_dbg_reg_at';
const DBG_AUTH_VALID = 'fcm_dbg_auth_valid';
const DBG_SAVE_RESULT = 'fcm_dbg_save_result';

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
      } catch { /* channel already exists — ignore */ }
    }

    localStorage.setItem(DBG_INIT_AT, new Date().toISOString());

    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive !== 'granted') {
      localStorage.setItem(DBG_SAVE_RESULT, 'permission-denied:' + permStatus.receive);
      return;
    }

    // Listeners BEFORE register() to avoid missing the event
    PushNotifications.addListener('registration', async (token) => {
      const fcmToken = token.value;
      localStorage.setItem(FCM_TOKEN_KEY, fcmToken);
      localStorage.setItem(FCM_PLATFORM_KEY, platform);
      localStorage.setItem(DBG_REG_AT, new Date().toISOString());
      localStorage.setItem(DBG_AUTH_VALID, String(pb.authStore.isValid));

      // First attempt immediately
      if (pb.authStore.isValid) {
        const ok = await saveTokenToBackend(fcmToken, platform);
        localStorage.setItem(DBG_SAVE_RESULT, ok ? 'saved-immediately' : 'save-failed-retrying');
        if (ok) {
          localStorage.removeItem(FCM_TOKEN_KEY);
          localStorage.removeItem(FCM_PLATFORM_KEY);
          return;
        }
      } else {
        localStorage.setItem(DBG_SAVE_RESULT, 'auth-not-valid-at-registration');
      }

      // Start retry loop — handles both "auth not ready yet" and transient failures
      const stopRetry = startTokenRetry(fcmToken, platform);

      // Also hook into future auth changes (covers first-time login flow)
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
      // Marker written before any try-catch — if missing, the component never mounted
      localStorage.setItem('fcm_dbg_component_mounted', new Date().toISOString());

      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;

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

      // Retry any pending token from a previous session
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
        // Whether it saved or not, also start a retry loop to catch cases where
        // auth hasn't been fully restored by the time this effect runs
        if (localStorage.getItem(FCM_TOKEN_KEY)) {
          startTokenRetry(pendingToken, pendingPlatform);
        }
      }

      // Push init in its own try-catch with debug output
      try {
        await initPushNotifications(platform);
      } catch (e) {
        localStorage.setItem('fcm_dbg_outer_error', String(e));
      }
    };

    init();
  }, []);

  return null;
}
