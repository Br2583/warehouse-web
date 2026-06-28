'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { pb } from '@/lib/pb';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  // No token → request reset link
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState('');

  // With token → set new password
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const handleRequestReset = async () => {
    if (!email.trim()) { setReqError('Enter your email.'); return; }
    setReqLoading(true);
    setReqError('');
    try {
      await pb.collection('users').requestPasswordReset(email.trim().toLowerCase());
      setSent(true);
    } catch {
      // Don't leak whether account exists — always show success
      setSent(true);
    } finally {
      setReqLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (password.length < 8) { setConfirmError('Password must be at least 8 characters.'); return; }
    if (password !== passwordConfirm) { setConfirmError('Passwords do not match.'); return; }
    setConfirmLoading(true);
    setConfirmError('');
    try {
      await pb.collection('users').confirmPasswordReset(token!, password, passwordConfirm);
      router.replace('/login?reset=1');
    } catch {
      setConfirmError('Reset link is invalid or expired. Request a new one.');
    } finally {
      setConfirmLoading(false);
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
        className="w-full max-w-sm relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background: 'linear-gradient(135deg, rgba(96,165,250,0.2) 0%, rgba(167,139,250,0.2) 100%)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 8px 32px rgba(96,165,250,0.15)',
            }}
          >
            {token ? <KeyRound className="w-8 h-8 text-white/70" /> : <Mail className="w-8 h-8 text-white/70" />}
          </motion.div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {token ? 'Set New Password' : 'Reset Password'}
          </h1>
          <p className="text-white/30 text-sm mt-1.5">
            {token ? 'Choose a strong password' : 'Enter your email and we\'ll send a link'}
          </p>
        </div>

        <div
          className="rounded-3xl p-7 space-y-4"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {/* REQUEST RESET */}
          {!token && (
            <>
              <AnimatePresence mode="wait">
                {sent ? (
                  <motion.div
                    key="sent"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-4"
                  >
                    <p className="text-green-400 text-sm mb-1">Check your email!</p>
                    <p className="text-white/30 text-xs">If an account exists for {email}, we sent a reset link.</p>
                  </motion.div>
                ) : (
                  <motion.div key="form" className="space-y-4">
                    <AnimatePresence>
                      {reqError && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl overflow-hidden"
                        >
                          {reqError}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div>
                      <label className="text-xs text-white/30 font-medium mb-1.5 block">Email address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleRequestReset()}
                        placeholder="you@company.com"
                        autoFocus
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all text-white placeholder-white/20"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', caretColor: 'white' }}
                      />
                    </div>

                    <button
                      onClick={handleRequestReset}
                      disabled={reqLoading}
                      className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, rgba(96,165,250,0.25) 0%, rgba(167,139,250,0.25) 100%)',
                        border: '1px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      {reqLoading
                        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : 'Send Reset Link'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* CONFIRM RESET */}
          {token && (
            <>
              <AnimatePresence>
                {confirmError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl overflow-hidden"
                  >
                    <span className="flex-1">{confirmError}</span>
                    <button onClick={() => setConfirmError('')} className="text-red-400/60 hover:text-red-400 text-lg leading-none">✕</button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="text-xs text-white/30 font-medium mb-1.5 block">New password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoFocus
                    className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all text-white placeholder-white/20"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', caretColor: 'white' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-white/30 font-medium mb-1.5 block">Confirm new password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConfirmReset()}
                  placeholder="Repeat password"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all text-white placeholder-white/20"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', caretColor: 'white' }}
                />
              </div>

              <button
                onClick={handleConfirmReset}
                disabled={confirmLoading}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(96,165,250,0.25) 0%, rgba(167,139,250,0.25) 100%)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {confirmLoading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : 'Update Password'}
              </button>
            </>
          )}

          {/* Back link */}
          <button
            onClick={() => router.push('/login')}
            className="w-full flex items-center justify-center gap-2 text-xs text-white/25 hover:text-white/50 transition-colors pt-1"
          >
            <ArrowLeft size={12} />
            Back to Sign In
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 100%)' }}>
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
