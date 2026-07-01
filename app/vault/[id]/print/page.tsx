'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  READY: 'Ready to Go',
  DELIVERED: 'Delivered',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  READY: '#22c55e',
  DELIVERED: '#3b82f6',
};

export default function VaultPrintPage() {
  const { id } = useParams();
  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warehouseName, setWarehouseName] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get(`/api/boxes/${id}`)
      .then(async (v) => {
        setVault(v);
        if (v.warehouse_id) {
          try {
            const whs = await api.get('/api/warehouses');
            const wh = (Array.isArray(whs) ? whs : whs?.warehouses || []).find((w: any) => w.id === v.warehouse_id || w.warehouse_id === v.warehouse_id);
            if (wh) setWarehouseName(wh.name);
          } catch {}
        }
      })
      .catch(() => setError('Vault not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !vault) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">{error || 'Not found'}</div>
  );

  const qrUrl = `https://managerwarehouse.cc/vault/${id}`;

  const status = vault.estado || vault.status || 'PENDING';
  const pos = vault.position || `${vault.row}${vault.column}-L${vault.level}`;
  const level = vault.level === 1 ? 'Lower' : 'Upper';

  return (
    <>
      <style>{`
        @media print {
          @page { size: 4in 6in; margin: 0.2in; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body { background: #f8fafc; margin: 0; font-family: system-ui, sans-serif; }
      `}</style>

      {/* Print button — hidden on actual print */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
        >
          Print / Save PDF
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
      </div>

      {/* Label — optimized for 4"×6" label or letter paper */}
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 w-full max-w-sm shadow-lg print:shadow-none print:border-gray-300 print:rounded-none">

          {/* Header */}
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-100">
            <div className="w-8 h-8 bg-gray-950 rounded-[8px] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-[9px] italic leading-none">WM</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">Warehouse Manager</p>
              {warehouseName && <p className="text-xs text-gray-400">{warehouseName}</p>}
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
              <QRCodeSVG
                value={qrUrl}
                size={180}
                bgColor="#f9fafb"
                fgColor="#111827"
                level="H"
              />
            </div>
          </div>

          {/* Vault Info */}
          <div className="space-y-3">
            <div className="text-center mb-4">
              <p className="text-3xl font-black text-gray-900 tracking-tight">{pos}</p>
              <p className="text-sm text-gray-400 mt-0.5">{level} Level</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">Client</p>
                <p className="font-semibold text-gray-900 truncate">{vault.client_name || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">Job Type</p>
                <p className="font-semibold text-gray-900">{vault.job_type || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">Content</p>
                <p className="font-semibold text-gray-900">{vault.content_type || '—'}</p>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: `${STATUS_COLOR[status]}15`, border: `1px solid ${STATUS_COLOR[status]}30` }}>
                <p className="text-[10px] uppercase tracking-wide font-medium mb-0.5" style={{ color: STATUS_COLOR[status] }}>Status</p>
                <p className="font-bold" style={{ color: STATUS_COLOR[status] }}>{STATUS_LABEL[status] || status}</p>
              </div>
            </div>

            {vault.packer && (
              <div className="text-xs text-gray-400 text-center pt-1">
                Packer: <span className="text-gray-600 font-medium">{vault.packer}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-300">Scan QR to view full vault details</p>
            <p className="text-[9px] text-gray-200 mt-0.5 break-all">{qrUrl}</p>
          </div>
        </div>
      </div>
    </>
  );
}
