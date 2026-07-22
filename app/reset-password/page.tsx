'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyIcon, EnvelopeIcon, EyeIcon, EyeSlashIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import AuthShell from '@/components/AuthShell';

/* ── light input helpers ── */
const iBase  = 'w-full px-4 py-3 rounded-[10px] text-sm text-gray-900 placeholder-gray-300 outline-none transition-all';
const iStyle = { background: '#f8fafc', border: '1.5px solid #cbd5e1' };
const iFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,.15)';
};
const iBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none';
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
    } catch { setSent(true); }
    finally { setReqLoading(false); }
  };

  const handleConfirmReset = async () => {
    if (password.length < 8) { setConfirmError('Password must be at least 8 characters.'); return; }
    if (password !== passwordConfirm) { setConfirmError('Passwords do not match.'); return; }
    setConfirmLoading(true); setConfirmError('');
    try {
      const res  = await fetch('/api/auth/confirm-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, passwordConfirm }),
      });
      const data = await res.json();
      if (data.ok) { router.replace('/login?reset=1'); }
      else { setConfirmError(data.error || 'Reset link is invalid or expired. Request a new one.'); }
    } catch { setConfirmError('Connection error. Try again.'); }
    finally { setConfirmLoading(false); }
  };

  return (
    <AuthShell>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,.09)] border border-gray-200 p-8"
      >
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-gray-950 rounded-[8px] flex items-center justify-center">
            <span className="text-white font-black text-[9px] italic leading-none">WM</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">Warehouse Manager</span>
        </div>

        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-5">
          {token ? <KeyIcon className="w-7 h-7 text-blue-600" /> : <EnvelopeIcon className="w-7 h-7 text-blue-600" />}
        </div>

        <h1 className="text-[26px] font-extrabold text-gray-900 tracking-tight mb-1.5">
          {token ? 'Set New Password' : 'Reset Password'}
        </h1>
        <p className="text-[14px] text-slate-500 mb-6">
          {token ? 'Choose a strong new password for your account.' : "Enter your email and we'll send you a reset link."}
        </p>

        <div className="space-y-4">
          <AnimatePresence>
            {(reqError || confirmError) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl overflow-hidden"
              >
                <span className="flex-1">{reqError || confirmError}</span>
                <button onClick={() => { setReqError(''); setConfirmError(''); }} className="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          {!token && (
            <>
              {sent ? (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
                  <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                  Check your email! If an account exists for {email}, we sent a reset link.
                </motion.div>
              ) : (
                <>
                  <div className="group">
                    <label htmlFor="rp-email" className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">Email address</label>
                    <input id="rp-email" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRequestReset()} placeholder="you@company.com" autoFocus className={iBase} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                  </div>
                  <button onClick={handleRequestReset} disabled={reqLoading}
                    className="w-full py-3.5 rounded-[10px] bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 active:translate-y-0 hover:-translate-y-0.5 transition-all shadow-[0_2px_12px_rgba(59,130,246,.3)] disabled:opacity-50 flex items-center justify-center">
                    {reqLoading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Send Reset Link'}
                  </button>
                </>
              )}
            </>
          )}

          {token && (
            <>
              <div className="group">
                <label htmlFor="rp-new" className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">New password</label>
                <div className="relative">
                  <input id="rp-new" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" autoFocus className={`${iBase} pr-11`} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                    {showPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="group">
                <label htmlFor="rp-confirm" className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">Confirm password</label>
                <input id="rp-confirm" type={showPass ? 'text' : 'password'} value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleConfirmReset()} placeholder="Repeat password" className={iBase} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
              </div>
              <button onClick={handleConfirmReset} disabled={confirmLoading}
                className="w-full py-3.5 rounded-[10px] bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_2px_12px_rgba(59,130,246,.3)] disabled:opacity-50 flex items-center justify-center">
                {confirmLoading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Update Password'}
              </button>
            </>
          )}

          <button onClick={() => router.push('/login')}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-slate-400 hover:text-slate-600 transition-colors">
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
