// Biometric app lock — fingerprint / Face ID / Windows Hello.
//
// Two backends, one API:
//  · Native app  → @aparajita/capacitor-biometric-auth (Android/iOS prompt).
//  · Web / PWA   → WebAuthn platform authenticator (Face ID, Touch ID, Hello).
//
// This is a LOCK on top of an existing session, not a login: it stops someone who
// picks up an unlocked device. It is verified on the device, not on the server —
// same strength on both backends. Server-verified passkeys are a separate, larger step.
//
// Everything fails OPEN on purpose — a bug or lost credential must never lock a user
// out of their own data.

import { isNativePlatform } from './pick-photo';

const KEY  = 'wm_biometric_lock';
const CRED = 'wm_biometric_cred'; // WebAuthn credential id (base64url), web only

export function biometricLockEnabled(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function setBiometricLockEnabled(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else { localStorage.removeItem(KEY); localStorage.removeItem(CRED); }
  } catch { /* private mode / storage disabled */ }
}

export type BiometryInfo = {
  available: boolean;
  label: string;
  /** '' when available; 'unsupported' (no plugin / no authenticator) or the
   *  platform's own explanation. Used to tell the user WHY it can't be used. */
  reason: string;
};

// ── WebAuthn helpers ────────────────────────────────────────────────────────────
const b64url = {
  encode(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  decode(str: string): Uint8Array<ArrayBuffer> {
    const pad = str.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(pad + '==='.slice((pad.length + 3) % 4));
    const out = new Uint8Array(new ArrayBuffer(bin.length));
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  },
};

function webAuthnSupported(): boolean {
  return typeof window !== 'undefined'
    && typeof window.PublicKeyCredential === 'function'
    && !!navigator.credentials;
}

function platformLabel(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/iPhone|iPad|iPod|Macintosh/.test(ua)) return 'Face ID or Touch ID';
  if (/Windows/.test(ua)) return 'Windows Hello';
  if (/Android/.test(ua)) return 'Fingerprint';
  return 'Biometrics';
}

// ── Public API ──────────────────────────────────────────────────────────────────

/** Whether this device can do biometry, with a label and a reason when it can't. */
export async function checkBiometry(): Promise<BiometryInfo> {
  if (isNativePlatform()) {
    try {
      const { BiometricAuth, BiometryType } = await import('@aparajita/capacitor-biometric-auth');
      const res = await BiometricAuth.checkBiometry();
      let label = 'Biometrics';
      switch (res.biometryType) {
        case BiometryType.faceId:                    label = 'Face ID'; break;
        case BiometryType.touchId:                   label = 'Touch ID'; break;
        case BiometryType.fingerprintAuthentication: label = 'Fingerprint'; break;
        case BiometryType.faceAuthentication:        label = 'Face unlock'; break;
        case BiometryType.irisAuthentication:        label = 'Iris'; break;
      }
      return { available: res.isAvailable, label, reason: res.isAvailable ? '' : (res.reason || '') };
    } catch {
      // Plugin not present in this build → they're running an older APK.
      return { available: false, label: '', reason: 'unsupported' };
    }
  }

  // Web / PWA
  if (!webAuthnSupported()) return { available: false, label: '', reason: 'unsupported' };
  try {
    const ok = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return ok
      ? { available: true, label: platformLabel(), reason: '' }
      : { available: false, label: '', reason: 'unsupported' };
  } catch {
    return { available: false, label: '', reason: 'unsupported' };
  }
}

/**
 * Called when the user switches the lock ON. Native needs nothing beyond a
 * verification; the web must first create a platform credential to check against.
 * Returns true when the lock may be enabled.
 */
export async function enrollBiometric(user: { id: string; email?: string; name?: string }): Promise<boolean> {
  if (isNativePlatform()) return biometricUnlock('Confirm to enable app lock');
  if (!webAuthnSupported()) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = new TextEncoder().encode(user.id);
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Warehouse Manager', id: location.hostname },
        user: { id: userId, name: user.email || user.id, displayName: user.name || user.email || 'User' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60_000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;
    if (!cred) return false;
    localStorage.setItem(CRED, b64url.encode(cred.rawId));
    return true;
  } catch {
    return false; // cancelled or unsupported — don't enable a lock we can't verify
  }
}

/**
 * Prompts for biometry. Returns true when verified — or when verification is
 * impossible (see the fail-open note at the top); false only on an explicit
 * cancel / failed match.
 */
export async function biometricUnlock(reason = 'Unlock Warehouse Manager'): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      const info = await BiometricAuth.checkBiometry();
      if (!info.isAvailable) return true; // nothing to verify against → don't trap the user
      await BiometricAuth.authenticate({
        reason,
        androidTitle: 'Warehouse Manager',
        androidSubtitle: reason,
        allowDeviceCredential: true, // PIN / pattern fallback
        androidConfirmationRequired: false,
        cancelTitle: 'Cancel',
      });
      return true;
    } catch (e: any) {
      const code = String(e?.code || '');
      if (code === 'biometryNotAvailable' || code === 'biometryNotEnrolled') return true;
      return false;
    }
  }

  // Web / PWA
  if (!webAuthnSupported()) return true;
  let stored: string | null = null;
  try { stored = localStorage.getItem(CRED); } catch { /* ignore */ }
  // Credential gone (iOS can evict PWA storage) → let them in rather than trap them.
  if (!stored) return true;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: 'public-key', id: b64url.decode(stored) }],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    return !!assertion;
  } catch (e: any) {
    // The credential no longer exists on this device → stop enforcing a dead lock.
    if (e?.name === 'InvalidStateError' || e?.name === 'NotSupportedError') return true;
    return false;
  }
}
