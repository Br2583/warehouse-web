'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Clock, Play, Check, Plus, X, Trash2, ChevronRight } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  pending:     { color: 'bg-gray-100 text-gray-600',   icon: Clock,  label: 'Pending' },
  in_progress: { color: 'bg-amber-100 text-amber-700', icon: Play,   label: 'In Progress' },
  completed:   { color: 'bg-green-100 text-green-700', icon: Check,  label: 'Completed' },
};

const VOLT_STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-700',
  READY:     'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-green-100 text-green-700',
  completed: 'bg-green-100 text-green-700',
  in_progress: 'bg-amber-100 text-amber-700',
};

const WORK_TYPES = ['Cleaning', 'Restoration', 'Delivery'];

const emptyForm = {
  client_name: '',
  work_type: 'Cleaning',
  date: new Date().toISOString().split('T')[0],
  notes: '',
  volt_ids: [] as string[],
};

export default function ProductionPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [voltSearch, setVoltSearch] = useState('');
  const [voltResults, setVoltResults] = useState<any[]>([]);
  const [voltSearching, setVoltSearching] = useState(false);

  const fetchOrders = async () => {
    try {
      const data = await api.get('/api/work-orders');
      setOrders(Array.isArray(data) ? data : []);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const openDetail = async (order: any) => {
    setSelected(order);
    try {
      const id = order.id || order.work_order_id || order._id;
      console.log('openDetail order keys:', Object.keys(order), 'id used:', id);
      const detail = await api.get(`/api/work-orders/${id}`);
      console.log('detail response:', JSON.stringify(detail, null, 2));
      setSelectedDetail(detail);
    } catch (e) {
      console.log('detail fetch error:', e);
      setSelectedDetail(order);
    }
  };

  const updateVoltStatus = async (workOrderId: string, voltId: string, status: string) => {
    console.log('updateVoltStatus', { workOrderId, voltId, status });
    try {
      await api.put(`/api/work-orders/${workOrderId}/volt`, { volt_id: voltId, status });
      const detail = await api.get(`/api/work-orders/${workOrderId}`);
      setSelectedDetail(detail);
      fetchOrders();
    } catch (e: any) {
      alert(e.message || 'Failed to update volt');
    }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Delete this work order?')) return;
    try {
      await api.delete(`/api/work-orders/${id}`);
      setSelected(null);
      setSelectedDetail(null);
      fetchOrders();
    } catch (e: any) {
      alert(e.message || 'Failed to delete');
    }
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
    } catch (e: any) {
      setSaveError(e.message || 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const detailOrder = selectedDetail || selected;
  const detailId = detailOrder?.id || detailOrder?.work_order_id || detailOrder?._id;
  const detailCfg = STATUS_CONFIG[detailOrder?.status] || STATUS_CONFIG.pending;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production</h1>
            <p className="text-gray-500 text-sm mt-1">{orders.length} work orders</p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setSaveError(''); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Work Order
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
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={order.id || order.work_order_id || order._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => openDetail(order)}
                  className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{order.client_name}</p>
                    <p className="text-sm text-gray-500">{order.work_type} · {order.date} · {order.volts?.length || order.volt_ids?.length || 0} volts</p>
                  </div>
                  <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${cfg.color}`}>
                    <Icon className="w-3 h-3" /> {cfg.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
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
                    <X className="w-5 h-5" />
                  </button>
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
                    <span className="font-medium text-gray-900">{detailOrder?.date}</span>
                  </div>
                  {detailOrder?.notes && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Notes</span>
                      <span className="font-medium text-gray-900">{detailOrder.notes}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-500">Status</span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${detailCfg.color}`}>{detailCfg.label}</span>
                  </div>
                </div>

                {/* Volts */}
                <div className="mb-4">
                  {(() => {
                    const voltList = detailOrder?.volt_details || detailOrder?.volts || [];
                    return (
                      <>
                        <p className="text-sm font-semibold text-gray-700 mb-3">
                          Volts ({voltList.length})
                        </p>
                        {voltList.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">No volts assigned to this order</p>
                        ) : (
                          <div className="space-y-2">
                            {voltList.map((volt: any) => {
                              const voltId = volt.volt_id || volt.box_id || volt.id;
                              const voltStatus = volt.status || volt.work_order_status || volt.estado || 'pending';
                              const isCompleted = voltStatus === 'completed' || voltStatus === 'DELIVERED';
                              return (
                                <div key={voltId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{volt.client_name || volt.position || voltId}</p>
                                    <p className="text-xs text-gray-400">{volt.position}</p>
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${VOLT_STATUS_COLORS[voltStatus] || 'bg-gray-100 text-gray-600'}`}>
                                    {voltStatus}
                                  </span>
                                  {!isCompleted && (
                                    <button
                                      onClick={() => updateVoltStatus(detailId, voltId, 'completed')}
                                      className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                      Complete
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-50">
                  <button
                    onClick={() => deleteOrder(detailId)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Order
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
                    <X className="w-5 h-5" />
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

                  {/* Volt selector */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Select Volts</label>
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
                          const selected = form.volt_ids.includes(id);
                          return (
                            <button type="button" key={id}
                              onClick={() => toggleVolt(box)}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm border-b border-gray-50 last:border-0 transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                              <span className={selected ? 'text-blue-700 font-medium' : 'text-gray-700'}>
                                {box.client_name} · {box.position}
                              </span>
                              <span className={`text-xs w-5 h-5 flex items-center justify-center rounded-full ${selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                {selected ? '✓' : '+'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {form.volt_ids.length > 0 && (
                      <p className="text-xs text-blue-600 font-medium">{form.volt_ids.length} volt(s) selected</p>
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
    </div>
  );
}
