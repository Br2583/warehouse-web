'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CameraIcon, TrashIcon, PlusIcon, PrinterIcon, XMarkIcon,
  ArchiveBoxIcon, CheckCircleIcon, TruckIcon, ClockIcon, EnvelopeIcon, ExclamationCircleIcon,
} from '@/components/icons';
import ConfirmModal from '@/components/ConfirmModal';
import Sidebar from '@/components/Sidebar';
import { useToast } from '@/lib/toast-context';
import { useOverlayBack } from '@/lib/overlay-back';
import { countTotals, parseCounts } from '@/lib/item-counts';
import { api } from '@/lib/api';
import { pb } from '@/lib/pb';
import { useAuth } from '@/lib/auth-context';

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

export default function SnapshotsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<{ snap: any; boxes: any[] } | null>(null);
  const [emailModal, setEmailModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<'ok' | 'err' | null>(null);
  const [actionError, setActionError] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  useOverlayBack(!!confirmModal, () => setConfirmModal(null));
  const [creatingSnap, setCreatingSnap] = useState<string | null>(null);

  const fetchSnapshots = () => {
    setLoadError(null);
    return api.get('/api/snapshots')
      .then(data => setSnapshots(Array.isArray(data) ? data : []))
      .catch(() => setLoadError('Failed to load snapshots. Try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSnapshots(); }, []);

  useEffect(() => {
    if (!user?.company_id) return;
    pb.collection('warehouses')
      .getFullList({ filter: `company_id="${user.company_id}"`, fields: 'id,name' })
      .then(whs => setWarehouses(whs.map(w => ({ id: w.id, name: w['name'] as string }))))
      .catch(() => {});
  }, [user?.company_id]);

  const createSnapshot = async (warehouseId: string) => {
    if (creatingSnap) return;
    setCreatingSnap(warehouseId);
    setActionError('');
    try {
      const res = await fetch(`/api/snapshots/create/${warehouseId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to create snapshot');
      }
      fetchSnapshots();
    } catch (e: any) {
      setActionError(e.message || 'Failed to create snapshot');
    } finally {
      setCreatingSnap(null);
    }
  };

  const deleteSnapshot = (id: string) => {
    setConfirmModal({
      message: 'Delete this snapshot? This cannot be undone.',
      onConfirm: async () => {
        setActionError('');
        try {
          const res = await fetch(`/api/snapshots/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${pb.authStore.token}` },
          });
          if (!res.ok && res.status !== 204) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error || 'Failed to delete snapshot');
          }
          fetchSnapshots();
        } catch (e: any) {
          setActionError(e.message || 'Failed to delete snapshot');
        }
      },
    });
  };

  const openReport = (snap: any) => {
    const boxes = snap.data?.vaults || [];
    setReport({ snap, boxes });
  };

  const handlePrint = async () => {
    if (!report) return;
    const { snap, boxes } = report;
    const tot  = boxes.length;
    const pend = boxes.filter(b => (b.estado || b.status) === 'PENDING').length;
    const rdy  = boxes.filter(b => (b.estado || b.status) === 'READY').length;
    const dlv  = boxes.filter(b => (b.estado || b.status) === 'DELIVERED').length;

    // Global item count (Art + Wardrobe count as boxes). Present only on snapshots
    // taken after item_counts was captured — older snapshots simply omit the line.
    const itemT = boxes.reduce((acc, b) => {
      const c = countTotals(parseCounts((b as any).item_counts));
      return { boxes: acc.boxes + c.boxes, furniture: acc.furniture + c.furniture, total: acc.total + c.total };
    }, { boxes: 0, furniture: 0, total: 0 });

    // Max possible positions in the warehouse (rows × cols × 2 levels)
    const maxRow  = Math.max(0, ...boxes.map(b => b.row?.charCodeAt(0) - 64 || 0));
    const maxCol  = Math.max(8, ...boxes.map(b => Number(b.column) || 0));
    const capacity = maxRow * maxCol * 2;
    const occupPct = capacity > 0 ? Math.round(tot / capacity * 100) : 0;
    const availPct = capacity > 0 ? Math.round((capacity - tot) / capacity * 100) : 0;

    // Client breakdown
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

    // Job type breakdown
    const jobMap: Record<string, number> = {};
    for (const b of boxes) { const jt = b.job_type || 'Other'; jobMap[jt] = (jobMap[jt] || 0) + 1; }
    const jobs = Object.entries(jobMap).sort((a, b) => b[1] - a[1]);

    const esc = (s: string) => String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const n = (v: number, cls: string) =>
      v > 0 ? `<span class="${cls}">${v}</span>` : `<span class="zero">—</span>`;

    const clientRows = clients.map(([name, c]) => `
      <tr>
        <td class="client-name">${esc(name)}</td>
        <td class="jt">${esc([...c.jobTypes].join(', ') || '—')}</td>
        <td class="c bold">${c.total}</td>
        <td class="c">${n(c.pending, 'pend')}</td>
        <td class="c">${n(c.ready, 'rdy')}</td>
        <td class="c">${n(c.delivered, 'dlv')}</td>
      </tr>`).join('');

    const jobRows = jobs.map(([name, count]) => `
      <tr>
        <td>${esc(name)}</td>
        <td class="c bold">${count}</td>
        <td class="c">${tot > 0 ? Math.round(count / tot * 100) : 0}%</td>
      </tr>`).join('');

    const date    = formatSnapDate(snap.date);
    const printed = new Date().toLocaleString();

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${esc(snap.warehouse_name)} — Report</title>
<style>
@page { size: A4 portrait; margin: 1.2cm 1.4cm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; color: #111; background: #fff; }

.hdr { display: flex; justify-content: space-between; align-items: flex-end;
       padding-bottom: 9px; border-bottom: 2.5px solid #111; margin-bottom: 10px; }
.hdr h1 { font-size: 19px; font-weight: 800; }
.hdr p  { font-size: 9.5px; color: #666; margin-top: 2px; }
.hdr-r  { text-align: right; font-size: 9px; color: #999; line-height: 1.5; }

.summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 5px; margin-bottom: 10px; }
.stat { border: 1.5px solid #e5e5e5; border-radius: 7px; padding: 7px 9px; }
.stat .n { font-size: 24px; font-weight: 800; line-height: 1; }
.stat .l { font-size: 8.5px; color: #999; margin-top: 3px; text-transform: uppercase; letter-spacing: .05em; }
.s-pend { border-color: #fbbf24; } .s-pend .n { color: #d97706; }
.s-rdy  { border-color: #34d399; } .s-rdy  .n { color: #059669; }
.s-dlv  { border-color: #60a5fa; } .s-dlv  .n { color: #2563eb; }

.avail { background: #f9fafb; border: 1.5px solid #e5e5e5; border-radius: 7px;
         padding: 8px 12px; margin-bottom: 9px; display: flex; align-items: center; gap: 16px; }
.avail .bar-wrap { flex: 1; background: #e5e7eb; border-radius: 99px; height: 8px; overflow: hidden; }
.avail .bar-fill { height: 100%; background: #111; border-radius: 99px; }
.avail p { font-size: 9.5px; white-space: nowrap; }
.avail .big { font-size: 13px; font-weight: 700; }

.cols { display: grid; grid-template-columns: 1.7fr 1fr; gap: 9px; margin-bottom: 9px; }
.sec h2 { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em;
           color: #aaa; margin-bottom: 5px; padding-bottom: 3px; border-bottom: 1px solid #f0f0f0; }
.sec + .sec { margin-top: 11px; }

table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
th { background: #f5f5f5; text-align: left; padding: 3px 5px; font-weight: 700;
     border-bottom: 1px solid #ddd; color: #555; font-size: 8.5px; text-transform: uppercase; }
td { padding: 2.5px 5px; border-bottom: 1px solid #f3f3f3; vertical-align: middle; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: #fafafa; }
.c    { text-align: center; }
.bold { font-weight: 700; }
.client-name { font-weight: 600; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jt   { font-size: 8.5px; color: #999; }
.zero { color: #ddd; }
.pend { background: #fef3c7; color: #92400e; padding: 1px 4px; border-radius: 3px; font-weight: 600; font-size: 9px; }
.rdy  { background: #d1fae5; color: #065f46; padding: 1px 4px; border-radius: 3px; font-weight: 600; font-size: 9px; }
.dlv  { background: #dbeafe; color: #1e40af; padding: 1px 4px; border-radius: 3px; font-weight: 600; font-size: 9px; }

.footer { padding-top: 5px; border-top: 1px solid #e8e8e8;
          display: flex; justify-content: space-between; font-size: 8.5px; color: #ccc; }
</style></head><body>

<div class="hdr">
  <div><h1>${esc(snap.warehouse_name)}</h1><p>Inventory Report · ${esc(date)}</p></div>
  <div class="hdr-r"><span>${printed}</span></div>
</div>

<div class="summary">
  <div class="stat">       <div class="n">${tot}</div> <div class="l">Total Vaults</div></div>
  <div class="stat s-pend"><div class="n">${pend}</div><div class="l">Pending</div></div>
  <div class="stat s-rdy"> <div class="n">${rdy}</div> <div class="l">Ready to Go</div></div>
  <div class="stat s-dlv"> <div class="n">${dlv}</div> <div class="l">Delivered</div></div>
</div>
${itemT.total > 0 ? `<div style="font-size:9.5px;color:#555;margin:-4px 0 10px;padding:6px 10px;background:#f9fafb;border:1.5px solid #e5e5e5;border-radius:7px;">Item count: <b>${itemT.boxes}</b> boxes · <b>${itemT.furniture}</b> furniture · <b>${itemT.total}</b> total</div>` : ''}

${capacity > 0 ? `
<div class="avail">
  <p><span class="big">${tot}</span> / ${capacity} positions occupied</p>
  <div class="bar-wrap"><div class="bar-fill" style="width:${occupPct}%"></div></div>
  <p><span class="big">${availPct}%</span> available</p>
</div>` : ''}

<div class="cols">
  <div class="sec">
    <h2>Clients in this Warehouse</h2>
    <table>
      <thead><tr><th>Client</th><th>Job Type</th><th>Vaults</th><th>Pending</th><th>Ready</th><th>Delivered</th></tr></thead>
      <tbody>${clientRows}</tbody>
    </table>
  </div>
  <div class="sec">
    <h2>By Job Type</h2>
    <table>
      <thead><tr><th>Type</th><th>Count</th><th>%</th></tr></thead>
      <tbody>${jobRows}</tbody>
    </table>
  </div>
</div>

<div class="footer">
  <span>${esc(snap.warehouse_name)} · ${esc(date)}</span>
  <span>Warehouse Manager · ${tot} vaults · ${clients.length} clients</span>
</div>

</body></html>`;

    const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
    if (isNative) {
      const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://managerwarehouse.cc');
      const token = pb.authStore.token;
      const printUrl = `${base}/snapshots/${snap.id}/print${token ? `?tk=${encodeURIComponent(token)}` : ''}`;
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: printUrl, presentationStyle: 'fullscreen' });
      } catch {
        window.open(printUrl, '_blank');
      }
      return;
    }

    // Hidden iframe — no popup blocker issues
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || (iframe.contentWindow as any)?.document;
    if (!doc) return;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1500);
    }, 300);
  };

  const sendEmail = async () => {
    if (!report || !user?.email) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/snapshots/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` },
        body: JSON.stringify({
          to:            user.email,
          warehouseName: report.snap.warehouse_name,
          date:          formatSnapDate(report.snap.date),
          total:         report.boxes.length,
          pending:       report.boxes.filter(b => (b.estado||b.status) === 'PENDING').length,
          ready:         report.boxes.filter(b => (b.estado||b.status) === 'READY').length,
          delivered:     report.boxes.filter(b => (b.estado||b.status) === 'DELIVERED').length,
          vaults:        report.boxes.map(b => ({
            row: b.row, column: b.column, level: b.level,
            client_name: b.client_name, estado: b.estado, status: b.status,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      setSendResult('ok');
      showToast('Report sent to ' + user.email);
      setTimeout(() => { setEmailModal(false); setSendResult(null); }, 2000);
    } catch {
      setSendResult('err');
    } finally {
      setSending(false);
    }
  };

  const pending   = report?.boxes.filter(b => (b.estado || b.status) === 'PENDING').length ?? 0;
  const ready     = report?.boxes.filter(b => (b.estado || b.status) === 'READY').length ?? 0;
  const delivered = report?.boxes.filter(b => (b.estado || b.status) === 'DELIVERED').length ?? 0;

  return (
    <>
      {/* Hide everything if Ctrl+P is pressed on the page itself — actual print goes via window.open */}
      <style>{`@media print { body * { display: none !important; } }`}</style>

      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="md:ml-64 flex-1 min-w-0 px-4 pb-8 md:px-8 md:pb-8 topbar-offset">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 md:mb-8">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Snapshots</h1>
            </div>
            <div className="flex gap-2 flex-wrap">
              {warehouses.map(wh => (
                <button key={wh.id} onClick={() => createSnapshot(wh.id)}
                  disabled={!!creatingSnap}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-950 text-white rounded-full hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {creatingSnap === wh.id
                    ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin flex-shrink-0" />
                    : <PlusIcon className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span className="truncate max-w-[120px]">{wh.name}</span>
                </button>
              ))}
            </div>
          </div>

          {loadError && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
              <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{loadError}</span>
              <button onClick={() => fetchSnapshots()} className="text-xs font-medium text-red-600 hover:text-red-800 underline">Retry</button>
            </div>
          )}

          {actionError && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
              <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{actionError}</span>
              <button onClick={() => setActionError('')} className="text-red-400 hover:text-red-600"><XMarkIcon className="w-4 h-4" /></button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No snapshots yet. Create one above.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {snapshots.map((snap, i) => (
                <motion.div
                  key={snap.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                      <CameraIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <button onClick={() => deleteSnapshot(snap.id)} className="p-1.5 -mr-1 text-gray-300 hover:text-red-400 transition-colors rounded-lg">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="font-semibold text-gray-900">{snap.warehouse_name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{formatSnapDate(snap.date)}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-3">{snap.box_count}</p>
                  <p className="text-xs text-gray-400 mb-4">total vaults</p>
                  <button
                    onClick={() => openReport(snap)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors font-medium"
                  >
                    <PrinterIcon className="w-4 h-4" /> View & Print Report
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {report && (
          <div className="snap-overlay fixed inset-0 bg-black/40 flex items-start justify-center z-[55] p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="snap-modal bg-white rounded-2xl w-full max-w-4xl shadow-2xl my-4"
            >
              {/* Modal toolbar (hidden on print) */}
              <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100 print:hidden">
                <h2 className="font-bold text-gray-900 truncate min-w-0">
                  {report.snap.warehouse_name} — {formatSnapDate(report.snap.date)}
                </h2>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setEmailModal(true); setSendResult(null); }}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
                  >
                    <EnvelopeIcon className="w-4 h-4" /><span className="hidden sm:inline">Send Email</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-950 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors"
                  >
                    <PrinterIcon className="w-4 h-4" /><span className="hidden sm:inline">Print</span>
                  </button>
                  <button onClick={() => setReport(null)} className="text-gray-400 hover:text-gray-600 p-1">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable content */}
              <div id="print-report" className="p-4 sm:p-8">
                {/* Report header */}
                <div className="mb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">Inventory Report</h1>
                      <p className="text-gray-500 mt-1">{report.snap.warehouse_name} · {formatSnapDate(report.snap.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Generated</p>
                      <p className="text-sm font-medium text-gray-700">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Status summary cards */}
                {(
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      {[
                        { label: 'Total Vaults', value: report.boxes.length || report.snap.box_count, icon: ArchiveBoxIcon, color: 'bg-gray-50 text-gray-700' },
                        { label: 'Pending',     value: pending,   icon: ClockIcon,        color: 'bg-amber-50 text-amber-700' },
                        { label: 'Ready',       value: ready,     icon: CheckCircleIcon,  color: 'bg-green-50 text-green-700' },
                        { label: 'Delivered',   value: delivered, icon: TruckIcon,        color: 'bg-blue-50 text-blue-700' },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className={`rounded-xl p-4 ${color}`}>
                          <Icon className="w-5 h-5 mb-2 opacity-70" />
                          <p className="text-2xl font-bold">{value}</p>
                          <p className="text-sm opacity-70">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Stats breakdown */}
                    {report.boxes.length > 0 ? (
                      (() => {
                        const tot = report.boxes.length;
                        const maxRow = Math.max(0, ...report.boxes.map(b => b.row?.charCodeAt(0) - 64 || 0));
                        const maxCol = Math.max(8, ...report.boxes.map(b => Number(b.column) || 0));
                        const capacity = maxRow * maxCol * 2;
                        const occupPct = capacity > 0 ? Math.round(tot / capacity * 100) : 0;
                        const availPct = capacity > 0 ? Math.round((capacity - tot) / capacity * 100) : 0;

                        const clientMap: Record<string, { total: number; pending: number; ready: number; delivered: number; jobTypes: Set<string> }> = {};
                        for (const b of report.boxes) {
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
                        for (const b of report.boxes) { const jt = b.job_type || 'Other'; jobMap[jt] = (jobMap[jt] || 0) + 1; }
                        const jobs = Object.entries(jobMap).sort((a, b) => b[1] - a[1]);

                        return (
                          <div className="space-y-6">
                            {capacity > 0 && (
                              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                <span className="text-sm text-gray-600 whitespace-nowrap">
                                  <span className="text-lg font-bold text-gray-900">{tot}</span> / {capacity} positions occupied
                                </span>
                                <div className="flex-1 w-full bg-gray-200 rounded-full h-2">
                                  <div className="bg-gray-900 h-2 rounded-full" style={{ width: `${occupPct}%` }} />
                                </div>
                                <span className="text-sm text-gray-600 whitespace-nowrap">
                                  <span className="font-bold">{availPct}%</span> available
                                </span>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Clients in this Warehouse</h3>
                                <div className="border border-gray-100 rounded-xl overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-gray-50 text-xs text-gray-500">
                                        <th className="px-3 py-2 text-left font-semibold">Client</th>
                                        <th className="px-2 py-2 text-center font-semibold">Vaults</th>
                                        <th className="px-2 py-2 text-center font-semibold">Pend</th>
                                        <th className="px-2 py-2 text-center font-semibold">Ready</th>
                                        <th className="px-2 py-2 text-center font-semibold">Dlv</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {clients.map(([name, c]) => (
                                        <tr key={name} className="border-t border-gray-50 hover:bg-gray-50">
                                          <td className="px-3 py-2 font-medium text-gray-900 max-w-[130px] truncate">{name}</td>
                                          <td className="px-2 py-2 text-center font-bold text-gray-900">{c.total}</td>
                                          <td className="px-2 py-2 text-center">{c.pending > 0 ? <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold">{c.pending}</span> : <span className="text-gray-200">—</span>}</td>
                                          <td className="px-2 py-2 text-center">{c.ready > 0 ? <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 rounded font-semibold">{c.ready}</span> : <span className="text-gray-200">—</span>}</td>
                                          <td className="px-2 py-2 text-center">{c.delivered > 0 ? <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">{c.delivered}</span> : <span className="text-gray-200">—</span>}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">By Job Type</h3>
                                <div className="border border-gray-100 rounded-xl overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-gray-50 text-xs text-gray-500">
                                        <th className="px-3 py-2 text-left font-semibold">Type</th>
                                        <th className="px-2 py-2 text-center font-semibold">Count</th>
                                        <th className="px-2 py-2 text-center font-semibold">%</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {jobs.map(([name, count]) => (
                                        <tr key={name} className="border-t border-gray-50 hover:bg-gray-50">
                                          <td className="px-3 py-2 text-gray-900">{name}</td>
                                          <td className="px-2 py-2 text-center font-bold text-gray-900">{count}</td>
                                          <td className="px-2 py-2 text-center text-gray-500">{tot > 0 ? Math.round(count / tot * 100) : 0}%</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-center py-8 text-gray-400">No vault data available for this snapshot.</p>
                    )}

                    {/* Print footer */}
                    <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                      <span>{report.snap.warehouse_name} · {formatSnapDate(report.snap.date)}</span>
                      <span>Printed {new Date().toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Email modal */}
      <AnimatePresence>
        {emailModal && report && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Send Report by Email</h3>
                <button onClick={() => setEmailModal(false)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                {report.snap.warehouse_name} · {formatSnapDate(report.snap.date)}
              </p>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 mb-4">
                <EnvelopeIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 truncate">{user?.email}</span>
              </div>
              {sendResult === 'ok' && (
                <p className="text-sm text-green-600 font-medium mb-3">Email sent successfully!</p>
              )}
              {sendResult === 'err' && (
                <p className="text-sm text-red-500 mb-3">Failed to send. Please try again.</p>
              )}
              <button
                onClick={sendEmail}
                disabled={sending}
                className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send to my email'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </>
  );
}
