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
    if (code === 'ARCHIVECONTENTS2019') {
      document.cookie = 'portal_unlocked=true; path=/; max-age=2592000';
      router.replace('/login');
    } else {
      setError(true);
      setCode('');
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-950">

      {/* Video */}
      <motion.video
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2.5, ease: [0.25, 0.1, 0.25, 1] }}
        autoPlay muted loop playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
        src="/bg.mp4"
      />
      <div className="absolute inset-0 z-10 bg-black/40" />

      {/* Curtain */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.8, ease: [0.43, 0.13, 0.23, 0.96] }}
        className="absolute inset-0 z-40 bg-black pointer-events-none"
      />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center text-center px-6 max-w-lg w-full">

        {/* Logo line */}
        <motion.div
          initial={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.9, duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex items-center gap-2 mb-10"
        >
          <div className="h-px w-8 bg-white/30" />
          <span className="text-white/40 text-xs tracking-[0.25em] uppercase">Archive Contents Restoration</span>
          <div className="h-px w-8 bg-white/30" />
        </motion.div>


        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <button
            onClick={() => setShowCodeInput(true)}
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
          >
            <Lock size={14} />
            Portal Access
          </button>
        </motion.div>
      </div>

      {/* Typewriter — bottom left corner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8, duration: 1 }}
        className="absolute bottom-6 left-8 z-20 flex items-center gap-1"
      >
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>{displayed}</span>
        <span className="inline-block w-px h-3 bg-white/30 animate-pulse" />
      </motion.div>

      {/* PixelCore — bottom right corner */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 1 }}
        className="absolute bottom-6 right-8 z-20 text-xs"
        style={{ color: 'rgba(255,255,255,0.18)' }}
      >
        Built by <span style={{ color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>PixelCore</span>
      </motion.p>

      {/* Code Modal */}
      <AnimatePresence>
        {showCodeInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)' }}
            onClick={e => { if (e.target === e.currentTarget) { setShowCodeInput(false); setCode(''); } }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-full max-w-sm rounded-2xl p-8"
              style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="text-center mb-6">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Lock className="text-white/60" size={20} />
                </div>
                <h2 className="text-white font-bold text-lg">Portal Access</h2>
                <p className="text-white/30 text-sm mt-1">Enter your access code</p>
              </div>

              <input
                type="password"
                value={code}
                onChange={e => setCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 rounded-xl text-white text-center tracking-widest outline-none transition-all placeholder-white/15"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: error ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
                }}
                autoFocus
              />

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-red-400 text-xs text-center mt-2">
                  Incorrect access code
                </motion.p>
              )}

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => { setShowCodeInput(false); setCode(''); }}
                  className="flex-1 py-2.5 rounded-xl text-white/30 text-sm transition-colors hover:text-white/50"
                  style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:brightness-125"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}
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
