'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getToken } from '@/lib/api';
import { Lock } from 'lucide-react';

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
  const [error, setError] = useState(false);
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

  const handleSubmit = () => {
    if (code === '2019') {
      document.cookie = 'portal_unlocked=true; path=/; max-age=2592000';
      router.replace('/login');
    } else {
      setError(true);
      setCode('');
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 50%, #0d1117 100%)' }}
    >
      {/* Video background with fallback gradient */}
      <video
        autoPlay muted loop playsInline
        onCanPlay={() => setVideoLoaded(true)}
        className="absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-1000"
        style={{ opacity: videoLoaded ? 1 : 0 }}
        src="/bg.mp4"
      />
      <div className="absolute inset-0 z-10 bg-black/45" />

      {/* Curtain */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.8, ease: [0.43, 0.13, 0.23, 0.96] }}
        className="absolute inset-0 z-40 bg-black pointer-events-none"
      />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center text-center px-6 w-full max-w-md">

        {/* Company name */}
        <motion.div
          initial={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.9, duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex items-center gap-3 mb-12"
        >
          <div className="h-px flex-1 max-w-8 bg-white/25" />
          <span className="text-white/40 text-xs tracking-[0.2em] uppercase text-center">
            Archive Contents Restoration
          </span>
          <div className="h-px flex-1 max-w-8 bg-white/25" />
        </motion.div>

        {/* Portal Access button */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCodeInput(true)}
          className="flex items-center justify-center gap-2 px-10 py-3.5 rounded-2xl text-sm font-semibold text-white"
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.18)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Lock size={14} />
          Portal Access
        </motion.button>
      </div>

      {/* Typewriter — bottom left */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1 }}
        className="absolute bottom-5 left-5 md:left-8 z-20 flex items-center gap-1"
      >
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{displayed}</span>
        <span className="inline-block w-px h-3 bg-white/25 animate-pulse" />
      </motion.div>

      {/* PixelCore — bottom right */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4, duration: 1 }}
        className="absolute bottom-5 right-5 md:right-8 z-20 text-xs"
        style={{ color: 'rgba(255,255,255,0.15)' }}
      >
        Built by <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>PixelCore</span>
      </motion.p>

      {/* Code Modal */}
      <AnimatePresence>
        {showCodeInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(16px)' }}
            onClick={e => { if (e.target === e.currentTarget) { setShowCodeInput(false); setCode(''); } }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-full max-w-xs rounded-2xl p-7"
              style={{
                background: 'rgba(10,10,14,0.97)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
              }}
            >
              <div className="text-center mb-6">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <Lock className="text-white/50" size={18} />
                </div>
                <h2 className="text-white font-bold text-base">Portal Access</h2>
                <p className="text-white/30 text-xs mt-1">Enter your access code</p>
              </div>

              <input
                type="password"
                value={code}
                onChange={e => setCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="••••"
                className="w-full px-4 py-3 rounded-xl text-center tracking-[0.4em] outline-none transition-all text-white text-lg"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: error ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  caretColor: 'white',
                }}
                autoFocus
                inputMode="numeric"
              />

              {error && (
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-red-400 text-xs text-center mt-2"
                >
                  Incorrect code
                </motion.p>
              )}

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => { setShowCodeInput(false); setCode(''); }}
                  className="flex-1 py-2.5 rounded-xl text-white/30 text-sm hover:text-white/50 transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm hover:brightness-125 transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
