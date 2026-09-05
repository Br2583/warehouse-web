// Biometric app lock (fingerprint / face) for the native app.
//
// This is a LOCK on top of an existing session, not a replacement for signing in:
// the PocketBase session already persists, so the value here is that picking up an
// unlocked phone no longer grants access to the app.
//
// Everything fails OPEN on purpose — a bug in biometry must never lock a user out
// of their own data. If the plugin is missing, unavailable, or errors, we let them in.

import { isNativePlatform } from './pick-photo';

const KEY = 'wm_biometric_lock';

export function biometricLockEnabled(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function setBiometricLockEnabled(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch { /* private mode / storage disabled */ }
}

export type BiometryInfo = { available: boolean; label: string };

/** Whether this device has usable biometry, plus a human label for the UI. */
export async function checkBiometry(): Promise<BiometryInfo> {
  if (!isNativePlatform()) return { available: false, label: '' };
  try {
    const { BiometricAuth, BiometryType } = await import('@aparajita/capacitor-biometric-auth');
    const res = await BiometricAuth.checkBiometry();
    let label = 'Biometrics';
    switch (res.biometryType) {
      case BiometryType.faceId:            label = 'Face ID'; break;
      case BiometryType.touchId:           label = 'Touch ID'; break;
      case BiometryType.fingerprintAuthentication: label = 'Fingerprint'; break;
      case BiometryType.faceAuthentication: label = 'Face unlock'; break;
      case BiometryType.irisAuthentication: label = 'Iris'; break;
    }
    return { available: res.isAvailable, label };
  } catch {
    return { available: false, label: '' };
  }
}

/**
 * Prompts for biometry. Returns true when the user is verified (or when biometry
 * can't run at all — see the fail-open note above); false only on an explicit
 * failed/cancelled prompt.
 */
export async function biometricUnlock(reason = 'Unlock Warehouse Manager'): Promise<boolean> {
  if (!isNativePlatform()) return true;
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
    // Device can no longer do biometry (enrollment removed, hardware gone) → let them in
    // rather than trapping them behind a prompt that can never succeed.
    if (code === 'biometryNotAvailable' || code === 'biometryNotEnrolled') return true;
    // Explicit cancel or a failed match → stay locked.
    return false;
  }
}
