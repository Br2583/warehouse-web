'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyIcon, EnvelopeIcon, EyeIcon, EyeSlashIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import AuthShell from '@/components/AuthShell';

/* ── dark input helpers ── */
const iBase = 'w-full px-4 py-3 rounded-xl text-sm text-white placeholder-[#444] outline-none transition-all';
const iStyle = { background: '#111', border: '1.5px solid #2a2a2a' };
const iFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = '#3b82f6';
  e.target.style.background  = '#1a1a1a';
  e.target.style.boxShadow   = '0 0 0 3px rgba(59,130,246,.12)';
};
const iBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = '#2a2a2a';
  e.target.style.background  = '#111';
  e.target.style.boxShadow   = 'none';
};

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token  = params.get('token');

  const [email,          setEmail         ] = useState('');
  const [sent,           setSent          ] = useState(false);
  const [reqLoading,     setReqLoading    ] = useState(false);
  const [reqError,       setReqError      ] = useState('');

  const [password,       setPassword      ] = useState('');
  const [passwordConfirm,setPasswordConfirm] = useState('');
  const [showPass,       setShowPass      ] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError,   setConfirmError  ] = useState('');

  const handleRequestReset = async () => {
    if (!email.trim()) { setReqError('Enter your email.'); return; }
    setReqLoading(true); setReqError('');
    try {
      await fetch('/api/auth/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setReqLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (password.length < 8) { setConfirmError('Password must be at least 8 characters.'); return; }
    if (password !== passwordConfirm) { setConfirmError('Passwords do not match.'); return; }
    setConfirmLoading(true); setConfirmError('');
    try {
      const res = await fetch('/api/auth/confirm-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, passwordConfirm }),
      });
      const data = await res.json();
      if (data.ok) {
        router.replace('/login?reset=1');
      } else {
        setConfirmError(data.error || 'Reset link is invalid or expired. Request a new one.');
      }
    } catch {
      setConfirmError('Connection error. Try again.');
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <AuthShell>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-sm rounded-2xl p-8 shadow-[0_24px_80px_rgba(0,0,0,.8)]"
        style={{ background: '#161616', border: '1px solid #222' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-10 h-10 bg-white/10 border border-white/15 rounded-[10px] flex items-center justify-center">
            <span className="text-white font-black text-xs italic leading-none">WM</span>
          </div>
          <span className="font-bold text-white text-sm">Warehouse Manager</span>
        </div>

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(59,130,246,.12)', border: '1px solid rgba(59,130,246,.2)' }}>
          {token ? <KeyIcon className="w-7 h-7 text-blue-400" /> : <EnvelopeIcon className="w-7 h-7 text-blue-400" />}
        </div>

        <h1 className="text-[26px] font-extrabold text-white tracking-tight mb-1.5">
          {token ? 'Set New Password' : 'Reset Password'}
        </h1>
        <p className="text-[14px] text-white/35 mb-7">
          {token ? 'Choose a strong new password for your account.' : "Enter your email and we'll send you a reset link."}
        </p>

        <div className="space-y-4">
          <AnimatePresence>
            {(reqError || confirmError) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl overflow-hidden"
              >
                <span className="flex-1">{reqError || confirmError}</span>
                <button onClick={() => { setReqError(''); setConfirmError(''); }} className="text-red-400/50 hover:text-red-400 text-lg leading-none">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* REQUEST RESET */}
          {!token && (
            <>
              {sent ? (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-xl"
                >
                  <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                  Check your email! If an account exists for {email}, we sent a reset link.
                </motion.div>
              ) : (
                <>
                  <div className="group">
                    <label htmlFor="rp-email" className="block text-[12px] font-semibold text-gray-500 mb-1.5 group-focus-within:text-blue-400 transition-colors">Email address</label>
                    <input
                      id="rp-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRequestReset()}
                      placeholder="you@company.com"
                      autoFocus
                      className={iBase}
                      style={iStyle} onFocus={iFocus} onBlur={iBlur}
                    />
                  </div>
                  <button
                    onClick={handleRequestReset}
                    disabled={reqLoading}
                    className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_2px_16px_rgba(59,130,246,.4)] disabled:opacity-40 flex items-center justify-center"
                  >
                    {reqLoading
                      ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : 'Send Reset Link'}
                  </button>
                </>
              )}
            </>
          )}

          {/* CONFIRM RESET */}
          {token && (
            <>
              <div className="group">
                <label htmlFor="rp-new" className="block text-[12px] font-semibold text-gray-500 mb-1.5 group-focus-within:text-blue-400 transition-colors">New password</label>
                <div className="relative">
                  <input
                    id="rp-new"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoFocus
                    className={`${iBase} pr-11`}
                    style={iStyle} onFocus={iFocus} onBlur={iBlur}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-blue-400 transition-colors">
                    {showPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="group">
                <label htmlFor="rp-confirm" className="block text-[12px] font-semibold text-gray-500 mb-1.5 group-focus-within:text-blue-400 transition-colors">Confirm password</label>
                <input
                  id="rp-confirm"
                  type={showPass ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConfirmReset()}
                  placeholder="Repeat password"
                  className={iBase}
                  style={iStyle} onFocus={iFocus} onBlur={iBlur}
                />
              </div>
              <button
                onClick={handleConfirmReset}
                disabled={confirmLoading}
                className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_2px_16px_rgba(59,130,246,.4)] disabled:opacity-40 flex items-center justify-center"
              >
                {confirmLoading
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : 'Update Password'}
              </button>
            </>
          )}

          <button
            onClick={() => router.push('/login')}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-600 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Sign In
          </button>
        </div>
      </motion.div>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080808' }}>
        <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
