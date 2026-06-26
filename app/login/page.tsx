'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Ticket, ArrowLeft, ArrowRight, Package, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { pb } from '@/lib/pb';

type Screen = 'main' | 'create' | 'join';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

const genCode = () => Math.random().toString(36).substring(2, 10).toUpperCase();

export default function LoginPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('main');
  const [companyName, setCompanyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (pb.authStore.isValid && pb.authStore.model?.company_id) {
      router.replace('/dashboard');
    } else {
      setLoading(false);
    }
  }, []);

  // After Google OAuth completes (PocketBase popup flow), handle company setup
  const afterOAuth = async (action: 'login' | 'create' | 'join') => {
    const model = pb.authStore.model;
    if (!model) { setError('Authentication failed'); setAuthLoading(false); return; }

    // Already has a company → go to dashboard
    if (model.company_id) { router.replace('/dashboard'); return; }

    if (action === 'login') {
      // Returning user with no company — ask them to create or join
      setScreen('main');
      setError('Your account has no company. Please create or join one.');
      setAuthLoading(false);
      return;
    }

    if (action === 'create') {
      try {
        const code = genCode();
        const company = await pb.collection('companies').create({
          name:        companyName.trim(),
          invite_code: code,
          portal_code: '2019',
          owner_id:    model.id,
          plan:        'active',
        });
        await pb.collection('users').update(model.id, {
          company_id: company.id,
          role:       'owner',
        });
        // Refresh auth so model has updated fields
        await pb.collection('users').authRefresh();
        router.replace('/dashboard');
      } catch (e: any) {
        setError(e.message || 'Failed to create company');
        setAuthLoading(false);
      }
      return;
    }

    if (action === 'join') {
      try {
        const company = await pb.collection('companies').getFirstListItem(`invite_code="${inviteCode.trim().toUpperCase()}"`);
        await pb.collection('users').update(model.id, {
          company_id: company.id,
          role:       'worker',
        });
        await pb.collection('users').authRefresh();
        router.replace('/dashboard');
      } catch {
        setError('Invitation code not found or expired');
        setAuthLoading(false);
      }
      return;
    }
  };

  const startGoogleAuth = async (action: 'login' | 'create' | 'join') => {
    if (action === 'create' && !companyName.trim()) { setError('Enter a company name'); return; }
    if (action === 'join' && inviteCode.length < 6)  { setError('Enter a valid invitation code'); return; }

    setError('');
    setAuthLoading(true);
    try {
      await pb.collection('users').authWithOAuth2({
        provider: 'google',
        createData: { role: 'worker', notifications_enabled: false },
      });
      await afterOAuth(action);
    } catch (e: any) {
      if (e?.message?.includes('cancelled') || e?.message?.includes('popup')) {
        setError('Sign-in cancelled');
      } else if (e?.message?.includes('google') || e?.message?.includes('provider')) {
        setError('Google sign-in is not configured yet. Contact your administrator.');
      } else {
        setError(e?.message || 'Authentication error');
      }
      setAuthLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 100%)' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/30 text-sm">{authLoading ? 'Authenticating...' : 'Loading...'}</p>
        </motion.div>
      </div>
    );
  }

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
            <Package className="w-8 h-8 text-white/70" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Warehouse Manager</h1>
          <p className="text-white/30 text-sm mt-1.5">
            {screen === 'main'   && 'Access your workspace'}
            {screen === 'create' && 'Create a new company'}
            {screen === 'join'   && 'Join with invitation code'}
          </p>
        </div>

        <div
          className="rounded-3xl p-7"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-5 overflow-hidden"
              >
                <span className="flex-1">{error}</span>
                <button onClick={() => setError('')} className="text-red-400/60 hover:text-red-400 text-lg leading-none">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* MAIN */}
            {screen === 'main' && (
              <motion.div key="main" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
                <button
                  onClick={() => startGoogleAuth('login')}
                  className="w-full flex items-center gap-3 py-3.5 px-5 rounded-2xl font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(96,165,250,0.18) 0%, rgba(167,139,250,0.18) 100%)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'white',
                  }}
                >
                  <GoogleIcon />
                  <span className="flex-1 text-left">Continue with Google</span>
                  <ArrowRight size={15} className="text-white/30" />
                </button>

                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-xs text-white/20">or</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>

                <button
                  onClick={() => { setError(''); setScreen('create'); }}
                  className="w-full flex items-center gap-3 py-3.5 px-5 rounded-2xl text-sm font-medium transition-all hover:bg-white/8 active:scale-[0.98]"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                >
                  <Building2 size={16} className="text-blue-400/60" />
                  <span className="flex-1 text-left">Create New Company</span>
                  <ArrowRight size={14} className="text-white/20" />
                </button>

                <button
                  onClick={() => { setError(''); setScreen('join'); }}
                  className="w-full flex items-center gap-3 py-3.5 px-5 rounded-2xl text-sm font-medium transition-all hover:bg-white/8 active:scale-[0.98]"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                >
                  <Ticket size={16} className="text-purple-400/60" />
                  <span className="flex-1 text-left">Join with Invitation Code</span>
                  <ArrowRight size={14} className="text-white/20" />
                </button>

                <p className="text-white/15 text-xs text-center pt-3">Built by PixelCore</p>
              </motion.div>
            )}

            {/* CREATE COMPANY */}
            {screen === 'create' && (
              <motion.div key="create" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                <button onClick={() => { setScreen('main'); setError(''); }}
                  className="flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors mb-1">
                  <ArrowLeft size={14} /> Back
                </button>

                <div className="text-center py-2">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
                    <Building2 size={20} className="text-blue-400" />
                  </div>
                  <p className="text-white/30 text-xs">You will be the owner and can invite team members</p>
                </div>

                <input
                  type="text"
                  placeholder="Company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && startGoogleAuth('create')}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all text-white placeholder-white/20"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', caretColor: 'white' }}
                  autoFocus
                />

                <button
                  onClick={() => startGoogleAuth('create')}
                  disabled={!companyName.trim()}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 hover:brightness-110"
                  style={{
                    background: 'linear-gradient(135deg, rgba(96,165,250,0.2) 0%, rgba(167,139,250,0.2) 100%)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'white',
                  }}
                >
                  <GoogleIcon /> Continue with Google
                </button>
              </motion.div>
            )}

            {/* JOIN COMPANY */}
            {screen === 'join' && (
              <motion.div key="join" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                <button onClick={() => { setScreen('main'); setError(''); }}
                  className="flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors mb-1">
                  <ArrowLeft size={14} /> Back
                </button>

                <div className="text-center py-2">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
                    <Ticket size={20} className="text-purple-400" />
                  </div>
                  <p className="text-white/30 text-xs">Your admin shared an invitation code with you</p>
                </div>

                <input
                  type="text"
                  placeholder="XXXXXXXX"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && startGoogleAuth('join')}
                  maxLength={8}
                  className="w-full px-4 py-3.5 rounded-xl text-center text-2xl tracking-widest font-bold outline-none transition-all text-white placeholder-white/15"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', caretColor: 'white' }}
                  autoFocus
                />

                <button
                  onClick={() => startGoogleAuth('join')}
                  disabled={inviteCode.length < 6}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 hover:brightness-110"
                  style={{
                    background: 'linear-gradient(135deg, rgba(167,139,250,0.2) 0%, rgba(96,165,250,0.2) 100%)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'white',
                  }}
                >
                  <GoogleIcon /> Verify with Google &amp; Join
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
