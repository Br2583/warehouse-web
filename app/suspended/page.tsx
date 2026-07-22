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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,.09)] border border-gray-200 p-8 text-center"
      >
        {/* WM Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-gray-950 rounded-[8px] flex items-center justify-center">
            <span className="text-white font-black text-[9px] italic leading-none">WM</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">Warehouse Manager</span>
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
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[10px] bg-red-600 text-white font-bold text-sm hover:bg-red-700 active:scale-[0.98] transition-all shadow-[0_2px_12px_rgba(239,68,68,.3)]"
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
