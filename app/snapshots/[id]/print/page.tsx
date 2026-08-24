'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { pb } from '@/lib/pb';

function formatSnapDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split(/[-T ]/);
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m + 1) || isNaN(d)) return dateStr;
    return new Date(y, m, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

function SnapshotPrintContent() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const [snap, setSnap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const tk = searchParams.get('tk');
    if (tk) pb.authStore.save(tk, null as any);
  }, [searchParams]);

  useEffect(() => {
    if (!id) return;
    pb.collection('snapshots').getOne(String(id))
      .then(s => setSnap(s))
      .catch(() => setError('Snapshot not found or you are not logged in.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (snap && !loading) {
      setTimeout(() => window.print(), 600);
    }
  }, [snap, loading]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ width: 32, height: 32, border: '4px solid #111', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !snap) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 12, color: '#666', fontFamily: 'system-ui, sans-serif' }}>
      <p>{error || 'Not found'}</p>
      <a href="/snapshots" style={{ color: '#2563eb', fontSize: 14 }}>Go to Snapshots</a>
    </div>
  );

  const boxes: any[] = snap.data?.vaults || [];
  const tot  = boxes.length;
  const pend = boxes.filter(b => (b.estado || b.status) === 'PENDING').length;
  const rdy  = boxes.filter(b => (b.estado || b.status) === 'READY').length;
  const dlv  = boxes.filter(b => (b.estado || b.status) === 'DELIVERED').length;

  const maxRow   = Math.max(0, ...boxes.map(b => b.row?.charCodeAt(0) - 64 || 0));
  const maxCol   = Math.max(8, ...boxes.map(b => Number(b.column) || 0));
  const capacity = maxRow * maxCol * 2;
  const occupPct = capacity > 0 ? Math.round(tot / capacity * 100) : 0;
  const availPct = capacity > 0 ? Math.round((capacity - tot) / capacity * 100) : 0;

  const clientMap: Record<string, { total: number; pending: number; ready: number; delivered: number; jobTypes: Set<string> }> = {};
  for (const b of boxes) {
    const cl = b.client_name || '(No client)';
    const st = b.estado || b.status || 'PENDING';
    const jt = b.job_type || '';
    if (!clientMap[cl]) clientMap[cl] = { total: 0, pending: 0, ready: 0, delivered: 0, jobTypes: new Set() };
    clientMap[cl].total++;
    if (st === 'PENDING')   clientMap[cl].pending++;
    if (st === 'READY')     clientMap[cl].ready++;
    if (st === 'DELIVERED') clientMap[cl].delivered++;
    if (jt) clientMap[cl].jobTypes.add(jt);
  }
  const clients = Object.entries(clientMap).sort((a, b) => b[1].total - a[1].total);

  const jobMap: Record<string, number> = {};
  for (const b of boxes) { const jt = b.job_type || 'Other'; jobMap[jt] = (jobMap[jt] || 0) + 1; }
  const jobs = Object.entries(jobMap).sort((a, b) => b[1] - a[1]);

  const date = formatSnapDate(snap.date);

  return (
    <>
      <title>{snap.warehouse_name} — Report {date}</title>
      <style>{`
        @page { size: A4 portrait; margin: 0.8cm 1cm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; background: #fff; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .no-print { position: fixed; top: 12px; right: 12px; display: flex; gap: 8px; z-index: 100; }
        @media print { .no-print { display: none !important; } }
        .btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 600; }
        .btn-dark { background: #111; color: #fff; }
        .btn-light { background: #f1f5f9; color: #374151; }

        .hdr { display: flex; justify-content: space-between; align-items: flex-end;
               padding-bottom: 8px; border-bottom: 2.5px solid #111; margin-bottom: 10px; }
        .hdr h1 { font-size: 18px; font-weight: 800; }
        .hdr p  { font-size: 9px; color: #666; margin-top: 2px; }
        .hdr-r  { text-align: right; font-size: 8.5px; color: #999; line-height: 1.5; }

        .summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 5px; margin-bottom: 10px; }
        .stat { border: 1.5px solid #e5e5e5; border-radius: 7px; padding: 7px 9px; }
        .stat .n { font-size: 22px; font-weight: 800; line-height: 1; }
        .stat .l { font-size: 8px; color: #999; margin-top: 3px; text-transform: uppercase; letter-spacing: .05em; }
        .s-pend { border-color: #fbbf24; } .s-pend .n { color: #d97706; }
        .s-rdy  { border-color: #34d399; } .s-rdy  .n { color: #059669; }
        .s-dlv  { border-color: #60a5fa; } .s-dlv  .n { color: #2563eb; }

        .avail { background: #f9fafb; border: 1.5px solid #e5e5e5; border-radius: 7px;
                 padding: 8px 12px; margin-bottom: 9px; display: flex; align-items: center; gap: 16px; }
        .avail .bar-wrap { flex: 1; background: #e5e7eb; border-radius: 99px; height: 8px; overflow: hidden; }
        .avail .bar-fill { height: 100%; background: #111; border-radius: 99px; }
        .avail p { font-size: 9px; white-space: nowrap; }
        .avail .big { font-size: 13px; font-weight: 700; }

        .cols { display: grid; grid-template-columns: 1.7fr 1fr; gap: 9px; margin-bottom: 9px; }
        .sec h2 { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em;
                   color: #aaa; margin-bottom: 5px; padding-bottom: 3px; border-bottom: 1px solid #f0f0f0; }

        table { width: 100%; border-collapse: collapse; font-size: 9px; }
        th { background: #f5f5f5; text-align: left; padding: 3px 5px; font-weight: 700;
             border-bottom: 1px solid #ddd; color: #555; font-size: 8px; text-transform: uppercase; }
        td { padding: 2.5px 5px; border-bottom: 1px solid #f3f3f3; vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        .c    { text-align: center; }
        .bold { font-weight: 700; }
        .client-name { font-weight: 600; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .jt   { font-size: 8px; color: #999; }
        .zero { color: #ddd; }
        .pend { background: #fef3c7; color: #92400e; padding: 1px 4px; border-radius: 3px; font-weight: 600; font-size: 8.5px; }
        .rdy  { background: #d1fae5; color: #065f46; padding: 1px 4px; border-radius: 3px; font-weight: 600; font-size: 8.5px; }
        .dlv  { background: #dbeafe; color: #1e40af; padding: 1px 4px; border-radius: 3px; font-weight: 600; font-size: 8.5px; }

        .footer { padding-top: 5px; border-top: 1px solid #e8e8e8;
                  display: flex; justify-content: space-between; font-size: 8px; color: #ccc; }
      `}</style>

      <div className="no-print">
        <button className="btn btn-dark" onClick={() => window.print()}>Print / Save PDF</button>
        <button className="btn btn-light" onClick={() => { try { if (window.opener) window.close(); else window.history.back(); } catch {} }}>Close</button>
      </div>

      <div style={{ padding: '48px 20px 20px' }}>
        <div className="hdr">
          <div><h1>{snap.warehouse_name}</h1><p>Inventory Report · {date}</p></div>
          <div className="hdr-r"><span>{new Date().toLocaleString()}</span></div>
        </div>

        <div className="summary">
          <div className="stat">       <div className="n">{tot}</div>  <div className="l">Total Vaults</div></div>
          <div className="stat s-pend"><div className="n">{pend}</div> <div className="l">Pending</div></div>
          <div className="stat s-rdy"> <div className="n">{rdy}</div>  <div className="l">Ready to Go</div></div>
          <div className="stat s-dlv"> <div className="n">{dlv}</div>  <div className="l">Delivered</div></div>
        </div>

        {capacity > 0 && (
          <div className="avail">
            <p><span className="big">{tot}</span> / {capacity} positions occupied</p>
            <div className="bar-wrap"><div className="bar-fill" style={{ width: `${occupPct}%` }} /></div>
            <p><span className="big">{availPct}%</span> available</p>
          </div>
        )}

        <div className="cols">
          <div className="sec">
            <h2>Clients in this Warehouse</h2>
            <table>
              <thead><tr><th>Client</th><th>Job Type</th><th>Vaults</th><th>Pending</th><th>Ready</th><th>Delivered</th></tr></thead>
              <tbody>
                {clients.map(([name, c]) => (
                  <tr key={name}>
                    <td className="client-name">{name}</td>
                    <td className="jt">{[...c.jobTypes].join(', ') || '—'}</td>
                    <td className="c bold">{c.total}</td>
                    <td className="c">{c.pending > 0 ? <span className="pend">{c.pending}</span> : <span className="zero">—</span>}</td>
                    <td className="c">{c.ready > 0 ? <span className="rdy">{c.ready}</span> : <span className="zero">—</span>}</td>
                    <td className="c">{c.delivered > 0 ? <span className="dlv">{c.delivered}</span> : <span className="zero">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sec">
            <h2>By Job Type</h2>
            <table>
              <thead><tr><th>Type</th><th>Count</th><th>%</th></tr></thead>
              <tbody>
                {jobs.map(([name, count]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td className="c bold">{count}</td>
                    <td className="c">{tot > 0 ? Math.round(count / tot * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="footer">
          <span>{snap.warehouse_name} · {date}</span>
          <span>Warehouse Manager · {tot} vaults · {clients.length} clients</span>
        </div>
      </div>
    </>
  );
}

export default function SnapshotPrintPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ width: 32, height: 32, border: '4px solid #111', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <SnapshotPrintContent />
    </Suspense>
  );
}
