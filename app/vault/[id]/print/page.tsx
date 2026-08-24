'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { api, sf } from '@/lib/api';
import { pb } from '@/lib/pb';
import { useAuth } from '@/lib/auth-context';

function VaultPrintContent() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    const tk = searchParams.get('tk');
    if (tk) pb.authStore.save(tk, null as any);
  }, [searchParams]);
  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warehouseName, setWarehouseName] = useState('');
  const [nOfM, setNOfM] = useState<{ n: number; m: number } | null>(null);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(!!(window as any).Capacitor?.isNativePlatform?.());
  }, []);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/boxes/${id}`)
      .then(async (v) => {
        setVault(v);
        if (v.warehouse_id) {
          try {
            const wh = await api.get(`/api/warehouses/${v.warehouse_id}`);
            if (wh?.name) setWarehouseName(wh.name);
          } catch {}
        }
        if (v.client_name && user?.company_id) {
          try {
            const filter = `company_id="${sf(user.company_id)}" && client_name="${sf(v.client_name)}"`;
            const sorted = await pb.collection('vaults').getFullList({
              filter,
              fields: 'id,created',
              sort: 'created',
            });
            const idx = sorted.findIndex(cv => cv.id === id);
            if (sorted.length > 1) setNOfM({ n: idx >= 0 ? idx + 1 : 1, m: sorted.length });
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

  const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://managerwarehouse.cc'}/vault/${id}`;
  const status = vault.estado || vault.status || 'PENDING';
  const pos = vault.position || `${vault.row}${vault.column}-L${vault.level}`;
  const levelNum = Number(vault.level);
  const levelLabel = levelNum === 1 ? 'LOWER' : levelNum === 2 ? 'UPPER' : `L${levelNum}`;
  const companyName = user?.company_name || 'Warehouse Manager';
  const title = `Vault ${pos} — ${vault.client_name || 'No Client'}`;

  const jobType = vault.job_type || '';
  const TYPE_OF_LOSS = [
    { label: 'Fire Loss',    match: 'Fire'    },
    { label: 'Water Loss',   match: 'Water'   },
    { label: 'Mold',         match: 'Mold'    },
    { label: 'Moving',       match: 'Moving'  },
    { label: 'Storage Only', match: 'Storage' },
  ];

  const vaultStatus: string[] = Array.isArray(vault.vault_status) ? vault.vault_status : [];
  const CONDITIONS = [
    { label: 'To be Cleaned',      match: 'Needs Cleaning' },
    { label: 'Cleaning Complete',  match: 'Ready to Go'    },
    { label: 'Total Loss Contents',match: 'Total Loss'     },
    { label: 'TL – Client wants',  match: '__never__'      },
    { label: 'Textiles',           match: '__never__'      },
  ];

  const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Pending', READY: 'Ready to Go', DELIVERED: 'Delivered',
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return d; }
  };

  return (
    <>
      <title>{title}</title>
      <style>{`
        @media print {
          @page { size: letter portrait; margin: 0; }
          /* Hide entire app shell — show only the label */
          body * { visibility: hidden !important; }
          #vault-print-label, #vault-print-label * { visibility: visible !important; }
          /* Reset the flex centering wrapper so the label flows naturally */
          .vault-print-wrapper {
            display: block !important;
            min-height: 0 !important;
            padding: 0 !important;
          }
          #vault-print-label {
            width: 8.5in !important;
            height: 11in !important;
            max-width: 8.5in !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0.45in !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            display: flex !important;
            flex-direction: column !important;
            border: none !important;
          }
          #vault-print-label * { max-width: 100%; box-sizing: border-box; }
          .print-grow { flex: 1 !important; }
          .no-print { display: none !important; }
        }
        body { background: #f1f5f9; margin: 0; font-family: system-ui, -apple-system, sans-serif; }
        .cb { display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; border: 1.5px solid #374151; border-radius: 2px; flex-shrink: 0; }
        .cb-checked { background: #111827; }
        .cb-checked::after { content: ''; display: block; width: 6px; height: 4px; border-left: 2px solid white; border-bottom: 2px solid white; transform: rotate(-45deg) translate(1px, -1px); }
      `}</style>

      {/* Toolbar — hidden on print */}
      <div className="no-print fixed top-[70px] md:top-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => {
            if (isNative) {
              const base = `${window.location.origin}${window.location.pathname}`;
              const token = pb.authStore.token;
              const shareUrl = `${base}${token ? `?tk=${encodeURIComponent(token)}` : ''}`;
              if (navigator.share) {
                navigator.share({ title, url: shareUrl }).catch(() => {});
              }
            } else {
              window.print();
            }
          }}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
        >
          Print / Save PDF
        </button>
        <button
          onClick={() => { window.opener ? window.close() : router.push('/dashboard'); }}
          className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-full hover:bg-slate-200 transition-colors"
        >
          Close
        </button>
      </div>

      {/* Label — gets id so print CSS can isolate it */}
      <div className="vault-print-wrapper min-h-screen flex items-center justify-center p-6">
        <div id="vault-print-label" className="bg-white w-full max-w-2xl shadow-xl print:shadow-none print:max-w-none border border-gray-200" style={{ fontFamily: 'system-ui, sans-serif' }}>

          {/* ─── Header: company + position ─── */}
          <div className="px-5 py-4 flex items-center justify-between border-b-2 border-gray-900">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium leading-none mb-0.5">Archive Contents Restoration</p>
              <p className="text-base font-black text-gray-900 leading-tight">{companyName}</p>
            </div>
            <div className="text-right border-2 border-gray-900 rounded-lg px-3 py-2">
              <p className="text-xl font-black tracking-tight leading-none text-gray-900">{pos}</p>
              <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mt-0.5">{levelLabel}</p>
            </div>
          </div>

          {/* ─── Hero: client + QR ─── */}
          <div className="flex items-start gap-4 px-5 pt-5 pb-4 border-b border-gray-200">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Client</p>
              <p className="text-3xl font-black text-gray-950 leading-tight break-words">{vault.client_name || '—'}</p>
              {warehouseName && (
                <p className="text-sm text-gray-400 font-medium mt-2">{warehouseName}</p>
              )}
              {nOfM && nOfM.m > 1 && (
                <div className="mt-3 inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
                  <span className="text-xs font-bold text-blue-700">{nOfM.n}</span>
                  <span className="text-xs text-blue-400">of</span>
                  <span className="text-xs font-bold text-blue-700">{nOfM.m}</span>
                  <span className="text-xs text-blue-500">vaults</span>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 p-2 border-2 border-gray-200 rounded-xl">
              <QRCodeSVG value={qrUrl} size={180} bgColor="#ffffff" fgColor="#111827" level="H" />
            </div>
          </div>

          {/* ─── Checkboxes ─── */}
          <div className="print-grow grid grid-cols-2 gap-0 border-b border-gray-200">
            <div className="px-5 py-4 border-r border-gray-200">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-3">Type of Loss</p>
              <div className="space-y-2.5">
                {TYPE_OF_LOSS.map(({ label, match }) => {
                  const checked = jobType === match;
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <span className={`cb${checked ? ' cb-checked' : ''}`} />
                      <span className={`text-sm ${checked ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-3">Condition</p>
              <div className="space-y-2.5">
                {CONDITIONS.map(({ label, match }) => {
                  const checked = vaultStatus.includes(match);
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <span className={`cb${checked ? ' cb-checked' : ''}`} />
                      <span className={`text-sm ${checked ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── Notes ─── */}
          {vault.comments && (
            <div className="px-5 py-3 border-b border-gray-200">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1">Notes</p>
              <p className="text-sm text-gray-700 leading-relaxed">{vault.comments}</p>
            </div>
          )}

          {/* ─── Packed by / Date ─── */}
          <div className="grid grid-cols-2 gap-0 border-b border-gray-200">
            <div className="px-5 py-3 border-r border-gray-200">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-0.5">Packed by</p>
              <p className="text-sm font-semibold text-gray-900">{vault.packer || '—'}</p>
            </div>
            <div className="px-5 py-3">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-0.5">Pack Date</p>
              <p className="text-sm font-semibold text-gray-900">{vault.pack_date ? formatDate(vault.pack_date) : '—'}</p>
            </div>
          </div>

          {/* ─── Footer ─── */}
          <div className="px-5 py-3 bg-gray-50 flex flex-wrap gap-x-4 gap-y-1 items-center">
            {warehouseName && <span className="text-xs text-gray-500">{warehouseName}</span>}
            {warehouseName && <span className="text-xs text-gray-400">·</span>}
            <span className="text-xs text-gray-500">{STATUS_LABEL[status] || status}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-500">{vault.content_type || vault.contents_type || '—'}</span>
            {vault.job_type && (
              <>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-500">{vault.job_type}</span>
              </>
            )}
            <span className="ml-auto text-[9px] text-gray-300 break-all hidden print:block">{qrUrl}</span>
          </div>

        </div>
      </div>
    </>
  );
}

export default function VaultPrintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VaultPrintContent />
    </Suspense>
  );
}
