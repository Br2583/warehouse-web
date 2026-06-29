'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArchiveBoxIcon, EyeIcon, EyeSlashIcon, BuildingOffice2Icon, TicketIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { pb } from '@/lib/pb';
import { genCode } from '@/lib/utils';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Post-company-creation: if user has no company after login
  const [needsCompany, setNeedsCompany] = useState(false);
  const [companyMode, setCompanyMode] = useState<'create' | 'join'>('create');
  const [companyName, setCompanyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [companyLoading, setCompanyLoading] = useState(false);

  const verified = params.get('verified') === '1';
  const reset    = params.get('reset')    === '1';

  useEffect(() => {
    if (!pb.authStore.isValid || !pb.authStore.model?.company_id) return;
    // Check approval before auto-redirecting
    pb.collection('companies').getOne(pb.authStore.model.company_id)
      .then(c => {
        if (c.suspended) router.replace('/suspended');
        else if (!c.approved) router.replace('/pending');
        else router.replace('/dashboard');
      })
      .catch(() => router.replace('/dashboard'));
  }, []);

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
        router.push('/verify-email');
        return;
      }

      if (!model.company_id) {
        // Check pending_action stored during signup
        const pendingAction = model.pending_action as string;
        const pendingData   = model.pending_company_name as string;

        if (pendingAction === 'create' && pendingData) {
          await createCompany(model.id, pendingData, email.trim().toLowerCase());
          return;
        }

        if (pendingAction === 'join' && pendingData) {
          await joinCompany(model.id, pendingData);
          return;
        }

        // No pending data — show inline form
        setNeedsCompany(true);
        setLoading(false);
        return;
      }

      // Check company approval status
      if (model.company_id) {
        try {
          const company = await pb.collection('companies').getOne(model.company_id);
          if (company.suspended) { router.replace('/suspended'); return; }
          if (!company.approved) { router.replace('/pending'); return; }
        } catch {}
      }

      if (!model.profile_complete) {
        router.replace('/onboarding');
        return;
      }

      router.replace('/dashboard');
    } catch (e: any) {
      if (e?.status === 400) {
        setError('Incorrect email or password.');
      } else {
        setError(e?.message || 'Sign in failed. Try again.');
      }
      setLoading(false);
    }
  };

  const createCompany = async (userId: string, name: string, ownerEmail: string) => {
    try {
      const code = genCode();
      const company = await pb.collection('companies').create({
        name,
        invite_code: code,
        owner_id:    userId,
        plan:        'active',
        approved:    false,
        suspended:   false,
        rejected:    false,
      });
      const model = pb.authStore.model;
      await pb.collection('users').update(userId, {
        company_id:           company.id,
        role:                 'owner',
        pending_action:       '',
        pending_company_name: '',
      });
      await pb.collection('users').authRefresh();
      // Notify admin of new company request (fire-and-forget)
      fetch('/api/admin/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` },
        body: JSON.stringify({ companyName: name, ownerName: model?.name || '', ownerEmail }),
      }).catch(() => {});
      router.replace('/pending');
    } catch {
      setError('Could not create company. Try again.');
      setLoading(false);
    }
  };

  const joinCompany = async (userId: string, code: string) => {
    try {
      const company = await pb.collection('companies').getFirstListItem(`invite_code="${code}"`);
      await pb.collection('users').update(userId, {
        company_id:           company.id,
        role:                 'worker',
        pending_action:       '',
        pending_company_name: '',
      });
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
    if (companyMode === 'join' && inviteCode.trim().length < 6) { setError('Enter a valid invitation code.'); return; }

    setCompanyLoading(true);
    if (companyMode === 'create') {
      await createCompany(model.id, companyName.trim(), model.email || email.trim().toLowerCase());
    } else {
      await joinCompany(model.id, inviteCode.trim().toUpperCase());
    }
    setCompanyLoading(false);
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
            <ArchiveBoxIcon className="w-8 h-8 text-white/70" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {needsCompany ? 'Set Up Your Company' : 'Welcome back'}
          </h1>
          <p className="text-white/30 text-sm mt-1.5">
            {needsCompany ? 'One last step before you can start' : 'Sign in to your workspace'}
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
          {/* Success banners */}
          {verified && !error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-xl"
            >
              ✓ Email verified! Sign in to continue.
            </motion.div>
          )}
          {reset && !error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-xl"
            >
              ✓ Password updated! Sign in with your new password.
            </motion.div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl overflow-hidden"
              >
                <span className="flex-1">{error}</span>
                <button onClick={() => setError('')} className="text-red-400/60 hover:text-red-400 text-lg leading-none">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* LOGIN FORM */}
          {!needsCompany && (
            <>
              <div>
                <label className="text-xs text-white/30 font-medium mb-1.5 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all text-white placeholder-white/20"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', caretColor: 'white' }}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-white/30 font-medium mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all text-white placeholder-white/20"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', caretColor: 'white' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => router.push('/reset-password')}
                  className="text-xs text-white/25 hover:text-white/50 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(96,165,250,0.25) 0%, rgba(167,139,250,0.25) 100%)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <>Sign In <ArrowRightIcon className="w-3.5 h-3.5" /></>}
              </button>

              <p className="text-center text-xs text-white/25">
                No account?{' '}
                <button onClick={() => router.push('/signup')} className="text-blue-400/70 hover:text-blue-400 transition-colors">
                  Create one
                </button>
              </p>
            </>
          )}

          {/* COMPANY SETUP (no pending_action) */}
          {needsCompany && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCompanyMode('create')}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all"
                  style={{
                    background: companyMode === 'create' ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.03)',
                    border: companyMode === 'create' ? '1px solid rgba(96,165,250,0.3)' : '1px solid rgba(255,255,255,0.07)',
                    color: companyMode === 'create' ? 'rgba(147,197,253,1)' : 'rgba(255,255,255,0.35)',
                  }}
                >
                  <BuildingOffice2Icon className="w-3.5 h-3.5" />
                  <span>Create</span>
                </button>
                <button
                  onClick={() => setCompanyMode('join')}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all"
                  style={{
                    background: companyMode === 'join' ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)',
                    border: companyMode === 'join' ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(255,255,255,0.07)',
                    color: companyMode === 'join' ? 'rgba(196,181,253,1)' : 'rgba(255,255,255,0.35)',
                  }}
                >
                  <TicketIcon className="w-3.5 h-3.5" />
                  <span>Join</span>
                </button>
              </div>

              {companyMode === 'create' ? (
                <div>
                  <label className="text-xs text-white/30 font-medium mb-1.5 block">Company name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Acme Restoration Co."
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all text-white placeholder-white/20"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', caretColor: 'white' }}
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs text-white/30 font-medium mb-1.5 block">Invitation code</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="XXXXXXXX"
                    maxLength={8}
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl text-center text-xl tracking-widest font-bold outline-none transition-all text-white placeholder-white/15"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', caretColor: 'white' }}
                  />
                </div>
              )}

              <button
                onClick={handleCompanySubmit}
                disabled={companyLoading}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(96,165,250,0.25) 0%, rgba(167,139,250,0.25) 100%)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {companyLoading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : companyMode === 'create' ? 'Create Company' : 'Join Company'}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 100%)' }}>
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
