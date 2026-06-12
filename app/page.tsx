'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getToken } from '@/lib/api';
import { Lock, ArrowRight } from 'lucide-react';

const PHRASES = [
  'Content & Records Management.',
  'Secure Document Storage.',
  'Professional Archive Solutions.',
  'Trusted Warehouse Services.',
];

export default function Home() {
  const router = useRouter();
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [displayed, setDisplayed] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [typing, setTyping] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace('/dashboard');
  }, [router]);

  useEffect(() => {
    const phrase = PHRASES[phraseIndex];
    let timeout: ReturnType<typeof setTimeout>;
    if (typing) {
      if (displayed.length < phrase.length) {
        timeout = setTimeout(() => setDisplayed(phrase.slice(0, displayed.length + 1)), 55);
      } else {
        timeout = setTimeout(() => setTyping(false), 2400);
      }
    } else {
      if (displayed.length > 0) {
        timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 28);
      } else {
        setPhraseIndex(i => (i + 1) % PHRASES.length);
        setTyping(true);
      }
    }
    return () => clearTimeout(timeout);
  }, [displayed, typing, phraseIndex]);

  const handleSubmit = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok) {
        router.replace('/login');
      } else {
        setError(data.error || 'Incorrect code.');
        setCode('');
      }
    } catch {
      setError('Connection error. Try again.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    if (loading) return;
    setShowCodeInput(false);
    setCode('');
    setError('');
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 50%, #0d1117 100%)' }}
    >
      {/* Video background */}
      <video
        autoPlay muted loop playsInline
        onCanPlay={() => setVideoLoaded(true)}
        className="absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-1000"
        style={{ opacity: 0 }}
        src="/bg.mp4"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 z-10" style={{
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.75) 100%)'
      }} />


      {/* Curtain */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.8, ease: [0.43, 0.13, 0.23, 0.96] }}
        className="absolute inset-0 z-40 bg-black pointer-events-none"
      />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center text-center px-6 w-full max-w-lg">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="h-px w-8 bg-white/20" />
          <span className="text-white/40 text-[11px] tracking-[0.25em] uppercase">
            Archive Contents Restoration
          </span>
          <div className="h-px w-8 bg-white/20" />
        </motion.div>

        {/* Main title */}
        <motion.h1
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 1.0, duration: 1.0, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-4xl md:text-6xl font-black text-white leading-none tracking-tight mb-3"
          style={{ textShadow: '0 2px 40px rgba(0,0,0,0.5)' }}
        >
          Warehouse
        </motion.h1>
        <motion.h1
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 1.1, duration: 1.0, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-4xl md:text-6xl font-black leading-none tracking-tight mb-10"
          style={{
            background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f472b6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none',
          }}
        >
          Manager
        </motion.h1>

        {/* Portal button */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.7 }}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCodeInput(true)}
          className="group flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-semibold text-white transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(96,165,250,0.15) 0%, rgba(167,139,250,0.15) 100%)',
            border: '1px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <Lock size={15} className="text-white/70" />
          <span>Portal Access</span>
          <ArrowRight size={14} className="text-white/40 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all" />
        </motion.button>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 1 }}
          className="mt-5 text-white/20 text-xs tracking-wide"
        >
          Authorized personnel only
        </motion.p>
      </div>

      {/* Typewriter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1 }}
        className="absolute bottom-6 left-6 md:left-8 z-20 flex items-center gap-1"
      >
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.22)' }}>{displayed}</span>
        <span className="inline-block w-px h-3 bg-white/20 animate-pulse" />
      </motion.div>

      {/* PixelCore */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4, duration: 1 }}
        className="absolute bottom-6 right-6 md:right-8 z-20 text-xs"
        style={{ color: 'rgba(255,255,255,0.15)' }}
      >
        Built by <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>PixelCore</span>
      </motion.p>

      {/* Code Modal */}
      <AnimatePresence>
        {showCodeInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)' }}
            onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="w-full max-w-xs rounded-3xl p-8"
              style={{
                background: 'linear-gradient(135deg, rgba(15,15,25,0.98) 0%, rgba(20,20,35,0.98) 100%)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 40px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)',
              }}
            >
              {/* Icon */}
              <div className="flex flex-col items-center mb-7">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(96,165,250,0.15) 0%, rgba(167,139,250,0.15) 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <Lock className="text-white/60" size={20} />
                </div>
                <h2 className="text-white font-bold text-lg">Portal Access</h2>
                <p className="text-white/30 text-xs mt-1">Enter your access code to continue</p>
              </div>

              <input
                type="password"
                value={code}
                onChange={e => { setCode(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="••••"
                disabled={loading}
                className="w-full px-4 py-3.5 rounded-xl text-center tracking-[0.5em] outline-none transition-all text-white text-xl font-bold disabled:opacity-50"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: error ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.1)',
                  caretColor: 'white',
                  color: 'white',
                }}
                autoFocus
                inputMode="numeric"
              />

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-red-400 text-xs text-center mt-2.5"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeModal}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl text-white/30 text-sm hover:text-white/50 transition-colors disabled:opacity-40"
                  style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !code.trim()}
                  className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, rgba(96,165,250,0.25) 0%, rgba(167,139,250,0.25) 100%)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <>Continue <ArrowRight size={13} /></>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
