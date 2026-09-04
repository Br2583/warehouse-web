'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { api, sf } from '@/lib/api';
import { pb } from '@/lib/pb';
import { useAuth } from '@/lib/auth-context';

function VaultPrintContent() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warehouseName, setWarehouseName] = useState('');
  const [nOfM, setNOfM] = useState<{ n: number; m: number } | null>(null);
  const [scale, setScale] = useState(1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const LABEL_W = 8.5 * 96; // 816px
    const calc = () => {
      const vw = window.innerWidth;
      setScale(Math.min(1, (vw - 24) / LABEL_W));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
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
            const filter = `company_id="${sf(user.company_id)}" && client_name="${sf(v.client_name)}" && deleted_at = ""`;
            const sorted = await pb.collection('vaults').getFullList({
              filter, fields: 'id,created', sort: 'created',
            });
            const idx = sorted.findIndex(cv => cv.id === id);
            if (sorted.length > 1) setNOfM({ n: idx >= 0 ? idx + 1 : 1, m: sorted.length });
          } catch {}
        }
      })
      .catch(() => setError('Vault not found'))
      .finally(() => setLoading(false));
  }, [id, user?.company_id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '4px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !vault) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontFamily: 'sans-serif' }}>
      {error || 'Not found'}
    </div>
  );

  const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://managerwarehouse.cc'}/vault/${id}`;
  const status = vault.estado || vault.status || 'PENDING';
  const STATUS_LABEL: Record<string, string> = { PENDING: 'PENDING', READY: 'READY TO GO', DELIVERED: 'DELIVERED' };
  const pos = `${vault.row || ''}${vault.column || ''}`;
  const levelNum = Number(vault.level);
  const levelLabel = levelNum === 1 ? 'LOWER' : levelNum === 2 ? 'UPPER' : `L${levelNum}`;
  const companyName = user?.company_name || 'Warehouse Manager';
  const title = `Vault ${pos} — ${vault.client_name || 'No Client'}`;

  const TYPE_OF_LOSS = [
    { label: 'Fire Loss',    match: 'Fire'    },
    { label: 'Water Loss',   match: 'Water'   },
    { label: 'Mold',         match: 'Mold'    },
    { label: 'Moving',       match: 'Moving'  },
    { label: 'Storage Only', match: 'Storage' },
  ];
  const CONDITIONS = [
    { label: 'To be Cleaned',       match: 'Needs Cleaning' },
    { label: 'Total Loss Contents', match: 'Total Loss'     },
    { label: 'Storage Only',        match: 'Storage Only'   },
    { label: 'Textiles',            match: 'Textiles'       },
  ];
  const vaultStatus: string[] = Array.isArray(vault.vault_status) ? vault.vault_status : [];
  const jobType = vault.job_type || '';

  const formatDate = (d: string) => {
    if (!d) return '—';
    try {
      const datePart = d.split(/[ T]/)[0]; // strip time if present
      const [y, m, day] = datePart.split('-').map(Number);
      if (!y || !m || !day) return d;
      return `${String(m).padStart(2,'0')} / ${String(day).padStart(2,'0')} / ${y}`;
    } catch { return d; }
  };

  const checkSVG = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="square">
      <path d="M4 12l5.5 6L20 6" />
    </svg>
  );

  // scaled label height for wrapper sizing
  const LABEL_H = 11 * 96; // 1056px
  const scaledH = LABEL_H * scale;

  return (
    <>
      <title>{title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Narrow:wght@600;700&display=swap" rel="stylesheet" />

      <style>{`
        *{box-sizing:border-box}
        html,body{margin:0;padding:0}
        body{background:#e9e9e9;font-family:'Archivo',sans-serif;color:#000}
        .lbl{font-family:'Archivo Narrow',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase}
        .lbl-sm{font-size:9px;letter-spacing:0.2em}
        .lbl-lg{font-size:11px;letter-spacing:0.24em}
        .sec    {border:3px solid #000}
        .sec-mid{border:3px solid #000;border-top:none}
        .sec-top{border:3px solid #000;border-bottom:none}
        .div-v  {border-right:2px solid #000}
        .cb{width:22px;height:22px;flex:none;border:2.5px solid #000;display:flex;align-items:center;justify-content:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .cb-on{background:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .cb-row{display:flex;align-items:center;gap:10px}
        .cb-txt{font-size:16px;font-weight:600}
        .cb-txt-on{font-size:16px;font-weight:800}
        .no-print{display:flex;gap:8px;padding:12px 16px;justify-content:flex-end;background:#e9e9e9;position:fixed;top:env(safe-area-inset-top,0px);left:0;right:0;z-index:50}
        .btn{padding:8px 18px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:700;font-family:'Archivo',sans-serif}
        .btn-dark{background:#000;color:#fff}
        .btn-light{background:#f1f5f9;color:#374151}
        @page{size:letter portrait;margin:0}
        @media print{
          html,body{margin:0;padding:0;height:11in;overflow:hidden}
          .no-print{display:none!important}
          .label-wrapper{padding:0!important;margin:0!important;height:11in!important;min-height:0!important;overflow:hidden!important;display:block!important}
          .label-scaler{transform:none!important;width:8.5in!important;height:11in!important;overflow:hidden!important;page-break-inside:avoid;break-inside:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact}
          *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
        }
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Toolbar — sticky top, always reachable */}
      <div className="no-print">
        <button className="btn btn-light" onClick={() => router.back()}>
          ← Back
        </button>
        <button className="btn btn-dark" onClick={handlePrint}>
          Print / Save PDF
        </button>
      </div>

      {/* Wrapper: padding-top clears the fixed toolbar (approx 56px + safe-area) */}
      <div className="label-wrapper" style={{ paddingTop: 'calc(56px + env(safe-area-inset-top, 0px) + 16px)', paddingBottom: 48, display: 'flex', justifyContent: 'center', minHeight: scaledH + 80 }}>
        <div
          ref={wrapperRef}
          className="label-scaler"
          style={{
            transformOrigin: 'top center',
            transform: `scale(${scale})`,
            width: '8.5in',
            height: '11in',
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
          }}
        >

          {/* 1. HEADER */}
          <div className="sec-top" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.01em', lineHeight: 1, textTransform: 'uppercase' }}>
                {companyName}
              </div>
              <div className="lbl" style={{ letterSpacing: '0.22em', marginTop: 5 }}>
                Contents Inventory &amp; Storage · Vault Label
              </div>
            </div>
            {vault.box_id && (
              <div style={{ textAlign: 'right', borderLeft: '2px solid #000', paddingLeft: 16 }}>
                <div className="lbl lbl-sm" style={{ letterSpacing: '0.18em' }}>Job No.</div>
                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1, whiteSpace: 'nowrap' }}>{vault.box_id}</div>
              </div>
            )}
          </div>

          {/* 2. CLIENT */}
          <div className="sec" style={{ padding: '14px 18px 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="lbl lbl-lg">Client</div>
              <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 0.9, letterSpacing: '-0.03em', textTransform: 'uppercase', marginTop: 4, wordBreak: 'break-word' }}>
                {vault.client_name || '—'}
              </div>
            </div>
            {nOfM && nOfM.m > 1 && (
              <div style={{ textAlign: 'center', border: '3px solid #000', padding: '10px 18px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                <div className="lbl lbl-sm">Vault</div>
                <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1 }}>
                  {nOfM.n} <span style={{ fontSize: 19, fontWeight: 700 }}>of</span> {nOfM.m}
                </div>
              </div>
            )}
          </div>

          {/* 3. VAULT POSITION */}
          <div className="sec-mid" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22 }}>
              <div>
                <div className="lbl" style={{ letterSpacing: '0.22em' }}>Vault Position</div>
                <div style={{ fontSize: 54, fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.02em' }}>{pos || '—'}</div>
              </div>
              <div style={{ borderLeft: '3px solid #000', paddingLeft: 22 }}>
                <div className="lbl" style={{ letterSpacing: '0.22em' }}>Level</div>
                <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.01em' }}>{levelLabel}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 22, textAlign: 'right' }}>
              <div>
                <div className="lbl lbl-sm">Row</div>
                <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>{vault.row || '—'}</div>
              </div>
              <div>
                <div className="lbl lbl-sm">Column</div>
                <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>{vault.column || '—'}</div>
              </div>
            </div>
          </div>

          {/* 4. QR + CHECKBOXES */}
          <div className="sec-mid" style={{ display: 'flex', alignItems: 'stretch' }}>
            <div style={{ flexShrink: 0, width: '2.95in', borderRight: '3px solid #000', padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
              <QRCodeSVG value={qrUrl} size={220} bgColor="#ffffff" fgColor="#000000" level="H" />
              <div style={{ textAlign: 'center' }}>
                <div className="lbl lbl-sm">Scan to open vault record</div>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.04em', marginTop: 3 }}>{pos}</div>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex' }}>
              <div className="div-v" style={{ flex: 1, padding: '14px 16px' }}>
                <div className="lbl" style={{ borderBottom: '2px solid #000', paddingBottom: 5, marginBottom: 10 }}>Type of Loss</div>
                <div style={{ display: 'grid', gap: 9 }}>
                  {TYPE_OF_LOSS.map(({ label, match }) => {
                    const checked = jobType === match || jobType.includes(match);
                    return (
                      <div key={label} className="cb-row">
                        <span className={`cb${checked ? ' cb-on' : ''}`}>{checked && checkSVG}</span>
                        <span className={checked ? 'cb-txt-on' : 'cb-txt'}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ flex: 1, padding: '14px 16px' }}>
                <div className="lbl" style={{ borderBottom: '2px solid #000', paddingBottom: 5, marginBottom: 10 }}>Condition</div>
                <div style={{ display: 'grid', gap: 9 }}>
                  {CONDITIONS.map(({ label, match }) => {
                    const checked = vaultStatus.includes(match);
                    return (
                      <div key={label} className="cb-row">
                        <span className={`cb${checked ? ' cb-on' : ''}`}>{checked && checkSVG}</span>
                        <span className={checked ? 'cb-txt-on' : 'cb-txt'}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 5. PACKED BY / DATE */}
          <div className="sec-mid" style={{ display: 'flex' }}>
            <div className="div-v" style={{ flex: 1, padding: '12px 18px' }}>
              <div className="lbl">Packed By</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>{vault.packer || '—'}</div>
            </div>
            <div style={{ flex: 1, padding: '12px 18px' }}>
              <div className="lbl">Pack Date</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>{vault.pack_date ? formatDate(vault.pack_date) : '—'}</div>
            </div>
          </div>

          {/* 6. NOTES */}
          <div className="sec-mid" style={{ padding: '12px 18px 0', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '1.1in' }}>
            <div className="lbl">Notes / Comments</div>
            <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.55, marginTop: 6 }}>
              {vault.comments || ''}
            </div>
            <div style={{ flex: 1, minHeight: '0.5in' }} />
          </div>

          {/* 7. FOOTER */}
          <div className="sec-mid" style={{ display: 'flex', alignItems: 'stretch' }}>
            <div className="div-v" style={{ flex: 1.2, padding: '12px 18px' }}>
              <div className="lbl lbl-sm">Warehouse</div>
              <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.15, marginTop: 2 }}>{warehouseName || '—'}</div>
            </div>
            <div className="div-v" style={{ flex: 1, padding: '12px 18px' }}>
              <div className="lbl lbl-sm">Status</div>
              <div style={{ fontSize: 19, fontWeight: 900, lineHeight: 1.15, marginTop: 2, letterSpacing: '0.04em' }}>
                {STATUS_LABEL[status] || status}
              </div>
            </div>
            <div style={{ flex: 1.1, padding: '12px 18px' }}>
              <div className="lbl lbl-sm">Content Type</div>
              <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.15, marginTop: 2 }}>
                {vault.content_type || vault.contents_type || '—'}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default function VaultPrintPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '4px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <VaultPrintContent />
    </Suspense>
  );
}
