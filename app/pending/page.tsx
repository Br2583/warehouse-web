'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock, LogOut } from 'lucide-react';
import { pb } from '@/lib/pb';
import { useAuth } from '@/lib/auth-context';
import { useRef } from 'react';

export default function PendingPage() {
  const router = useRouter();
  const { logout, refreshUser } = useAuth();
  const redirecting = useRef(false);

  useEffect(() => {
    const check = async () => {
      if (redirecting.current) return;
      if (!pb.authStore.isValid || !pb.authStore.model?.company_id) return;
      try {
        const company = await pb.collection('companies').getOne(pb.authStore.model.company_id);
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
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 60%, #0d1117 100%)' }}
    >
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-[0.06] blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #60a5fa 0%, #a78bfa 50%, transparent 70%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm relative z-10 text-center"
      >
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(96,165,250,0.2) 0%, rgba(167,139,250,0.2) 100%)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <Clock className="w-8 h-8 text-blue-400" />
        </motion.div>

        <h1 className="text-2xl font-bold text-white mb-3">Solicitud enviada</h1>
        <p className="text-white/40 text-sm leading-relaxed mb-8">
          Tu empresa está siendo revisada.<br />
          Te avisaremos por email cuando sea aprobada.<br />
          <span className="text-white/25">Este proceso suele tomar 24-48 horas.</span>
        </p>

        <div
          className="rounded-2xl p-4 mb-6 text-left"
          style={{
            background: 'rgba(96,165,250,0.06)',
            border: '1px solid rgba(96,165,250,0.15)',
          }}
        >
          <p className="text-xs text-blue-300/70">
            Esta página se actualiza automáticamente. No necesitás hacer nada más por ahora.
          </p>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 mx-auto text-sm text-white/30 hover:text-white/60 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </motion.div>
    </div>
  );
}
