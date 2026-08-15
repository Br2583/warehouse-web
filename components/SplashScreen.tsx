'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';

const MIN_MS = 800;

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

  // Hard cap: never show longer than 3 seconds
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
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#0f0f0f',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <motion.img
            src="/wm-logo.png"
            alt="WM"
            initial={{ scale: 0.82, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.34, 1.3, 0.64, 1] }}
            style={{
              width: 'clamp(130px, 38vw, 200px)',
              height: 'clamp(130px, 38vw, 200px)',
              objectFit: 'contain',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
            draggable={false}
          />
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 0.35, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            style={{
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginTop: 14,
              userSelect: 'none',
            }}
          >
            Warehouse Manager
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
