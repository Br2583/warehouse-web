// Google sign-in via PocketBase's OAuth2 (provider already enabled in PB admin).
//
// Web/PWA: PocketBase's own all-in-one flow calls window.open only AFTER awaiting
// the auth-methods request + realtime subscribe, by which point the browser no
// longer treats it as part of the click and blocks the popup (the "click it ten
// times" symptom). So we open the window synchronously here and hand it to PB
// through urlCallback.
//
// Native (Capacitor WebView): a popup can't post back, so we open the provider URL
// in the in-app browser and let PocketBase finish over its realtime channel.

import { pb } from './pb';
import { isNativePlatform } from './pick-photo';

export async function signInWithGoogle() {
  if (isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser');
    try {
      return await pb.collection('users').authWithOAuth2({
        provider: 'google',
        urlCallback: (url: string) => { Browser.open({ url }); },
      });
    } finally {
      Browser.close().catch(() => {});
    }
  }

  // IMPORTANT: no await before this line — it must run inside the click gesture.
  const popup = window.open('', 'wm-google-auth', 'width=500,height=640');
  if (!popup) throw new Error('POPUP_BLOCKED');

  let timer: ReturnType<typeof setInterval> | undefined;
  try {
    const authPromise = pb.collection('users').authWithOAuth2({
      provider: 'google',
      urlCallback: (url: string) => { popup.location.href = url; },
    });
    // If the user closes the window, stop waiting instead of hanging forever.
    const closed = new Promise<never>((_, reject) => {
      timer = setInterval(() => {
        if (popup.closed) reject(new Error('POPUP_CLOSED'));
      }, 500);
    });
    return await Promise.race([authPromise, closed]);
  } finally {
    if (timer) clearInterval(timer);
    try { if (!popup.closed) popup.close(); } catch { /* cross-origin while on google.com */ }
  }
}
