'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';

const MIN_MS = 900;

export default function SplashScreen() {
  const { loading } = useAuth();
  const [visible, setVisible] = useState(true);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (loading) return;
    const elapsed = Date.now() - startRef.current;
    const wait = Math.max(0, MIN_MS - elapsed);
    const t = setTimeout(() => setVisible(false), wait);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#0a0a0a',
            overflow: 'hidden',
          }}
        >
          <motion.img
            src="/wm-splash.png"
            alt=""
            initial={{ scale: 1.06, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
            draggable={false}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
