'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { pb } from '@/lib/pb';

const genCode = () => Math.random().toString(36).substring(2, 10).toUpperCase();

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 100%)' }}>
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/30 text-sm">Completing sign-in...</p>
      </div>
    </div>
  );
}

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code   = params.get('code');
      const errMsg = params.get('error');

      if (errMsg) { router.replace('/login'); return; }
      if (!code)  { router.replace('/login'); return; }

      try {
        const pkceVerifier = sessionStorage.getItem('pkce_verifier') || '';
        const action      = (sessionStorage.getItem('oauth_action') || 'login') as 'login' | 'create' | 'join';
        const companyName =  sessionStorage.getItem('oauth_company') || '';
        const inviteCode  =  sessionStorage.getItem('oauth_invite')  || '';

        sessionStorage.removeItem('pkce_verifier');
        sessionStorage.removeItem('oauth_action');
        sessionStorage.removeItem('oauth_company');
        sessionStorage.removeItem('oauth_invite');

        const callbackUrl = `${window.location.origin}/auth/callback`;

        await pb.collection('users').authWithOAuth2Code(
          'google',
          code,
          pkceVerifier,
          callbackUrl,
          { role: 'worker', notifications_enabled: false },
        );

        const model = pb.authStore.model;
        if (!model) throw new Error('Authentication failed');

        if (model.company_id) { router.replace('/dashboard'); return; }

        if (action === 'create' && companyName) {
          const company = await pb.collection('companies').create({
            name:        companyName,
            invite_code: genCode(),
            portal_code: '2019',
            owner_id:    model.id,
            plan:        'active',
          });
          await pb.collection('users').update(model.id, { company_id: company.id, role: 'owner' });
          await pb.collection('users').authRefresh();
          router.replace('/dashboard');
          return;
        }

        if (action === 'join' && inviteCode) {
          const company = await pb.collection('companies').getFirstListItem(`invite_code="${inviteCode}"`);
          await pb.collection('users').update(model.id, { company_id: company.id, role: 'worker' });
          await pb.collection('users').authRefresh();
          router.replace('/dashboard');
          return;
        }

        pb.authStore.clear();
        router.replace('/login');
      } catch (e: any) {
        setError(e?.message || 'Authentication failed');
      }
    };

    handleCallback();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 100%)' }}>
        <div className="text-center px-6">
          <p className="text-red-400 mb-4 text-sm">{error}</p>
          <button onClick={() => router.replace('/login')}
            className="text-white/40 text-sm hover:text-white/70 transition-colors">
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  return <Spinner />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CallbackHandler />
    </Suspense>
  );
}
