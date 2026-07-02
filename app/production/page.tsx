'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  WrenchScrewdriverIcon, CheckIcon, PlusIcon, XMarkIcon, TrashIcon,
  ChevronRightIcon, ExclamationCircleIcon, UserCircleIcon,
} from '@heroicons/react/24/outline';
import ConfirmModal from '@/components/ConfirmModal';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { parseDate } from '@/lib/utils';
import { notify, requestNotificationPermission } from '@/lib/notifications';

const PHASES = ['Assigned', 'In Progress', 'Review', 'Completed'];
const PHASE_COLORS = [
  'bg-gray-100 text-gray-500',
  'bg-amber-50 text-amber-700',
  'bg-purple-50 text-purple-700',
  'bg-green-50 text-green-700',
];
const WORK_TYPES = ['Cleaning', 'Restoration', 'Delivery'];

function formatDate(d: string) {
  if (!d) return '-';
  try {
    // Normalize PocketBase formats: "2026-06-26 00:00:00.000Z" or "2026-06-26"
    const clean = d.split(/[ T]/)[0];
    return new Date(clean + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return d; }
}

function Stepper({ phase, onPhase, isOwner }: {
  phase: number;
  onPhase: (p: number) => void;
  isOwner: boolean;
}) {
  return (
    <div className="flex items-start">
      {PHASES.map((label, i) => {
        const p = i + 1;
        const done = p < phase;
        const curr = p === phase;
        const clickable = isOwner ? p !== phase : p === phase + 1;
        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1">
              <motion.button
                onClick={(e) => { e.stopPropagation(); if (clickable) onPhase(p); }}
                disabled={!clickable}
                whileTap={clickable ? { scale: 0.85 } : {}}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${done ? 'bg-blue-600 text-white' : curr ? 'bg-blue-600 text-white ring-2 ring-blue-200' : 'bg-gray-100 text-gray-400'}
                  ${clickable ? 'cursor-pointer hover:ring-2 hover:ring-blue-300' : 'cursor-default'}`}
              >
                {done ? <CheckIcon className="w-3 h-3" /> : <span>{p}</span>}
              </motion.button>
              <span className={`text-xs text-center leading-tight w-14 whitespace-normal
                ${curr ? 'text-blue-600 font-medium' : done ? 'text-gray-500' : 'text-gray-300'}`}>
                {label}
              </span>
            </div>
            {i < PHASES.length - 1 && (
              <div className={`h-0.5 flex-1 mx-0.5 mb-5 transition-colors duration-300 ${done ? 'bg-blue-600' : 'bg-gray-100'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const emptyForm = {
  client_name: '',
  work_type: 'Cleaning',
  date: new Date().toISOString().split('T')[0],
  notes: '',
  volt_ids: [] as string[],
};


export default function ProductionPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [voltSearch, setVoltSearch] = useState('');
  const [voltResults, setVoltResults] = useState<any[]>([]);
  const [voltSearching, setVoltSearching] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const fetchOrders = async () => {
    try {
      const data = await api.get('/api/work-orders');
      setOrders(Array.isArray(data) ? data : []);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); requestNotificationPermission(); }, []);

  const openDetail = async (order: any) => {
    setSelected(order);
    setDetailError('');
    try {
      const id = order.id || order.work_order_id;
      const detail = await api.get(`/api/work-orders/${id}`);
      setSelectedDetail(detail);
    } catch {
      setSelectedDetail(order);
    }
  };

  const updatePhase = async (orderId: string, phase: number) => {
    try {
      await api.put(`/api/work-orders/${orderId}/phase`, { phase });
      setOrders(prev => prev.map(o =>
        (o.id || o.work_order_id) === orderId ? { ...o, phase } : o
      ));
      if (selected && (selected.id || selected.work_order_id) === orderId) {
        setSelected((prev: any) => prev ? { ...prev, phase } : prev);
        if (selectedDetail) setSelectedDetail((prev: any) => prev ? { ...prev, phase } : prev);
      }
    } catch (e: any) {
      setDetailError(e?.message || 'Failed to update phase');
    }
  };

  const deleteOrder = (id: string) => {
    setConfirmModal({
      message: 'Delete this work order? This cannot be undone.',
      onConfirm: async () => {
        setDetailError('');
        try {
          await api.delete(`/api/work-orders/${id}`);
          setSelected(null);
          setSelectedDetail(null);
          fetchOrders();
        } catch (e: any) {
          setDetailError(e.message || 'Failed to delete');
        }
      },
    });
  };

  const searchVolts = async (q: string) => {
    setVoltSearch(q);
    if (q.length < 2) { setVoltResults([]); return; }
    setVoltSearching(true);
    try {
      const data = await api.get(`/api/work-orders/search-volts/${encodeURIComponent(q)}`);
      setVoltResults(Array.isArray(data) ? data.slice(0, 8) : []);
    } catch { setVoltResults([]); }
    finally { setVoltSearching(false); }
  };

  const toggleVolt = (box: any) => {
    const id = box.box_id || box.id;
    setForm(f => ({
      ...f,
      volt_ids: f.volt_ids.includes(id) ? f.volt_ids.filter(v => v !== id) : [...f.volt_ids, id],
    }));
  };

  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name.trim()) { setSaveError('Client name is required'); return; }
    setSaving(true);
    setSaveError('');
    try {
      await api.post('/api/work-orders', {
        client_name: form.client_name.trim(),
        work_type: form.work_type,
        date: form.date,
        notes: form.notes,
        volt_ids: form.volt_ids,
      });
      setShowCreate(false);
      setForm(emptyForm);
      setVoltSearch('');
      setVoltResults([]);
      fetchOrders();
      notify('New Work Order', `${form.work_type} order created for ${form.client_name.trim()}`);
    } catch (e: any) {
      setSaveError(e.message || 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const detailOrder = selectedDetail || selected;
  const detailId = detailOrder?.id || detailOrder?.work_order_id;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 p-4 md:p-8 pb-28 md:pb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production</h1>
            <p className="text-gray-500 text-sm mt-1">{orders.length} work orders</p>
          </div>
          <button
           
            onClick={() => { setShowCreate(true); setSaveError(''); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" /> New Work Order
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {orders.length === 0 && (
              <div className="text-center py-16 text-gray-400">No work orders found</div>
            )}
            {orders.map((order, i) => {
              const phase = order.phase || 1;
              return (
                <motion.div
                  key={order.id || order.work_order_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => openDetail(order)}
                  className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow cursor-pointer"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <WrenchScrewdriverIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{order.client_name}</p>
                      <p className="text-sm text-gray-500">{order.work_type} · {formatDate(order.date)}</p>
                      {order.assigned_to && (
                        <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <UserCircleIcon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{order.assigned_to}</span>
                        </p>
                      )}
                    </div>
                    <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${PHASE_COLORS[phase - 1]}`}>
                      {PHASES[phase - 1]}
                    </span>
                    <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                  <Stepper
                    phase={phase}
                    onPhase={(p) => updatePhase(order.id || order.work_order_id, p)}
                    isOwner={isOwner}
                  />
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Work Order Detail Modal */}
        <AnimatePresence>
          {selected && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => { setSelected(null); setSelectedDetail(null); }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-gray-900">Work Order</h2>
                  <button onClick={() => { setSelected(null); setSelectedDetail(null); }} className="text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Phase stepper */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Progress</p>
                  <Stepper
                    phase={detailOrder?.phase || 1}
                    onPhase={(p) => updatePhase(detailId, p)}
                    isOwner={isOwner}
                  />
                </div>

                {/* Info */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Client</span>
                    <span className="font-medium text-gray-900">{detailOrder?.client_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium text-gray-900">{detailOrder?.work_type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium text-gray-900">{formatDate(detailOrder?.date)}</span>
                  </div>
                  {detailOrder?.assigned_to && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Assigned to</span>
                      <span className="font-medium text-gray-900">{detailOrder.assigned_to}</span>
                    </div>
                  )}
                  {detailOrder?.notes && (
                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-gray-500 flex-shrink-0">Notes</span>
                      <span className="font-medium text-gray-900 text-right">{detailOrder.notes}</span>
                    </div>
                  )}
                </div>

                {/* Vaults */}
                {(() => {
                  const voltList = detailOrder?.volt_details || detailOrder?.volts || [];
                  return voltList.length > 0 ? (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Vaults ({voltList.length})</p>
                      <div className="space-y-2">
                        {voltList.map((volt: any) => {
                          const voltId = volt.volt_id || volt.box_id || volt.id;
                          return (
                            <div key={voltId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{volt.client_name || volt.position || voltId}</p>
                                {volt.position && <p className="text-xs text-gray-400">{volt.position}</p>}
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                {volt.estado || volt.status || '-'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}

                {detailError && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-2">
                    <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{detailError}</span>
                    <button onClick={() => setDetailError('')}><XMarkIcon className="w-4 h-4" /></button>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-50">
                  <button
                    onClick={() => deleteOrder(detailId)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" /> Delete Order
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Create Work Order Modal */}
        <AnimatePresence>
          {showCreate && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-gray-900">New Work Order</h2>
                  <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={createOrder} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Client Name <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="Client name" value={form.client_name}
                      onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Work Type</label>
                    <div className="flex gap-2">
                      {WORK_TYPES.map(t => (
                        <button type="button" key={t}
                          onClick={() => setForm(f => ({ ...f, work_type: t }))}
                          className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${form.work_type === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date</label>
                    <input type="date" value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Select Vaults (optional)</label>
                    <input
                      type="text"
                      placeholder="Search by client name..."
                      value={voltSearch}
                      onChange={e => searchVolts(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                    />
                    {voltSearching && <p className="text-xs text-gray-400 mb-2">Searching...</p>}
                    {voltResults.length > 0 && (
                      <div className="border border-gray-100 rounded-xl overflow-hidden mb-2 max-h-40 overflow-y-auto">
                        {voltResults.map((box: any) => {
                          const id = box.box_id || box.id;
                          const sel = form.volt_ids.includes(id);
                          return (
                            <button type="button" key={id}
                              onClick={() => toggleVolt(box)}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm border-b border-gray-50 last:border-0 transition-colors ${sel ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                              <span className={sel ? 'text-blue-700 font-medium' : 'text-gray-700'}>
                                {box.client_name} · {box.position}
                              </span>
                              <span className={`text-xs w-5 h-5 flex items-center justify-center rounded-full ${sel ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                {sel ? 'OK' : '+'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {form.volt_ids.length > 0 && (
                      <p className="text-xs text-blue-600 font-medium">{form.volt_ids.length} vault(s) selected</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
                    <textarea placeholder="Add notes..." value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>

                  {saveError && <p className="text-sm text-red-500">{saveError}</p>}

                  <button type="submit" disabled={saving}
                    className="w-full py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {saving ? 'Creating...' : 'Create Work Order'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
