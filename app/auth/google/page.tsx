'use client';

// Google OAuth return page. Google sends the browser here with ?code&state; we
// exchange the code for a PocketBase session and then route the user the same way
// the password login does.

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { pb } from '@/lib/pb';
import { completeGoogleSignIn, consumeGoogleReturnTo } from '@/lib/auth-oauth';

function GoogleCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');
  const ran = useRef(false); // StrictMode double-invoke guard — the code is single-use

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code  = params.get('code');
    const state = params.get('state');
    const denied = params.get('error');

    if (denied || !code || !state) {
      router.replace('/login');
      return;
    }

    (async () => {
      try {
        const auth = await completeGoogleSignIn(code, state);
        const m: any = auth.record;

        // No company yet → the login page shows the create/join company step.
        if (!m.company_id) { router.replace('/login'); return; }

        try {
          const company = await pb.collection('companies').getOne(m.company_id);
          if (company.suspended) { router.replace('/suspended'); return; }
          if (company.rejected)  { router.replace('/rejected');  return; }
          if (!company.approved) { router.replace('/pending');   return; }
        } catch {
          setError('Could not verify your account status. Try again.');
          return;
        }

        if (!m.profile_complete) { router.replace('/onboarding'); return; }
        const returnTo = consumeGoogleReturnTo();
        router.replace(returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard');
      } catch (e: any) {
        pb.authStore.clear();
        setError(e?.message || 'Google sign-in failed. Try again.');
      }
    })();
  }, [params, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center"
      >
        {error ? (
          <>
            <p className="text-sm text-red-600 mb-5">{error}</p>
            <button
              onClick={() => router.replace('/login')}
              className="w-full py-3 rounded-full bg-gray-950 text-white font-bold text-sm hover:bg-gray-800 transition-colors"
            >
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <span className="w-7 h-7 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin inline-block mb-4" />
            <p className="text-sm text-gray-500">Signing you in…</p>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function GoogleAuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <GoogleCallback />
    </Suspense>
  );
}
