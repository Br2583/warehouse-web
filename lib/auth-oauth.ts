// Google sign-in via PocketBase OAuth2 — manual redirect ("code") flow.
//
// We deliberately do NOT use pb.authWithOAuth2()'s all-in-one flow: it delivers the
// result over PocketBase's realtime channel, and on this deployment the realtime
// subscription POST is answered by a different instance than the one holding the SSE
// connection ("Invalid realtime client", 400) — so it could never complete. The
// redirect flow needs no realtime and no popup, so it is immune to that and to
// popup blockers.
//
// Flow: listAuthMethods() → stash PKCE verifier + state → send the browser to Google
// → Google returns to /auth/google?code=…&state=… → authWithOAuth2Code() there.

import { pb } from './pb';
import { isNativePlatform } from './pick-photo';

const REDIRECT_PATH = '/auth/google';
const K_VERIFIER = 'wm_g_verifier';
const K_STATE    = 'wm_g_state';
const K_RETURN   = 'wm_g_returnto';

export function googleRedirectUrl(): string {
  return `${window.location.origin}${REDIRECT_PATH}`;
}

/** Sends the browser to Google. Never resolves normally — the page navigates away. */
export async function startGoogleSignIn(returnTo?: string): Promise<void> {
  const methods = await pb.collection('users').listAuthMethods();
  const provider = methods.oauth2?.providers?.find(p => p.name === 'google');
  if (!provider) throw new Error('Google sign-in is not enabled.');

  sessionStorage.setItem(K_VERIFIER, provider.codeVerifier);
  sessionStorage.setItem(K_STATE, provider.state);
  if (returnTo) sessionStorage.setItem(K_RETURN, returnTo);
  else sessionStorage.removeItem(K_RETURN);

  // PocketBase hands back an authURL that ends in "&redirect_uri=" for us to complete.
  const url = provider.authURL + encodeURIComponent(googleRedirectUrl());

  if (isNativePlatform()) {
    // Google refuses OAuth inside embedded WebViews ("disallowed_useragent"), so it
    // must run in the system browser (a Custom Tab, which Google does allow). The
    // https App Link on managerwarehouse.cc brings the ?code back into the app, where
    // CapacitorInit's appUrlOpen handler routes it to /auth/google.
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
    return;
  }
  window.location.href = url;
}

/** Completes the flow on the callback page. Returns the authenticated record. */
export async function completeGoogleSignIn(code: string, state: string) {
  const verifier = sessionStorage.getItem(K_VERIFIER);
  const expected = sessionStorage.getItem(K_STATE);
  if (!verifier || !expected) throw new Error('Sign-in session expired. Try again.');
  if (state !== expected) throw new Error('Sign-in could not be verified. Try again.');

  const auth = await pb.collection('users').authWithOAuth2Code(
    'google', code, verifier, googleRedirectUrl(),
  );
  sessionStorage.removeItem(K_VERIFIER);
  sessionStorage.removeItem(K_STATE);
  return auth;
}

export function consumeGoogleReturnTo(): string | null {
  const v = sessionStorage.getItem(K_RETURN);
  sessionStorage.removeItem(K_RETURN);
  return v;
}
