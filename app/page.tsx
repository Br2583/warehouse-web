'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { pb } from '@/lib/pb';
import { ArrowRight, LogIn, UserPlus } from 'lucide-react';

const PHRASES = [
  'Content & Records Management.',
  'Secure Document Storage.',
  'Professional Archive Solutions.',
  'Trusted Warehouse Services.',
];

export default function Home() {
  const router = useRouter();
  const [displayed, setDisplayed] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [typing, setTyping] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    if (pb.authStore.isValid) {
      router.replace('/dashboard');
    }
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
        style={{ opacity: videoLoaded ? 0.55 : 0 }}
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
          className="text-4xl md:text-6xl font-black leading-none tracking-tight mb-12"
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

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.7 }}
          className="flex flex-col sm:flex-row gap-3 w-full max-w-xs"
        >
          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/login')}
            className="group flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(96,165,250,0.25) 0%, rgba(167,139,250,0.25) 100%)',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <LogIn size={15} className="text-white/70" />
            <span>Sign In</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/signup')}
            className="group flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-semibold transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(96,165,250,0.08) 0%, rgba(167,139,250,0.08) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              color: 'rgba(255,255,255,0.65)',
            }}
          >
            <UserPlus size={15} />
            <span>Get Started</span>
            <ArrowRight size={13} className="text-white/30 group-hover:translate-x-0.5 transition-transform" />
          </motion.button>
        </motion.div>
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
    </div>
  );
}
