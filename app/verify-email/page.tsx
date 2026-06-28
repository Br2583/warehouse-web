'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, RefreshCw, ArrowLeft } from 'lucide-react';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('verify_email') || '';
    setEmail(saved);
  }, []);

  const resend = async () => {
    if (!email || loading) return;
    setLoading(true);
    setError('');
    try {
      await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {
      setError('Could not resend email. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 60%, #0d1117 100%)' }}
    >
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-[0.07] blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #60a5fa 0%, #a78bfa 50%, transparent 70%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-sm relative z-10 text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(96,165,250,0.2) 0%, rgba(167,139,250,0.2) 100%)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 32px rgba(96,165,250,0.15)',
          }}
        >
          <Mail className="w-9 h-9 text-white/70" />
        </motion.div>

        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Check your email</h1>
        <p className="text-white/35 text-sm leading-relaxed mb-2">
          We sent a verification link to
        </p>
        {email && (
          <p className="text-blue-400/80 text-sm font-medium mb-8">{email}</p>
        )}
        <p className="text-white/25 text-xs leading-relaxed mb-8">
          Click the link in the email to verify your account. Then come back here to sign in.
        </p>

        <div
          className="rounded-3xl p-6 space-y-3"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {error && (
            <p className="text-red-400 text-xs mb-2">{error}</p>
          )}

          {resent && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-400 text-xs mb-2"
            >
              Email resent successfully!
            </motion.p>
          )}

          <button
            onClick={resend}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-all disabled:opacity-40"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
              : <><RefreshCw size={14} /> Resend email</>}
          </button>

          <button
            onClick={() => router.push('/login')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(96,165,250,0.15) 0%, rgba(167,139,250,0.15) 100%)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <ArrowLeft size={14} />
            Back to Sign In
          </button>
        </div>
      </motion.div>
    </div>
  );
}
