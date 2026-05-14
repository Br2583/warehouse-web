'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Trash2, Plus, Printer, X, Package, CheckCircle, Truck, Clock, Mail } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID  = 'service_gxur23h';
const EMAILJS_TEMPLATE_ID = 'warehouse_report'; // reemplaza con tu nuevo Template ID
const EMAILJS_PUBLIC_KEY  = 'I_NflBogOJ5lZnKiG';

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-700',
  READY:     'bg-green-100 text-green-700',
  DELIVERED: 'bg-blue-100 text-blue-700',
};

export default function SnapshotsPage() {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<{ snap: any; boxes: any[] } | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [toEmail, setToEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<'ok' | 'err' | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchSnapshots = () =>
    api.get('/api/snapshots')
      .then(data => setSnapshots(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => { fetchSnapshots(); }, []);

  const createSnapshot = async (warehouseId: number) => {
    try {
      await api.post(`/api/snapshots/create/${warehouseId}`, {});
      fetchSnapshots();
    } catch (e: any) {
      alert(e.message || 'Failed to create snapshot');
    }
  };

  const deleteSnapshot = async (id: string) => {
    if (!confirm('Delete this snapshot?')) return;
    try {
      await api.delete(`/api/snapshots/${id}`);
      fetchSnapshots();
    } catch (e: any) {
      alert(e.message || 'Failed to delete');
    }
  };

  const openReport = async (snap: any) => {
    setReportLoading(true);
    setReport({ snap, boxes: [] });
    try {
      // Try to get snapshot detail first
      const detail = await api.get(`/api/snapshots/${snap.snapshot_id}`).catch(() => null);
      const boxes = detail?.boxes || detail?.volts || detail?.items || null;

      if (boxes && Array.isArray(boxes) && boxes.length > 0) {
        setReport({ snap, boxes });
      } else {
        // Fallback: fetch current warehouse boxes
        const whData = await api.get(`/api/boxes?warehouse_id=${snap.warehouse_id}`);
        const whBoxes = Array.isArray(whData) ? whData : whData?.boxes || [];
        setReport({ snap, boxes: whBoxes });
      }
    } catch {
      setReport({ snap, boxes: [] });
    } finally {
      setReportLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const sendEmail = async () => {
    if (!report || !toEmail) return;
    setSending(true);
    setSendResult(null);
    try {
      const rows = ['A','B','C','D','E','F','G','H','I','J'];
      const cols = [1,2,3,4,5,6,7,8];
      const formatLevel = (level: number) => {
        const levelName = level === 1 ? 'LOWER' : 'UPPER';
        let text = `\n=== Level ${level} â€” ${levelName} ===\n`;
        text += `     ` + cols.map(c => `Col${c}`.padEnd(14)).join('') + '\n';
        rows.forEach(row => {
          text += `${row}    `;
          cols.forEach(col => {
            const box = report.boxes.find(b => b.row === row && Number(b.column) === col && Number(b.level) === level);
            text += box ? `${box.client_name.slice(0,10)}(${(box.estado||box.status||'PND').slice(0,3)})`.padEnd(14) : 'â€”'.padEnd(14);
          });
          text += '\n';
        });
        return text;
      };

      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email:       toEmail,
        warehouse_id:   report.snap.warehouse_id,
        snapshot_date:  report.snap.snapshot_date,
        snapshot_time:  report.snap.snapshot_time,
        total:          report.boxes.length || report.snap.total_boxes,
        pending:        report.boxes.filter(b => (b.estado||b.status) === 'PENDING').length,
        ready:          report.boxes.filter(b => (b.estado||b.status) === 'READY').length,
        delivered:      report.boxes.filter(b => (b.estado||b.status) === 'DELIVERED').length,
        report_content: formatLevel(1) + formatLevel(2),
      }, EMAILJS_PUBLIC_KEY);

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
      {/* Print styles â€” only affects @media print */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-report, #print-report * { visibility: visible; }
          #print-report { position: fixed; top: 0; left: 0; width: 100%; background: white; }
        }
      `}</style>

      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="md:ml-64 flex-1 p-4 md:p-8 pb-20 md:pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Snapshots</h1>
              <p className="text-gray-500 text-sm mt-1">Daily inventory records â€” click to view & print</p>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map(id => (
                <button key={id} onClick={() => createSnapshot(id)}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" /> WH {id}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No snapshots yet. Create one above.</div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {snapshots.map((snap, i) => (
                <motion.div
                  key={snap.snapshot_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                      <Camera className="w-4 h-4 text-blue-600" />
                    </div>
                    <button onClick={() => deleteSnapshot(snap.snapshot_id)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="font-semibold text-gray-900">Warehouse {snap.warehouse_id}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{snap.snapshot_date} · {snap.snapshot_time}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-3">{snap.total_boxes}</p>
                  <p className="text-xs text-gray-400 mb-4">total volts</p>
                  <button
                    onClick={() => openReport(snap)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors font-medium"
                  >
                    <Printer className="w-4 h-4" /> View & Print Report
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
                  Warehouse {report.snap.warehouse_id} â€” {report.snap.snapshot_date} {report.snap.snapshot_time}
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setEmailModal(true); setSendResult(null); }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
                  >
                    <Mail className="w-4 h-4" /> Send Email
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <button onClick={() => setReport(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
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
                      <p className="text-gray-500 mt-1">Warehouse {report.snap.warehouse_id} · {report.snap.snapshot_date} at {report.snap.snapshot_time}</p>
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
                    <div className="grid grid-cols-4 gap-4 mb-8">
                      {[
                        { label: 'Total Volts', value: report.boxes.length || report.snap.total_boxes, icon: Package, color: 'bg-gray-50 text-gray-700' },
                        { label: 'Pending',     value: pending,   icon: Clock,        color: 'bg-amber-50 text-amber-700' },
                        { label: 'Ready',       value: ready,     icon: CheckCircle,  color: 'bg-green-50 text-green-700' },
                        { label: 'Delivered',   value: delivered, icon: Truck,        color: 'bg-blue-50 text-blue-700' },
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
                                <h2 className="font-bold text-gray-900 text-base">Level {level} â€” {levelName}</h2>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{levelBoxes.length} volts</span>
                              </div>

                              <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <table className="w-full text-xs">
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
                                                <div className="text-gray-200 text-[10px]">â€”</div>
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
                      <p className="text-center py-8 text-gray-400">No volt data available for this snapshot.</p>
                    )}

                    {/* Print footer */}
                    <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                      <span>Warehouse {report.snap.warehouse_id} · Snapshot {report.snap.snapshot_date}</span>
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
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Warehouse {report.snap.warehouse_id} · {report.snap.snapshot_date}
              </p>
              <input
                type="email"
                placeholder="recipient@email.com"
                value={toEmail}
                onChange={e => setToEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
              />
              {sendResult === 'ok' && (
                <p className="text-sm text-green-600 font-medium mb-3">âœ“ Email sent successfully!</p>
              )}
              {sendResult === 'err' && (
                <p className="text-sm text-red-500 mb-3">Failed to send. Check the Template ID in the code.</p>
              )}
              <button
                onClick={sendEmail}
                disabled={sending || !toEmail}
                className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

