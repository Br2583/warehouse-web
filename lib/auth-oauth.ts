// Google sign-in via PocketBase's OAuth2 (provider already enabled in PB admin).
//
// Web/PWA: the default all-in-one flow opens a popup and completes automatically.
// Native (Capacitor WebView): a popup can't post back, so we open the provider URL
// in the in-app browser and let PocketBase finish over its realtime channel, then
// close the browser. Either way pb.authStore ends up populated on success.

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
      // Whether it succeeded, cancelled, or failed, dismiss the in-app browser.
      Browser.close().catch(() => {});
    }
  }
  return pb.collection('users').authWithOAuth2({ provider: 'google' });
}
