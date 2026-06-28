'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Ticket, ArrowLeft, Package, Eye, EyeOff } from 'lucide-react';
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) { setError('Enter your name.'); return; }
    if (!email.trim()) { setError('Enter your email.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== passwordConfirm) { setError('Passwords do not match.'); return; }
    if (mode === 'create' && !companyName.trim()) { setError('Enter your company name.'); return; }
    if (mode === 'join' && inviteCode.trim().length < 6) { setError('Enter a valid invitation code.'); return; }

    setLoading(true);
    try {
      await pb.collection('users').create({
        name:                 name.trim(),
        email:                email.trim().toLowerCase(),
        password,
        passwordConfirm,
        pending_action:       mode,
        pending_company_name: mode === 'create' ? companyName.trim() : inviteCode.trim().toUpperCase(),
        role:                 'worker',
        notifications_enabled: false,
      });

      await pb.collection('users').requestVerification(email.trim().toLowerCase());

      // Save email for the verify-email page resend button
      localStorage.setItem('verify_email', email.trim().toLowerCase());
      router.push('/verify-email');
    } catch (e: any) {
      const msg = e?.response?.data;
      if (msg?.email?.code === 'validation_invalid_email') {
        setError('Invalid email address.');
      } else if (msg?.email?.code === 'validation_not_unique') {
        setError('An account with this email already exists.');
      } else if (msg?.password?.message) {
        setError(msg.password.message);
      } else {
        setError(e?.message || 'Could not create account. Try again.');
      }
    } finally {
      setLoading(false);
    }
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
            <Package className="w-8 h-8 text-white/70" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create Account</h1>
          <p className="text-white/30 text-sm mt-1.5">Join Warehouse Manager</p>
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
          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl overflow-hidden"
              >
                <span className="flex-1">{error}</span>
                <button onClick={() => setError('')} className="text-red-400/60 hover:text-red-400 text-lg leading-none">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Name */}
          <div>
            <label className="text-xs text-white/30 font-medium mb-1.5 block">Full name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Smith"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all text-white placeholder-white/20"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', caretColor: 'white' }}
              autoFocus
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs text-white/30 font-medium mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all text-white placeholder-white/20"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', caretColor: 'white' }}
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs text-white/30 font-medium mb-1.5 block">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all text-white placeholder-white/20"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', caretColor: 'white' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="text-xs text-white/30 font-medium mb-1.5 block">Confirm password</label>
            <input
              type={showPass ? 'text' : 'password'}
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Repeat password"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all text-white placeholder-white/20"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', caretColor: 'white' }}
            />
          </div>

          {/* Mode toggle */}
          <div className="pt-1">
            <p className="text-xs text-white/30 font-medium mb-2">I want to...</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('create')}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all"
                style={{
                  background: mode === 'create' ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.03)',
                  border: mode === 'create' ? '1px solid rgba(96,165,250,0.3)' : '1px solid rgba(255,255,255,0.07)',
                  color: mode === 'create' ? 'rgba(147,197,253,1)' : 'rgba(255,255,255,0.35)',
                }}
              >
                <Building2 size={14} />
                <span>Create company</span>
              </button>
              <button
                onClick={() => setMode('join')}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all"
                style={{
                  background: mode === 'join' ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)',
                  border: mode === 'join' ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(255,255,255,0.07)',
                  color: mode === 'join' ? 'rgba(196,181,253,1)' : 'rgba(255,255,255,0.35)',
                }}
              >
                <Ticket size={14} />
                <span>Join company</span>
              </button>
            </div>
          </div>

          {/* Company name or invite code */}
          <AnimatePresence mode="wait">
            {mode === 'create' ? (
              <motion.div key="create" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <label className="text-xs text-white/30 font-medium mb-1.5 block">Company name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Acme Restoration Co."
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all text-white placeholder-white/20"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', caretColor: 'white' }}
                />
              </motion.div>
            ) : (
              <motion.div key="join" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <label className="text-xs text-white/30 font-medium mb-1.5 block">Invitation code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  className="w-full px-4 py-3 rounded-xl text-center text-xl tracking-widest font-bold outline-none transition-all text-white placeholder-white/15"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', caretColor: 'white' }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            style={{
              background: 'linear-gradient(135deg, rgba(96,165,250,0.25) 0%, rgba(167,139,250,0.25) 100%)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Create Account'}
          </button>

          <p className="text-center text-xs text-white/25 pt-1">
            Already have an account?{' '}
            <button onClick={() => router.push('/login')} className="text-blue-400/70 hover:text-blue-400 transition-colors">
              Sign in
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
