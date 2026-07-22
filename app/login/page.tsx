'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  EyeIcon, EyeSlashIcon, BuildingOffice2Icon, TicketIcon,
} from '@heroicons/react/24/outline';
import { pb } from '@/lib/pb';
import { genCode } from '@/lib/utils';
import AuthShell from '@/components/AuthShell';

/* ── Right info panel (blue gradient) ── */
const STATS = [
  { n: '500K+', l: 'Vaults tracked' },
  { n: '3.2K',  l: 'Active teams'   },
  { n: '99.9%', l: 'Uptime'         },
];
function AuthRight({ title, subtitle }: { title: React.ReactNode; subtitle: string }) {
  return (
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
          {title}
        </h2>
        <p className="text-sm text-white/75 leading-[1.65]">{subtitle}</p>
        <div className="flex gap-7">
          {STATS.map(s => (
            <div key={s.l}>
              <div className="text-[22px] font-extrabold leading-tight">{s.n}</div>
              <div className="text-[11px] text-white/60 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/[0.12] border border-white/[0.18] rounded-2xl px-5 py-4 text-[13px] text-white/90 leading-[1.65] relative z-10 hover:bg-white/20 transition-colors cursor-default">
        <strong className="text-white">&ldquo;Warehouse Manager cut our inventory errors by 80%.&rdquo;</strong>
        <br />— Warehouse Director, LogiCorp
      </div>
    </div>
  );
}

/* ── Shared light input helper ── */
const iBase  = 'w-full px-4 py-3 rounded-[10px] text-sm text-gray-900 placeholder-gray-300 outline-none transition-all';
const iStyle = { background: '#f8fafc', border: '1.5px solid #cbd5e1' };
const iFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,.15)';
};
const iBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none';
};

function Field({ label, id, type = 'text', value, onChange, placeholder, onKeyDown, autoFocus }: {
  label: string; id: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>; autoFocus?: boolean;
}) {
  return (
    <div className="group">
      <label htmlFor={id} className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">{label}</label>
      <input
        id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} onKeyDown={onKeyDown} autoFocus={autoFocus}
        className={iBase} style={iStyle} onFocus={iFocus} onBlur={iBlur}
      />
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [email,          setEmail          ] = useState('');
  const [password,       setPassword       ] = useState('');
  const [showPass,       setShowPass       ] = useState(false);
  const [error,          setError          ] = useState('');
  const [loading,        setLoading        ] = useState(false);
  const [needsCompany,   setNeedsCompany   ] = useState(false);
  const [companyMode,    setCompanyMode    ] = useState<'create' | 'join'>('create');
  const [companyName,    setCompanyName    ] = useState('');
  const [inviteCode,     setInviteCode     ] = useState('');
  const [companyLoading, setCompanyLoading ] = useState(false);
  const [termsAccepted,  setTermsAccepted  ] = useState(false);
  const [bannerDismissed,setBannerDismissed] = useState(false);

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
        className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,.09)] border border-gray-200 grid md:grid-cols-[1fr_400px]"
      >
        {/* ── LEFT: Form ── */}
        <div className="p-8 md:p-12 flex flex-col justify-center overflow-y-auto">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-6 md:hidden">
            <div className="w-8 h-8 bg-gray-950 rounded-[8px] flex items-center justify-center">
              <span className="text-white font-black text-[9px] italic leading-none">WM</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">Warehouse Manager</span>
          </div>

          <h2 className="text-[28px] font-extrabold text-gray-900 tracking-tight mb-1.5">
            {needsCompany ? 'Set Up Your Company' : 'Welcome back'}
          </h2>
          <p className="text-[14px] text-slate-500 mb-7">
            {needsCompany ? 'One last step before you can start.' : 'Sign in to your workspace'}
          </p>

          {/* Banners */}
          {!bannerDismissed && sessionExpired && !error && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl mb-4">
              <span className="flex-1">⏱ Your session expired after 2 hours of inactivity. Sign in again.</span>
              <button onClick={() => setBannerDismissed(true)} className="text-amber-400 hover:text-amber-600 text-lg leading-none flex-shrink-0">✕</button>
            </div>
          )}
          {!bannerDismissed && verified && !error && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-4">
              <span className="flex-1">✓ Email verified! Sign in to continue.</span>
              <button onClick={() => setBannerDismissed(true)} className="text-green-400 hover:text-green-600 text-lg leading-none flex-shrink-0">✕</button>
            </div>
          )}
          {!bannerDismissed && reset && !error && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-4">
              <span className="flex-1">✓ Password updated! Sign in with your new password.</span>
              <button onClick={() => setBannerDismissed(true)} className="text-green-400 hover:text-green-600 text-lg leading-none flex-shrink-0">✕</button>
            </div>
          )}

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 overflow-hidden"
              >
                <span className="flex-1">{error}</span>
                <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            {/* ── LOGIN FORM ── */}
            {!needsCompany && (
              <>
                <Field id="login-email" label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }} />

                <div className="group">
                  <label htmlFor="login-pass" className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">Password</label>
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
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                      {showPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button onClick={() => router.push('/reset-password')} className="text-[12px] text-slate-400 hover:text-blue-600 transition-colors">
                    Forgot password?
                  </button>
                </div>

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full py-3.5 rounded-full bg-gray-950 text-white font-bold text-sm hover:bg-gray-800 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_4px_18px_rgba(15,23,42,.18)] hover:shadow-[0_6px_24px_rgba(15,23,42,.28)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <>Sign In</>}
                </button>

                <p className="text-center text-[13px] text-slate-500">
                  No account?{' '}
                  <button onClick={() => router.push('/signup')} className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
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
                      className="flex items-center gap-2 px-3 py-2.5 rounded-full text-sm font-medium transition-all"
                      style={companyMode === m
                        ? { background: '#0f172a', color: '#fff', border: '1.5px solid #0f172a' }
                        : { background: '#f1f5f9', color: '#64748b', border: '1.5px solid transparent' }}
                    >
                      {m === 'create' ? <BuildingOffice2Icon className="w-4 h-4 flex-shrink-0" /> : <TicketIcon className="w-4 h-4 flex-shrink-0" />}
                      {m === 'create' ? 'Create' : 'Join'}
                    </button>
                  ))}
                </div>

                {companyMode === 'create' ? (
                  <Field id="co-name" label="Company name" value={companyName} onChange={setCompanyName} placeholder="Acme Restoration Co." autoFocus />
                ) : (
                  <div className="group">
                    <label htmlFor="co-code" className="block text-[12px] font-semibold text-slate-500 mb-1.5">Invitation code</label>
                    <input
                      id="co-code" type="text" value={inviteCode}
                      onChange={e => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="XXXXXXXX" maxLength={8} autoFocus
                      className="w-full px-4 py-3 rounded-[10px] text-xl text-center tracking-widest font-bold text-gray-900 placeholder-gray-300 outline-none transition-all"
                      style={iStyle} onFocus={iFocus} onBlur={iBlur}
                    />
                  </div>
                )}

                {companyMode === 'create' && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 rounded flex-shrink-0 cursor-pointer accent-blue-600" />
                    <span className="text-[12px] text-slate-500 leading-relaxed">
                      I agree to the{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline font-medium">Terms &amp; Conditions</a>
                      {' '}and accept responsibility for all activity within my organization.
                    </span>
                  </label>
                )}

                <button
                  onClick={handleCompanySubmit}
                  disabled={companyLoading}
                  className="w-full py-3.5 rounded-full bg-gray-950 text-white font-bold text-sm hover:bg-gray-800 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_4px_18px_rgba(15,23,42,.18)] hover:shadow-[0_6px_24px_rgba(15,23,42,.28)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {companyLoading
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : companyMode === 'create' ? 'Create Company' : 'Join Company'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: Info panel ── */}
        <AuthRight
          title={<>Manage smarter.<br />Ship faster.</>}
          subtitle="Join thousands of teams using Warehouse Manager to track inventory and grow their business."
        />
      </motion.div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
