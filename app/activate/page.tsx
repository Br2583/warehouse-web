'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

function ActivateInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage('Enlace inválido.'); return; }

    fetch('/api/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setStatus('ok');
          setTimeout(() => router.replace('/login'), 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'No se pudo activar la cuenta.');
        }
      })
      .catch(() => { setStatus('error'); setMessage('Error de red. Intentá de nuevo.'); });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-gray-200 p-10 max-w-sm w-full text-center shadow-[0_20px_80px_rgba(0,0,0,.09)]">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-gray-950 rounded-[8px] flex items-center justify-center">
            <span className="text-white font-black text-[9px] italic leading-none">WM</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">Warehouse Manager</span>
        </div>

        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900">Activando cuenta...</h2>
            <p className="text-sm text-slate-400 mt-2">Un momento</p>
          </>
        )}
        {status === 'ok' && (
          <>
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-7 h-7 text-green-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">¡Cuenta activada!</h2>
            <p className="text-sm text-slate-400 mt-2">Tu empresa ya está activa. Redirigiendo al login...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <XCircleIcon className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Error de activación</h2>
            <p className="text-sm text-slate-400 mt-2">{message}</p>
            <p className="text-xs text-slate-300 mt-3">El enlace puede haber expirado (1 hora). Contactá al administrador.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    }>
      <ActivateInner />
    </Suspense>
  );
}
