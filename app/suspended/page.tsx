'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldExclamationIcon, ArrowRightOnRectangleIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function SuspendedPage() {
  const { logout, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user?.company_id) return;
    const check = async () => {
      try {
        const company = await api.get(`/api/companies/${user.company_id}`);
        if (!company.suspended && company.approved && !company.rejected) {
          router.replace('/dashboard');
        }
      } catch { /* ignore */ }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [user?.company_id]);

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

        {/* Icon */}
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldExclamationIcon className="w-8 h-8 text-red-500" />
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">Account suspended</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          Access to your company has been temporarily suspended. Contact the administrator for more information.
        </p>

        <div className="space-y-3">
          <a
            href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@managerwarehouse.cc'}`}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-red-600 text-white font-bold text-sm hover:bg-red-700 active:scale-[0.98] transition-all shadow-[0_2px_12px_rgba(239,68,68,.3)]"
          >
            <EnvelopeIcon className="w-4 h-4" />
            Contact support
          </a>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-all"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </motion.div>
    </div>
  );
}
