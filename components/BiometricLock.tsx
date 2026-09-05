'use client';

// Full-screen biometric lock for the native app. Covers the UI until the user
// verifies with fingerprint / face (or their device PIN). Only ever active when the
// user turned it on in Settings AND we're running natively.
//
// Safety: there is always a "Sign out" escape, and lib/biometric fails open, so a
// broken sensor can never permanently lock someone out of their account.

import { useCallback, useEffect, useRef, useState } from 'react';
import { biometricLockEnabled, biometricUnlock } from '@/lib/biometric';
import { isNativePlatform } from '@/lib/pick-photo';
import { useAuth } from '@/lib/auth-context';

const RELOCK_AFTER_MS = 30_000; // re-lock only if backgrounded longer than this

export default function BiometricLock({ active }: { active: boolean }) {
  const { logout } = useAuth();
  const [armed, setArmed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [prompting, setPrompting] = useState(false);
  const promptingRef = useRef(false);
  const backgroundedAt = useRef<number | null>(null);

  // Read the preference on the client only (avoids any SSR/hydration mismatch).
  useEffect(() => { setArmed(isNativePlatform() && biometricLockEnabled()); }, [active]);

  const prompt = useCallback(async () => {
    if (promptingRef.current) return;
    promptingRef.current = true;
    setPrompting(true);
    const ok = await biometricUnlock();
    promptingRef.current = false;
    setPrompting(false);
    if (ok) setLocked(false);
  }, []);

  // Lock as soon as the app opens with the feature on.
  useEffect(() => {
    if (!active || !armed) return;
    setLocked(true);
    prompt();
  }, [active, armed, prompt]);

  // Re-lock when coming back from the background.
  useEffect(() => {
    if (!active || !armed) return;
    let remove: (() => void) | undefined;
    import('@capacitor/app')
      .then(({ App }) =>
        App.addListener('appStateChange', ({ isActive }) => {
          // The biometric dialog itself must not count as backgrounding.
          if (promptingRef.current) return;
          if (!isActive) { backgroundedAt.current = Date.now(); return; }
          const since = backgroundedAt.current;
          backgroundedAt.current = null;
          if (since && Date.now() - since > RELOCK_AFTER_MS) {
            setLocked(true);
            prompt();
          }
        }),
      )
      .then(handle => { remove = () => { handle.remove(); }; })
      .catch(() => {});
    return () => { remove?.(); };
  }, [active, armed, prompt]);

  if (!active || !locked) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center gap-5 px-8">
      <span
        className="font-black italic text-gray-950 select-none"
        style={{ fontSize: '44px', letterSpacing: '-2px', lineHeight: 1 }}
      >
        WM
      </span>
      <p className="text-sm text-gray-500 text-center">Warehouse Manager is locked</p>

      <button
        type="button"
        onClick={prompt}
        disabled={prompting}
        className="w-full max-w-xs py-3.5 rounded-full bg-gray-950 text-white font-bold text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {prompting
          ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          : 'Unlock'}
      </button>

      <button
        type="button"
        onClick={() => { setLocked(false); logout(); }}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors py-2"
      >
        Sign out instead
      </button>
    </div>
  );
}
