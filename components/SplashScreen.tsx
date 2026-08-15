'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';

export default function SplashScreen() {
  const { loading } = useAuth();
  const [visible, setVisible] = useState(true);
  const [videoEnded, setVideoEnded] = useState(false);
  const authDoneRef = useRef(false);

  // Track when auth is done
  useEffect(() => {
    if (!loading) authDoneRef.current = true;
  }, [loading]);

  // Hide once BOTH video ended AND auth is done
  useEffect(() => {
    if (videoEnded && !loading) {
      setVisible(false);
    }
  }, [videoEnded, loading]);

  // Fallback: if video fails / takes too long, hide after 2.5s max
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#0f0f0f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <video
            src="/splash.mp4"
            autoPlay
            muted
            playsInline
            onEnded={() => setVideoEnded(true)}
            onError={() => setVisible(false)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
