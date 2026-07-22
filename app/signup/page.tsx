'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BuildingOffice2Icon, TicketIcon, EyeIcon, EyeSlashIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { pb } from '@/lib/pb';

type Mode = 'create' | 'join';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [mode, setMode] = useState<Mode>('create');
  const [companyName, setCompanyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  /* ─── shared input style helpers ─── */
  const inputBase = 'w-full px-4 py-3 rounded-[10px] text-sm text-gray-900 placeholder-gray-300 outline-none transition-all';
  const inputStyle = { background: '#f8fafc', border: '1.5px solid #cbd5e1' };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,.15)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,.09)] border border-gray-200 grid md:grid-cols-[420px_1fr]"
      >
        {/* ── Left panel ── */}
        <div
          className="hidden md:flex flex-col justify-between p-12 relative overflow-hidden text-white"
          style={{ background: 'linear-gradient(160deg,#1e3a8a,#3b82f6 55%,#6366f1)' }}
        >
          <div className="absolute w-80 h-80 -top-24 -right-24 rounded-full bg-white/[0.08] pointer-events-none" />
          <div className="absolute w-60 h-60 -bottom-20 -left-16 rounded-full bg-white/[0.05] pointer-events-none" />

          <div className="flex items-center gap-2.5 relative z-10">
            <div className="w-10 h-10 bg-white/[0.18] border border-white/30 rounded-[10px] flex items-center justify-center hover:bg-white/[0.28] hover:-rotate-6 hover:scale-105 transition-all cursor-default">
              <span className="text-white font-black text-xs italic leading-none">WM</span>
            </div>
            <span className="font-bold text-[15px]">Warehouse Manager</span>
          </div>

          <div className="relative z-10 space-y-5">
            <h2 className="font-black leading-[1.15] tracking-tight" style={{ fontSize: 'clamp(28px,2.5vw,38px)', letterSpacing: '-1px' }}>
              Start your<br />free account.
            </h2>
            <p className="text-sm text-white/75 leading-[1.65]">Set up your warehouse in minutes. No credit card required to get started.</p>
            <div className="flex gap-7">
              <div><div className="text-[22px] font-extrabold">Free</div><div className="text-[11px] text-white/60 mt-0.5">No card needed</div></div>
              <div><div className="text-[22px] font-extrabold">5 min</div><div className="text-[11px] text-white/60 mt-0.5">Setup time</div></div>
            </div>
          </div>

          <div className="bg-white/[0.12] border border-white/[0.18] rounded-2xl px-5 py-4 text-[13px] text-white/90 leading-[1.65] relative z-10 hover:bg-white/20 transition-colors cursor-default">
            <strong className="text-white">&ldquo;We went live in under an hour.&rdquo;</strong>
            <br />— Warehouse Director, LogiCorp
          </div>
        </div>

        {/* ── Right: form ── */}
        <div className="p-8 md:p-12 flex flex-col justify-center overflow-y-auto">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-6 md:hidden">
            <div className="w-8 h-8 bg-gray-950 rounded-[8px] flex items-center justify-center">
              <span className="text-white font-black text-[9px] italic leading-none">WM</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">Warehouse Manager</span>
          </div>

          <h2 className="text-[28px] font-extrabold text-gray-900 tracking-tight mb-1.5">Create Account</h2>
          <p className="text-[14px] text-slate-500 mb-6">Join Warehouse Manager — it&apos;s free</p>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 overflow-hidden"
              >
                <span className="flex-1">{error}</span>
                <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
            {/* Name */}
            <div className="group">
              <label htmlFor="signup-name" className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">Full name</label>
              <input id="signup-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" autoFocus className={inputBase} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>

            {/* Email */}
            <div className="group">
              <label htmlFor="signup-email" className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">Email</label>
              <input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className={inputBase} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>

            {/* Password */}
            <div className="group">
              <label htmlFor="signup-password" className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">Password</label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={`${inputBase} pr-11`}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                  {showPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="group">
              <label htmlFor="signup-confirm" className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">Confirm password</label>
              <div className="relative">
                <input
                  id="signup-confirm"
                  type={showConfirmPass ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                  placeholder="Repeat password"
                  className={`${inputBase} pr-11`}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                <button type="button" onClick={() => setShowConfirmPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                  {showConfirmPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Mode toggle */}
            <div>
              <p className="text-[12px] font-semibold text-slate-500 mb-2">I want to&hellip;</p>
              <div className="grid grid-cols-2 gap-2">
                {(['create', 'join'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={mode === m
                      ? { background: m === 'create' ? '#eff6ff' : '#faf5ff', border: `1.5px solid ${m === 'create' ? '#93c5fd' : '#c4b5fd'}`, color: m === 'create' ? '#2563eb' : '#7c3aed' }
                      : { background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#64748b' }}
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
                  <label htmlFor="signup-company" className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">Company name</label>
                  <input id="signup-company" type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Restoration Co." className={inputBase} style={inputStyle} onFocus={onFocus} onBlur={onBlur} onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }} />
                </motion.div>
              ) : (
                <motion.div key="join" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="group">
                  <label htmlFor="signup-code" className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">Invitation code</label>
                  <input
                    id="signup-code"
                    type="text"
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="XXXXXXXX"
                    maxLength={8}
                    className={`${inputBase} text-center text-xl tracking-widest font-bold`}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* T&C checkbox — only when creating company */}
            {mode === 'create' && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded flex-shrink-0 cursor-pointer accent-blue-600"
                />
                <span className="text-[12px] text-slate-500 leading-relaxed">
                  I agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline font-medium">
                    Terms &amp; Conditions
                  </a>
                  {' '}and accept responsibility for all activity within my organization.
                </span>
              </label>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-[10px] bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_2px_12px_rgba(59,130,246,.3)] hover:shadow-[0_6px_20px_rgba(59,130,246,.4)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <>Create Account <ArrowRightIcon className="w-3.5 h-3.5" /></>}
            </button>

            <p className="text-center text-[13px] text-slate-500">
              Already have an account?{' '}
              <button type="button" onClick={() => router.push('/login')} className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                Sign in
              </button>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
