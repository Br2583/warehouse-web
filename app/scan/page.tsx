'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { XMarkIcon } from '@heroicons/react/24/outline';
import QRScanner from '@/components/QRScanner';
import { pb } from '@/lib/pb';
import { useAuth } from '@/lib/auth-context';

type ScanState = 'scanning' | 'searching' | 'error';

export default function ScanPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [state, setState] = useState<ScanState>('scanning');
  const [errorMsg, setErrorMsg] = useState('');

  const handleResult = useCallback(async (boxId: string) => {
    setState('searching');
    try {
      const records = await pb.collection('vaults').getFullList({
        filter: `id="${boxId}" && company_id="${user?.company_id}"`,
        fields: 'id,box_id,warehouse_id',
      });
      if (records.length === 0) {
        setErrorMsg('Vault not found. It may belong to a different company.');
        setState('error');
        return;
      }
      const vault = records[0];
      router.push(`/warehouses/${vault.warehouse_id}?vault=${vault.id}`);
    } catch {
      setErrorMsg('Could not look up the vault. Check your connection.');
      setState('error');
    }
  }, [user?.company_id, router]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
        className="flex items-center justify-between px-4 pt-4 pb-3"
      >
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">Scan QR Code</h1>
          <p className="text-white/50 text-xs mt-0.5">Point camera at a vault label</p>
        </div>
        <button
          onClick={() => { if (window.history.length > 1) router.back(); else router.push('/dashboard'); }}
          className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:scale-95 transition-transform"
        >
          <XMarkIcon className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Scanner or states */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        {state === 'scanning' && (
          <div className="w-full max-w-sm">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
              <InlineScanner onResult={handleResult} />
            </div>
            <p className="mt-4 text-center text-sm text-white/50">
              Point camera at a vault QR code
            </p>
          </div>
        )}

        {state === 'searching' && (
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold">Looking up vault...</p>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center max-w-xs">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XMarkIcon className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-white font-semibold mb-2">Vault not found</p>
            <p className="text-white/50 text-sm mb-6">{errorMsg}</p>
            <button
              onClick={() => setState('scanning')}
              className="px-6 py-3 bg-gray-950 text-white rounded-full font-semibold text-sm active:scale-95 transition-transform"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline version of QRScanner that doesn't render the full-screen overlay
function InlineScanner({ onResult }: { onResult: (id: string) => void }) {
  return (
    <QRScanner
      onClose={() => {}}
      onResult={onResult}
      inline
    />
  );
}
