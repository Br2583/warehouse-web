'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function Spinner({ text }: { text: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 100%)' }}>
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/30 text-sm">{text}</p>
      </div>
    </div>
  );
}

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          router.replace('/login?verified=1');
        } else {
          setError(data.error || 'Verification failed.');
        }
      })
      .catch(() => setError('Connection error. Please try again.'));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 100%)' }}>
        <div className="text-center px-6 max-w-sm">
          <p className="text-red-400 mb-6 text-sm leading-relaxed">{error}</p>
          <button
            onClick={() => { window.location.href = '/verify-email'; }}
            className="text-blue-400/70 text-sm hover:text-blue-400 transition-colors"
          >
            Request a new link
          </button>
        </div>
      </div>
    );
  }

  return <Spinner text="Verifying your email..." />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner text="Loading..." />}>
      <CallbackHandler />
    </Suspense>
  );
}
