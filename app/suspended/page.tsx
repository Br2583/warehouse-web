'use client';

import { motion } from 'framer-motion';
import { ShieldOff, LogOut, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function SuspendedPage() {
  const { logout } = useAuth();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 60%, #0d1117 100%)' }}
    >
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-[0.06] blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #ef4444 0%, #dc2626 50%, transparent 70%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm relative z-10 text-center"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          <ShieldOff className="w-8 h-8 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">Cuenta suspendida</h1>
        <p className="text-white/40 text-sm leading-relaxed mb-8">
          El acceso a tu empresa fue suspendido temporalmente.<br />
          Contactá al administrador para más información.
        </p>

        <a
          href="mailto:noreply@managerwarehouse.cc"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium transition-all mb-3"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: 'rgba(252,165,165,0.9)',
          }}
        >
          <Mail className="w-4 h-4" />
          Contactar administración
        </a>

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
