'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CameraIcon, TrashIcon, PlusIcon, PrinterIcon, XMarkIcon,
  ArchiveBoxIcon, CheckCircleIcon, TruckIcon, ClockIcon, EnvelopeIcon, ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import ConfirmModal from '@/components/ConfirmModal';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { pb } from '@/lib/pb';
import { useAuth } from '@/lib/auth-context';
import { STATUS_COLORS } from '@/lib/constants';

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
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<{ snap: any; boxes: any[] } | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [toEmail, setToEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<'ok' | 'err' | 'invalid' | null>(null);
  const [actionError, setActionError] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchSnapshots = () =>
    api.get('/api/snapshots')
      .then(data => setSnapshots(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { fetchSnapshots(); }, []);

  useEffect(() => {
    if (!user?.company_id) return;
    pb.collection('warehouses')
      .getFullList({ filter: `company_id="${user.company_id}"` })
      .then(whs => setWarehouses(whs.map(w => ({ id: w.id, name: w['name'] as string }))))
      .catch(() => {});
  }, [user?.company_id]);

  const createSnapshot = async (warehouseId: string) => {
    setActionError('');
    try {
      await api.post(`/api/snapshots/create/${warehouseId}`, {});
      fetchSnapshots();
    } catch (e: any) {
      setActionError(e.message || 'Failed to create snapshot');
    }
  };

  const deleteSnapshot = (id: string) => {
    setConfirmModal({
      message: 'Delete this snapshot? This cannot be undone.',
      onConfirm: async () => {
        setActionError('');
        try {
          await api.delete(`/api/snapshots/${id}`);
          fetchSnapshots();
        } catch (e: any) {
          setActionError(e.message || 'Failed to delete snapshot');
        }
      },
    });
  };

  const openReport = async (snap: any) => {
    setReportLoading(true);
    setReport({ snap, boxes: [] });
    try {
      const boxes = snap.data?.vaults || [];
      setReport({ snap, boxes });
    } finally {
      setReportLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const sendEmail = async () => {
    if (!report || !toEmail) return;
    if (!isValidEmail(toEmail)) { setSendResult('invalid'); return; }
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/snapshots/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` },
        body: JSON.stringify({
          to:            toEmail,
          warehouseName: report.snap.warehouse_name,
          date:          formatSnapDate(report.snap.date),
          total:         report.boxes.length || report.snap.box_count,
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
      setToEmail('');
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
      {/* Print / PDF styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 1.2cm; }
          body * { visibility: hidden; }
          #print-report, #print-report * { visibility: visible; }
          #print-report {
            position: fixed; top: 0; left: 0; width: 100%; background: white;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="md:ml-64 flex-1 min-w-0 p-4 md:p-8 pb-28 md:pb-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Snapshots</h1>
              <p className="text-gray-500 text-sm mt-1">Daily inventory records - click to view & print</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {warehouses.map(wh => (
                <button key={wh.id} onClick={() => createSnapshot(wh.id)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                  <PlusIcon className="w-4 h-4" /> {wh.name}
                </button>
              ))}
            </div>
          </div>

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
          <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl my-4"
            >
              {/* Modal toolbar (hidden on print) */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
                <h2 className="font-bold text-gray-900">
                  {report.snap.warehouse_name} — {formatSnapDate(report.snap.date)}
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setEmailModal(true); setSendResult(null); }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
                  >
                    <EnvelopeIcon className="w-4 h-4" /> Send Email
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <PrinterIcon className="w-4 h-4" /> Print
                  </button>
                  <button onClick={() => setReport(null)} className="text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable content */}
              <div id="print-report" ref={printRef} className="p-8">
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
                {reportLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
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

                    {/* Level grids */}
                    {report.boxes.length > 0 ? (
                      <div className="space-y-8">
                        {[1, 2].map(level => {
                          const levelName = level === 1 ? 'Lower' : 'Upper';
                          const rows = ['A','B','C','D','E','F','G','H','I','J'];
                          const cols = [1,2,3,4,5,6,7,8];
                          const getBox = (row: string, col: number) =>
                            report.boxes.find(b => b.row === row && Number(b.column) === col && Number(b.level) === level);
                          const levelBoxes = report.boxes.filter(b => Number(b.level) === level);

                          return (
                            <div key={level}>
                              <div className="flex items-center gap-3 mb-3">
                                <h2 className="font-bold text-gray-900 text-base">Level {level} - {levelName}</h2>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{levelBoxes.length} vaults</span>
                              </div>

                              <div className="border border-gray-200 rounded-xl overflow-x-auto">
                                <table className="w-full min-w-[480px] text-xs">
                                  <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                      <th className="px-3 py-2 text-gray-400 font-semibold w-8">Row</th>
                                      {cols.map(c => (
                                        <th key={c} className="px-2 py-2 text-center text-gray-500 font-semibold">Col {c}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rows.map(row => (
                                      <tr key={row} className="border-b border-gray-100 last:border-0">
                                        <td className="px-3 py-2 font-bold text-gray-500 bg-gray-50">{row}</td>
                                        {cols.map(col => {
                                          const box = getBox(row, col);
                                          const status = box ? (box.estado || box.status || 'PENDING') : null;
                                          return (
                                            <td key={col} className="px-2 py-1.5 text-center align-top">
                                              {box ? (
                                                <div className={`rounded-lg px-1.5 py-1 ${
                                                  status === 'READY' ? 'bg-green-50 border border-green-200' :
                                                  status === 'DELIVERED' ? 'bg-blue-50 border border-blue-200' :
                                                  'bg-amber-50 border border-amber-200'
                                                }`}>
                                                  <p className="font-semibold text-gray-900 leading-tight truncate max-w-[80px]">{box.client_name}</p>
                                                  <p className="text-gray-400 text-[10px]">{box.job_type}</p>
                                                  <span className={`text-[10px] font-medium px-1 rounded ${STATUS_COLORS[status!] || 'bg-gray-100 text-gray-500'}`}>
                                                    {status}
                                                  </span>
                                                </div>
                                              ) : (
                                                <div className="text-gray-200 text-[10px]">-</div>
                                              )}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
              <input
                type="email"
                placeholder="recipient@email.com"
                value={toEmail}
                onChange={e => { setToEmail(e.target.value); setSendResult(null); }}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
              />
              {sendResult === 'ok' && (
                <p className="text-sm text-green-600 font-medium mb-3">Email sent successfully!</p>
              )}
              {sendResult === 'invalid' && (
                <p className="text-sm text-red-500 mb-3">Please enter a valid email address.</p>
              )}
              {sendResult === 'err' && (
                <p className="text-sm text-red-500 mb-3">Failed to send. Please try again.</p>
              )}
              <button
                onClick={sendEmail}
                disabled={sending || !toEmail.trim()}
                className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send'}
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
