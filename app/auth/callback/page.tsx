'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full max-w-sm bg-white rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,.09)] border border-gray-200 p-8 text-center"
        >
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-gray-950 rounded-[8px] flex items-center justify-center">
              <span className="text-white font-black text-[9px] italic leading-none">WM</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">Warehouse Manager</span>
          </div>

          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <XCircleIcon className="w-7 h-7 text-red-500" />
          </div>

          <h1 className="text-xl font-extrabold text-gray-900 mb-2">Verification failed</h1>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">{error}</p>

          <button
            onClick={() => { window.location.href = '/verify-email'; }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-gray-950 text-white font-bold text-sm hover:bg-gray-800 transition-all shadow-[0_4px_18px_rgba(15,23,42,.18)]"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Request a new link
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-gray-950 rounded-[8px] flex items-center justify-center">
            <span className="text-white font-black text-[9px] italic leading-none">WM</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">Warehouse Manager</span>
        </div>
        <div className="w-10 h-10 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Verifying your email...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
