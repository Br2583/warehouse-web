'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ClockIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { pb } from '@/lib/pb';
import { useAuth } from '@/lib/auth-context';

export default function PendingPage() {
  const router = useRouter();
  const { logout, refreshUser } = useAuth();
  const redirecting = useRef(false);

  useEffect(() => {
    const check = async () => {
      if (redirecting.current) return;
      if (!pb.authStore.isValid) { window.location.href = '/login'; return; }
      if (!pb.authStore.model?.company_id) return;
      try {
        const company = await pb.collection('companies').getOne(pb.authStore.model.company_id);
        if (company.rejected) {
          redirecting.current = true;
          router.replace('/rejected');
          return;
        }
        if (company.approved && !company.suspended) {
          redirecting.current = true;
          await pb.collection('users').authRefresh();
          await refreshUser();
          window.location.href = '/onboarding';
        }
      } catch {}
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: '#f8fafc',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='90'%3E%3Ctext x='70' y='62' font-family='Impact' font-size='44' font-weight='900' fill='rgba(0%2C0%2C0%2C0.04)' text-anchor='middle' font-style='italic'%3EWM%3C/text%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '140px 90px'
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,.09)] border border-gray-200 p-8 text-center"
      >
        {/* WM Logo */}
        <div className="flex flex-col items-center mb-8">
          <span className="font-black italic text-gray-950 select-none" style={{ fontSize: '48px', letterSpacing: '-3px', lineHeight: 1 }}>WM</span>
          <span className="text-[10px] font-semibold text-slate-400 tracking-[2px] uppercase mt-0.5">Warehouse Manager</span>
        </div>

        {/* Animated clock icon */}
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
          className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5"
        >
          <ClockIcon className="w-8 h-8 text-amber-500" />
        </motion.div>

        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">Request submitted</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-5">
          Your company is under review.<br />
          We'll notify you by email once it's approved.
        </p>

        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-7">
          <p className="text-xs text-amber-700 leading-relaxed">
            This page refreshes automatically. You don't need to do anything else right now. Approval usually takes 24–48 hours.
          </p>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 mx-auto text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          Sign out
        </button>
      </motion.div>
    </div>
  );
}
