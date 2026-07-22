'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  EyeIcon, EyeSlashIcon, BuildingOffice2Icon, TicketIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { pb } from '@/lib/pb';
import { genCode } from '@/lib/utils';
import AuthShell from '@/components/AuthShell';

/* ── shared dark input helpers ── */
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

/* ── generic field ── */
function Field({
  label, id, type = 'text', value, onChange, placeholder, onKeyDown, autoFocus,
}: {
  label: string; id: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>; autoFocus?: boolean;
}) {
  return (
    <div className="group">
      <label htmlFor={id} className="block text-[12px] font-semibold text-gray-500 mb-1.5 group-focus-within:text-blue-400 transition-colors">{label}</label>
      <input
        id={id} type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder} onKeyDown={onKeyDown} autoFocus={autoFocus}
        className={iBase} style={iStyle} onFocus={iFocus} onBlur={iBlur}
      />
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [email,         setEmail        ] = useState('');
  const [password,      setPassword     ] = useState('');
  const [showPass,      setShowPass     ] = useState(false);
  const [error,         setError        ] = useState('');
  const [loading,       setLoading      ] = useState(false);

  const [needsCompany,  setNeedsCompany ] = useState(false);
  const [companyMode,   setCompanyMode  ] = useState<'create' | 'join'>('create');
  const [companyName,   setCompanyName  ] = useState('');
  const [inviteCode,    setInviteCode   ] = useState('');
  const [companyLoading,setCompanyLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const verified       = params.get('verified') === '1';
  const reset          = params.get('reset')    === '1';
  const sessionExpired = params.get('session')  === 'expired';

  useEffect(() => {
    fetch('/api/ping').catch(() => {});
    if (sessionExpired) { pb.authStore.clear(); router.replace('/login'); return; }
    if (!pb.authStore.isValid || !pb.authStore.model?.company_id) return;
    pb.collection('companies').getOne(pb.authStore.model.company_id)
      .then(c => {
        if (c.suspended) router.replace('/suspended');
        else if (c.rejected) router.replace('/rejected');
        else if (!c.approved) router.replace('/pending');
        else router.replace('/dashboard');
      })
      .catch(() => router.replace('/dashboard'));
  }, [sessionExpired]);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setLoading(true);
    try {
      const auth = await pb.collection('users').authWithPassword(email.trim().toLowerCase(), password);
      const model = auth.record;
      if (!model.verified) {
        pb.authStore.clear();
        localStorage.setItem('verify_email', email.trim().toLowerCase());
        setLoading(false);
        router.push('/verify-email');
        return;
      }
      if (!model.company_id) {
        const pendingAction = model.pending_action as string;
        const pendingData   = model.pending_company_name as string;
        if (pendingAction === 'create' && pendingData) { await createCompany(model.id, pendingData, email.trim().toLowerCase()); return; }
        if (pendingAction === 'join'   && pendingData) { await joinCompany(pendingData); return; }
        setNeedsCompany(true); setLoading(false); return;
      }
      if (model.company_id) {
        try {
          const company = await pb.collection('companies').getOne(model.company_id);
          if (company.suspended) { router.replace('/suspended'); return; }
          if (company.rejected)  { router.replace('/rejected');  return; }
          if (!company.approved) { router.replace('/pending');   return; }
        } catch {
          setError('Could not verify account status. Try again.');
          setLoading(false); return;
        }
      }
      if (!model.profile_complete) { router.replace('/onboarding'); return; }
      const returnTo = params.get('returnTo');
      router.replace(returnTo && returnTo.startsWith('/') ? returnTo : '/dashboard');
    } catch (e: any) {
      setError(e?.status === 400 ? 'Incorrect email or password.' : (e?.message || 'Sign in failed. Try again.'));
      setLoading(false);
    }
  };

  const createCompany = async (userId: string, name: string, ownerEmail: string) => {
    try {
      const code = genCode();
      const company = await pb.collection('companies').create({ name, invite_code: code, owner_id: userId, plan: 'active', approved: false, suspended: false, rejected: false });
      const model = pb.authStore.model;
      await pb.collection('users').update(userId, { company_id: company.id, role: 'owner', pending_action: '', pending_company_name: '' });
      await pb.collection('users').authRefresh();
      fetch('/api/admin/notify', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` }, body: JSON.stringify({ companyName: name, ownerName: model?.name || '', ownerEmail }) }).catch(() => {});
      router.replace('/pending');
    } catch {
      setError('Could not create company. Try again.');
      setLoading(false);
    }
  };

  const joinCompany = async (code: string) => {
    try {
      const res = await fetch('/api/company/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` },
        body: JSON.stringify({ inviteCode: code }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Invitation code not found or expired.');
        setLoading(false); return;
      }
      await pb.collection('users').authRefresh();
      router.replace('/onboarding');
    } catch {
      setError('Invitation code not found or expired.');
      setLoading(false);
    }
  };

  const handleCompanySubmit = async () => {
    setError('');
    const model = pb.authStore.model;
    if (!model) { setError('Session expired. Sign in again.'); return; }
    if (companyMode === 'create' && !companyName.trim()) { setError('Enter a company name.'); return; }
    if (companyMode === 'create' && !termsAccepted) { setError('You must accept the Terms & Conditions.'); return; }
    if (companyMode === 'join' && inviteCode.trim().length < 8) { setError('Enter a valid invitation code.'); return; }
    setCompanyLoading(true);
    if (companyMode === 'create') {
      await createCompany(model.id, companyName.trim(), model.email || email.trim().toLowerCase());
    } else {
      await joinCompany(inviteCode.trim().toUpperCase());
    }
    setCompanyLoading(false);
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

        <h2 className="text-[26px] font-extrabold text-white tracking-tight mb-1">
          {needsCompany ? 'Set Up Your Company' : 'Sign In'}
        </h2>
        <p className="text-[14px] text-white/35 mb-7">
          {needsCompany ? 'One last step before you start.' : 'Access your workspace'}
        </p>

        {/* Banners */}
        {!bannerDismissed && sessionExpired && !error && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm px-4 py-3 rounded-xl mb-4">
            <span className="flex-1">⏱ Session expired. Sign in again.</span>
            <button onClick={() => setBannerDismissed(true)} className="text-amber-400/50 hover:text-amber-400 text-lg leading-none">✕</button>
          </div>
        )}
        {!bannerDismissed && verified && !error && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-xl mb-4">
            <span className="flex-1">✓ Email verified! Sign in to continue.</span>
            <button onClick={() => setBannerDismissed(true)} className="text-green-400/50 hover:text-green-400 text-lg leading-none">✕</button>
          </div>
        )}
        {!bannerDismissed && reset && !error && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-xl mb-4">
            <span className="flex-1">✓ Password updated! Sign in with your new password.</span>
            <button onClick={() => setBannerDismissed(true)} className="text-green-400/50 hover:text-green-400 text-lg leading-none">✕</button>
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4 overflow-hidden"
            >
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')} className="text-red-400/50 hover:text-red-400 text-lg leading-none">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {/* ── LOGIN FORM ── */}
          {!needsCompany && (
            <>
              <Field id="login-email" label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }} />

              <div className="group">
                <label htmlFor="login-pass" className="block text-[12px] font-semibold text-gray-500 mb-1.5 group-focus-within:text-blue-400 transition-colors">Password</label>
                <div className="relative">
                  <input
                    id="login-pass"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="••••••••"
                    className={`${iBase} pr-11`}
                    style={iStyle} onFocus={iFocus} onBlur={iBlur}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-blue-400 transition-colors">
                    {showPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={() => router.push('/reset-password')} className="text-[12px] text-gray-600 hover:text-blue-400 transition-colors">
                  Forgot password?
                </button>
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_2px_16px_rgba(59,130,246,.4)] hover:shadow-[0_6px_24px_rgba(59,130,246,.5)] disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <>Sign In <ArrowRightIcon className="w-3.5 h-3.5" /></>}
              </button>

              <p className="text-center text-[13px] text-gray-600">
                No account?{' '}
                <button onClick={() => router.push('/signup')} className="text-blue-400 font-semibold hover:text-blue-300 transition-colors">
                  Create one
                </button>
              </p>
            </>
          )}

          {/* ── COMPANY SETUP ── */}
          {needsCompany && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {(['create', 'join'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setCompanyMode(m)}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={companyMode === m
                      ? { background: '#1a2a4a', border: '1.5px solid #2a4a8a', color: '#60a5fa' }
                      : { background: '#1c1c1c', border: '1.5px solid #2a2a2a', color: '#555' }}
                  >
                    {m === 'create' ? <BuildingOffice2Icon className="w-4 h-4 flex-shrink-0" /> : <TicketIcon className="w-4 h-4 flex-shrink-0" />}
                    {m === 'create' ? 'Create company' : 'Join company'}
                  </button>
                ))}
              </div>

              {companyMode === 'create' ? (
                <Field id="co-name" label="Company name" value={companyName} onChange={setCompanyName} placeholder="Acme Restoration Co." autoFocus />
              ) : (
                <div className="group">
                  <label htmlFor="co-code" className="block text-[12px] font-semibold text-gray-500 mb-1.5">Invitation code</label>
                  <input
                    id="co-code"
                    type="text"
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="XXXXXXXX"
                    maxLength={8}
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl text-xl text-center tracking-widest font-bold text-white placeholder-[#444] outline-none transition-all"
                    style={iStyle} onFocus={iFocus} onBlur={iBlur}
                  />
                </div>
              )}

              {companyMode === 'create' && (
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
                    {' '}and accept responsibility for all activity within my organization.
                  </span>
                </label>
              )}

              <button
                onClick={handleCompanySubmit}
                disabled={companyLoading}
                className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_2px_16px_rgba(59,130,246,.4)] disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {companyLoading
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : companyMode === 'create' ? 'Create Company' : 'Join Company'}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080808' }}>
        <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
