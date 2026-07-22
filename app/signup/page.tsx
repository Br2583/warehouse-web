'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BuildingOffice2Icon, TicketIcon, EyeIcon, EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { pb } from '@/lib/pb';
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
        className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,.09)] border border-gray-200 grid md:grid-cols-[1fr_400px]"
      >
        {/* ── LEFT: Form ── */}
        <div className="p-8 md:p-12 flex flex-col justify-center overflow-y-auto">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 md:hidden">
            <span className="font-black italic text-gray-950 select-none" style={{ fontSize: '30px', letterSpacing: '-1.5px', lineHeight: 1 }}>WM</span>
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
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
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
        <div
          className="hidden md:flex flex-col justify-between p-12 relative overflow-hidden text-white"
          style={{
            background: '#0a0a0a',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='90'%3E%3Ctext x='70' y='62' font-family='Impact' font-size='44' font-weight='900' fill='rgba(255%2C255%2C255%2C0.055)' text-anchor='middle' font-style='italic'%3EWM%3C/text%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '140px 90px'
          }}
        >
          {/* Ghost WM centered */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
            <span className="font-black italic" style={{ fontSize: '220px', letterSpacing: '-12px', lineHeight: 1, color: 'rgba(255,255,255,0.035)' }}>WM</span>
          </div>

          {/* Top logo */}
          <div className="flex items-center gap-3 relative z-10">
            <span className="font-black italic select-none" style={{ fontSize: '38px', letterSpacing: '-2px', lineHeight: 1 }}>WM</span>
            <span className="font-semibold text-[14px] text-white/60">Warehouse Manager</span>
          </div>

          {/* Mid content */}
          <div className="relative z-10 space-y-5">
            <h2 className="font-black leading-[1.15] tracking-tight" style={{ fontSize: 'clamp(28px,2.5vw,38px)', letterSpacing: '-1px' }}>
              Start your<br />free account.
            </h2>
            <p className="text-sm text-white/60 leading-[1.65]">Set up your warehouse in minutes. No credit card required to get started.</p>
            <div className="flex gap-7">
              <div><div className="text-[22px] font-extrabold">Free</div><div className="text-[11px] text-white/50 mt-0.5">No card needed</div></div>
              <div><div className="text-[22px] font-extrabold">5 min</div><div className="text-[11px] text-white/50 mt-0.5">Setup time</div></div>
            </div>
          </div>

          {/* Quote */}
          <div className="bg-white/[0.06] border border-white/[0.1] rounded-2xl px-5 py-4 text-[13px] text-white/70 leading-[1.65] relative z-10 hover:bg-white/[0.1] transition-colors cursor-default">
            <strong className="text-white/90">&ldquo;We went live in under an hour.&rdquo;</strong>
            <br />— Warehouse Director, LogiCorp
          </div>
        </div>
      </motion.div>
    </AuthShell>
  );
}
