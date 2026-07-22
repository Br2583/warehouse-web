'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { EnvelopeIcon, ArrowPathIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import AuthShell from '@/components/AuthShell';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email,   setEmail  ] = useState('');
  const [resent,  setResent ] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('verify_email') || '';
    setEmail(saved);
    if (!saved) {
      setError('Email address not found. Please go back and sign up again.');
    } else if (localStorage.getItem('verify_email_send_failed')) {
      setError("We couldn't send the verification email automatically. Click Resend below to try again.");
      localStorage.removeItem('verify_email_send_failed');
    }
  }, []);

  const resend = async () => {
    if (!email || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) { setError('Could not resend email. Try again in a moment.'); return; }
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {
      setError('Could not resend email. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
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

        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <EnvelopeIcon className="w-8 h-8 text-blue-600" />
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">Check your email</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-1">We sent a verification link to</p>
        {email && <p className="text-sm font-semibold text-blue-600 mb-2">{email}</p>}
        <p className="text-xs text-slate-400 leading-relaxed mb-7">
          Click the link in the email to verify your account, then come back here to sign in.
        </p>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-xl mb-4 overflow-hidden">
              {error}
            </motion.div>
          )}
          {resent && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs px-4 py-3 rounded-xl mb-4 overflow-hidden">
              <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
              Email resent successfully!
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          <button
            onClick={resend} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[10px] bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_2px_12px_rgba(59,130,246,.3)]"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <><ArrowPathIcon className="w-4 h-4" /> Resend email</>}
          </button>

          <button
            onClick={() => router.push('/login')}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[10px] bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 active:scale-[0.98] transition-all"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Sign In
          </button>
        </div>
      </motion.div>
    </AuthShell>
  );
}
