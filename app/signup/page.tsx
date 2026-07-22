'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BuildingOffice2Icon, TicketIcon, EyeIcon, EyeSlashIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { pb } from '@/lib/pb';
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

type Mode = 'create' | 'join';

export default function SignupPage() {
  const router = useRouter();
  const [name,           setName          ] = useState('');
  const [email,          setEmail         ] = useState('');
  const [password,       setPassword      ] = useState('');
  const [passwordConfirm,setPasswordConfirm] = useState('');
  const [mode,           setMode          ] = useState<Mode>('create');
  const [companyName,    setCompanyName   ] = useState('');
  const [inviteCode,     setInviteCode    ] = useState('');
  const [showPass,       setShowPass      ] = useState(false);
  const [showConfirmPass,setShowConfirmPass] = useState(false);
  const [termsAccepted,  setTermsAccepted ] = useState(false);
  const [error,          setError         ] = useState('');
  const [loading,        setLoading       ] = useState(false);
  const submittingRef = useRef(false);

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    setError('');
    if (!name.trim())  { setError('Enter your name.'); return; }
    if (!email.trim()) { setError('Enter your email.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    if (password !== passwordConfirm) { setError('Passwords do not match.'); return; }
    if (mode === 'create' && !companyName.trim()) { setError('Enter your company name.'); return; }
    if (mode === 'create' && !termsAccepted) { setError('You must accept the Terms & Conditions to create a company.'); return; }
    if (mode === 'join' && inviteCode.trim().length < 8) { setError('Enter a valid invitation code.'); return; }

    submittingRef.current = true;
    setLoading(true);
    try {
      await pb.collection('users').create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        passwordConfirm,
        pending_action:       mode,
        pending_company_name: mode === 'create' ? companyName.trim() : inviteCode.trim().toUpperCase(),
        role:                 'worker',
        notifications_enabled: false,
      });
      const normalizedEmail = email.trim().toLowerCase();
      const verifyRes = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      localStorage.setItem('verify_email', normalizedEmail);
      if (!verifyRes.ok) {
        localStorage.setItem('verify_email_send_failed', '1');
      } else {
        localStorage.removeItem('verify_email_send_failed');
      }
      router.push('/verify-email');
    } catch (e: any) {
      const msg = e?.response?.data;
      if (msg?.email?.code === 'validation_invalid_email')   setError('Invalid email address.');
      else if (msg?.email?.code === 'validation_not_unique') setError('An account with this email already exists.');
      else if (msg?.password?.message)                       setError(msg.password.message);
      else                                                   setError(e?.message || 'Could not create account. Try again.');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-md rounded-2xl p-8 shadow-[0_24px_80px_rgba(0,0,0,.8)]"
        style={{ background: '#161616', border: '1px solid #222' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-7">
          <div className="w-10 h-10 bg-white/10 border border-white/15 rounded-[10px] flex items-center justify-center">
            <span className="text-white font-black text-xs italic leading-none">WM</span>
          </div>
          <span className="font-bold text-white text-sm">Warehouse Manager</span>
        </div>

        <h2 className="text-[26px] font-extrabold text-white tracking-tight mb-1">Create Account</h2>
        <p className="text-[14px] text-white/35 mb-7">Join Warehouse Manager — it&apos;s free</p>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4 overflow-hidden"
            >
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')} className="text-red-400/50 hover:text-red-400 text-lg leading-none flex-shrink-0">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
          {/* Name */}
          <div className="group">
            <label htmlFor="sg-name" className="block text-[12px] font-semibold text-gray-500 mb-1.5 group-focus-within:text-blue-400 transition-colors">Full name</label>
            <input id="sg-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" autoFocus className={iBase} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
          </div>

          {/* Email */}
          <div className="group">
            <label htmlFor="sg-email" className="block text-[12px] font-semibold text-gray-500 mb-1.5 group-focus-within:text-blue-400 transition-colors">Email</label>
            <input id="sg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className={iBase} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
          </div>

          {/* Password */}
          <div className="group">
            <label htmlFor="sg-pass" className="block text-[12px] font-semibold text-gray-500 mb-1.5 group-focus-within:text-blue-400 transition-colors">Password</label>
            <div className="relative">
              <input
                id="sg-pass"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={`${iBase} pr-11`}
                style={iStyle} onFocus={iFocus} onBlur={iBlur}
              />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-blue-400 transition-colors">
                {showPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm */}
          <div className="group">
            <label htmlFor="sg-confirm" className="block text-[12px] font-semibold text-gray-500 mb-1.5 group-focus-within:text-blue-400 transition-colors">Confirm password</label>
            <div className="relative">
              <input
                id="sg-confirm"
                type={showConfirmPass ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="Repeat password"
                className={`${iBase} pr-11`}
                style={iStyle} onFocus={iFocus} onBlur={iBlur}
              />
              <button type="button" onClick={() => setShowConfirmPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-blue-400 transition-colors">
                {showConfirmPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mode toggle */}
          <div>
            <p className="text-[12px] font-semibold text-gray-500 mb-2">I want to&hellip;</p>
            <div className="grid grid-cols-2 gap-2">
              {(['create', 'join'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={mode === m
                    ? { background: '#1a2a4a', border: '1.5px solid #2a4a8a', color: '#60a5fa' }
                    : { background: '#1c1c1c', border: '1.5px solid #2a2a2a', color: '#555' }}
                >
                  {m === 'create'
                    ? <BuildingOffice2Icon className="w-4 h-4 flex-shrink-0" />
                    : <TicketIcon className="w-4 h-4 flex-shrink-0" />}
                  {m === 'create' ? 'Create company' : 'Join company'}
                </button>
              ))}
            </div>
          </div>

          {/* Company name or invite code */}
          <AnimatePresence mode="wait">
            {mode === 'create' ? (
              <motion.div key="create" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="group">
                <label htmlFor="sg-company" className="block text-[12px] font-semibold text-gray-500 mb-1.5 group-focus-within:text-blue-400 transition-colors">Company name</label>
                <input id="sg-company" type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Restoration Co." className={iBase} style={iStyle} onFocus={iFocus} onBlur={iBlur} onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }} />
              </motion.div>
            ) : (
              <motion.div key="join" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="group">
                <label htmlFor="sg-code" className="block text-[12px] font-semibold text-gray-500 mb-1.5 group-focus-within:text-blue-400 transition-colors">Invitation code</label>
                <input
                  id="sg-code"
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  className="w-full px-4 py-3 rounded-xl text-xl text-center tracking-widest font-bold text-white placeholder-[#444] outline-none transition-all"
                  style={iStyle} onFocus={iFocus} onBlur={iBlur}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* T&C */}
          {mode === 'create' && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded flex-shrink-0 cursor-pointer accent-blue-600"
              />
              <span className="text-[12px] text-gray-600 leading-relaxed">
                I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline font-medium">Terms &amp; Conditions</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline font-medium">Privacy Policy</a>
                , and accept responsibility for all activity within my organization.
              </span>
            </label>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_2px_16px_rgba(59,130,246,.4)] hover:shadow-[0_6px_24px_rgba(59,130,246,.5)] disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <>Create Account <ArrowRightIcon className="w-3.5 h-3.5" /></>}
          </button>

          <p className="text-center text-[13px] text-gray-600">
            Already have an account?{' '}
            <button type="button" onClick={() => router.push('/login')} className="text-blue-400 font-semibold hover:text-blue-300 transition-colors">
              Sign in
            </button>
          </p>
        </form>
      </motion.div>
    </AuthShell>
  );
}
