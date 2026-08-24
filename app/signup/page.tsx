'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BuildingOffice2Icon, TicketIcon, EyeIcon, EyeSlashIcon,
} from '@/components/icons';
import { Turnstile } from '@marsidev/react-turnstile';
import { pb } from '@/lib/pb';
import AuthShell from '@/components/AuthShell';
import AuthRight from '@/components/AuthRight';
import { iBase, iStyle, iFocus, iBlur } from '@/lib/auth-styles';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

const SIGNUP_STATS = [
  { n: 'Free',  l: 'No card needed' },
  { n: '5 min', l: 'Setup time'     },
];

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
  const [turnstileToken, setTurnstileToken] = useState('');
  const submittingRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'join') setMode('join');
    const c = params.get('code');
    if (c) setInviteCode(c.toUpperCase());
  }, []);

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
    if (TURNSTILE_SITE_KEY && !turnstileToken) { setError('Please complete the human verification below.'); return; }

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
        body: JSON.stringify({ email: normalizedEmail, turnstileToken }),
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
        className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,.09)] border border-gray-200 grid md:grid-cols-[1fr_400px]"
      >
        {/* ── LEFT: Form ── */}
        <div className="p-8 md:p-12 flex flex-col justify-center overflow-y-auto">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 md:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wm-logo.png" alt="WM" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 8 }} draggable={false} />
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
            <div className="group">
              <label htmlFor="sg-name" className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">Full name</label>
              <input id="sg-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" autoFocus className={iBase} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
            </div>

            <div className="group">
              <label htmlFor="sg-email" className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">Email</label>
              <input id="sg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className={iBase} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
            </div>

            <div className="group">
              <label htmlFor="sg-pass" className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">Password</label>
              <div className="relative">
                <input id="sg-pass" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" className={`${iBase} pr-11`} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-600 transition-colors">
                  {showPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="group">
              <label htmlFor="sg-confirm" className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">Confirm password</label>
              <div className="relative">
                <input id="sg-confirm" type={showConfirmPass ? 'text' : 'password'} value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }} placeholder="Repeat password" className={`${iBase} pr-11`} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                <button type="button" onClick={() => setShowConfirmPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                  {showConfirmPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <p className="text-[12px] font-semibold text-slate-500 mb-2">I want to&hellip;</p>
              <div className="grid grid-cols-2 gap-2">
                {(['create', 'join'] as const).map(m => (
                  <button
                    key={m} type="button" onClick={() => setMode(m)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-full text-sm font-medium transition-all"
                    style={mode === m
                      ? { background: '#0f172a', color: '#fff', border: '1.5px solid #0f172a' }
                      : { background: '#f1f5f9', color: '#64748b', border: '1.5px solid transparent' }}
                  >
                    {m === 'create' ? <BuildingOffice2Icon className="w-4 h-4 flex-shrink-0" /> : <TicketIcon className="w-4 h-4 flex-shrink-0" />}
                    {m === 'create' ? 'Create company' : 'Join company'}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {mode === 'create' ? (
                <motion.div key="create" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="group">
                  <label htmlFor="sg-company" className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">Company name</label>
                  <input id="sg-company" type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Restoration Co." className={iBase} style={iStyle} onFocus={iFocus} onBlur={iBlur} onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }} />
                </motion.div>
              ) : (
                <motion.div key="join" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="group">
                  <label htmlFor="sg-code" className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">Invitation code</label>
                  <input id="sg-code" type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="XXXXXXXX" maxLength={8} className={`${iBase} text-center text-xl tracking-widest font-bold`} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                </motion.div>
              )}
            </AnimatePresence>

            {mode === 'create' && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 rounded flex-shrink-0 cursor-pointer accent-blue-600" />
                <span className="text-[12px] text-slate-500 leading-relaxed">
                  I agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline font-medium">Terms &amp; Conditions</a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline font-medium">Privacy Policy</a>
                  , and accept responsibility for all activity within my organization.
                </span>
              </label>
            )}

            {TURNSTILE_SITE_KEY && (
              <Turnstile
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken('')}
                onError={() => setTurnstileToken('')}
              />
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-full bg-gray-950 text-white font-bold text-sm hover:bg-gray-800 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_4px_18px_rgba(15,23,42,.18)] hover:shadow-[0_6px_24px_rgba(15,23,42,.28)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <>Create Account</>}
            </button>

            <p className="text-center text-[13px] text-slate-500">
              Already have an account?{' '}
              <button type="button" onClick={() => router.push('/login')} className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">Sign in</button>
            </p>
          </form>
        </div>

        {/* ── RIGHT: Info panel (dark) ── */}
        <AuthRight
          title={<>Start your<br />free account.</>}
          subtitle="Set up your warehouse in minutes. No credit card required to get started."
          quote="We went live in under an hour."
          stats={SIGNUP_STATS}
        />
      </motion.div>
    </AuthShell>
  );
}
