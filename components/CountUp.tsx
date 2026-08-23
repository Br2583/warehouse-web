'use client';

import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

export function CountUp({ value, delay = 0 }: { value: number; delay?: number }) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, v => Math.round(v).toLocaleString());
  useEffect(() => {
    const t = setTimeout(() => {
      const c = animate(mv, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
      return c.stop;
    }, delay);
    return () => clearTimeout(t);
  }, [value, delay, mv]);
  return <motion.span>{display}</motion.span>;
}
