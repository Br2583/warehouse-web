'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Search, Trash2, X, Camera, LayoutGrid, List } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';

interface Box {
  box_id: string;
  warehouse_id: number;
  row: string;
  column: number;
  level: number;
  position: string;
  client_name: string;
  job_type: string;
  vault_status: string[];
  content_type: string;
  room_location: string[];
  packer: string;
  photos: string[];
  comments: string;
  estado: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  READY: 'bg-green-100 text-green-700',
  DELIVERED: 'bg-blue-100 text-blue-700',
};

const STATUS_CELL: Record<string, string> = {
  PENDING: 'bg-amber-400',
  READY: 'bg-green-500',
  DELIVERED: 'bg-blue-500',
};

const JOB_TYPES = ['Fire', 'Water', 'Moving', 'Storage'];
const CONTENTS_TYPES = ['Boxes', 'Furniture', 'Both'];
const ROOM_LOCATIONS = ['Kitchen', 'Patio', 'Living Room', 'Family Room', 'Dining Room', 'Bathroom', 'Bedroom 1', 'Bedroom 2', 'Bedroom 3'];
const VAULT_STATUSES = ['Total Loss', 'Needs Cleaning', 'Ready to Go', 'Storage Only'];
const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const COLUMNS = [1, 2, 3, 4, 5, 6, 7, 8];

const emptyForm = {
  client_name: '',
  row: 'A',
  column: 1,
  level: 1,
  job_type: 'Moving',
  contents_type: 'Boxes',
  room_location: [] as string[],
  vault_status: [] as string[],
  packer: '',
  status: 'PENDING',
  comments: '',
};

export default function WarehouseDetailPage() {
  const { id } = useParams();
  const warehouseId = Number(id);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Box | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [apiError, setApiError] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [mapLevel, setMapLevel] = useState<1 | 2>(1);

  const fetchBoxes = () => {
    setApiError('');
    api.get(`/api/boxes?warehouse_id=${warehouseId}`)
      .then(data => {
        if (Array.isArray(data)) setBoxes(data);
        else if (data?.boxes) setBoxes(data.boxes);
        else if (data?.items) setBoxes(data.items);
        else { setBoxes([]); setApiError(`Unexpected response: ${JSON.stringify(data).slice(0, 100)}`); }
      })
      .catch(err => setApiError(`API Error: ${err.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBoxes(); }, [warehouseId]);

  const filtered = boxes.filter(b =>
    b.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.position?.toLowerCase().includes(search.toLowerCase()) ||
    b.packer?.toLowerCase().includes(search.toLowerCase())
  );

  const deleteBox = async (boxId: string) => {
    if (!confirm('Delete this volt?')) return;
    await api.delete(`/api/boxes/${boxId}`);
    setSelected(null);
    fetchBoxes();
  };

  const toggleMulti = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const addVolt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name.trim()) { setSaveError('Client name is required'); return; }
    setSaving(true);
    setSaveError('');
    try {
      const levelName = form.level === 1 ? 'lower' : 'upper';
      await api.post('/api/boxes', {
        warehouse_id: warehouseId,
        row: form.row,
        column: form.column,
        level: form.level,
        position: levelName,
        client_name: form.client_name.trim(),
        job_type: form.job_type,
        content_type: form.contents_type,
        room_location: form.room_location,
        vault_status: form.vault_status,
        packer: form.packer,
        estado: form.status,
        comments: form.comments,
      });
      setShowAdd(false);
      setForm(emptyForm);
      fetchBoxes();
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to add volt');
    } finally {
      setSaving(false);
    }
  };

  const boxStatus = (box: Box) => box.estado || box.status || 'PENDING';

  // Map helpers
  const getBox = (row: string, col: number, level: number) =>
    boxes.find(b => b.row === row && Number(b.column) === col && Number(b.level) === level);

  const openAddAtPosition = (row: string, col: number, level: number) => {
    setForm({ ...emptyForm, row, column: col, level });
    setSaveError('');
    setShowAdd(true);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Warehouse {warehouseId}</h1>
            <p className="text-gray-500 text-sm mt-1">{boxes.length} volts stored</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <LayoutGrid className="w-4 h-4" /> Map
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <List className="w-4 h-4" /> List
              </button>
            </div>
            <button
              onClick={() => { setForm(emptyForm); setShowAdd(true); setSaveError(''); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Volt
            </button>
          </div>
        </div>

        {apiError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-mono">{apiError}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : viewMode === 'map' ? (
          /* ── MAP VIEW ── */
          <div>
            {/* Level selector */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm text-gray-500 font-medium">Level:</span>
              <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setMapLevel(1)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${mapLevel === 1 ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Lower (L1)
                </button>
                <button
                  onClick={() => setMapLevel(2)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${mapLevel === 2 ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Upper (L2)
                </button>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 ml-4">
                {[['bg-gray-100', 'Empty'], ['bg-amber-400', 'Pending'], ['bg-green-500', 'Ready'], ['bg-blue-500', 'Delivered']].map(([color, label]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-sm ${color}`} />
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 overflow-x-auto">
              {/* Column headers */}
              <div className="flex gap-2 mb-2 ml-10">
                {COLUMNS.map(col => (
                  <div key={col} className="w-20 text-center text-xs font-semibold text-gray-400">Col {col}</div>
                ))}
              </div>

              {ROWS.map(row => (
                <div key={row} className="flex items-center gap-2 mb-2">
                  {/* Row label */}
                  <div className="w-8 text-center text-xs font-bold text-gray-500">{row}</div>

                  {COLUMNS.map(col => {
                    const box = getBox(row, col, mapLevel);
                    const status = box ? boxStatus(box) : null;
                    return (
                      <motion.button
                        key={col}
                        whileHover={{ scale: 1.03 }}
                        onClick={() => box ? setSelected(box) : openAddAtPosition(row, col, mapLevel)}
                        className={`w-20 h-14 rounded-xl border-2 flex flex-col items-center justify-center transition-all text-center
                          ${box
                            ? `${STATUS_CELL[status!] || 'bg-gray-300'} border-transparent text-white cursor-pointer`
                            : 'bg-gray-50 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                          }`}
                      >
                        {box ? (
                          <>
                            <span className="text-xs font-bold leading-tight truncate w-full px-1 text-center">{box.client_name}</span>
                            <span className="text-[10px] opacity-80">{box.job_type}</span>
                          </>
                        ) : (
                          <Plus className="w-4 h-4 text-gray-300" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── LIST VIEW ── */
          <div>
            <div className="relative mb-6">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by client, position, packer..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Position</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Client</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Job Type</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Packer</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Status</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Photos</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((box, i) => (
                    <motion.tr
                      key={box.box_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelected(box)}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{box.position}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{box.client_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{box.job_type}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{box.packer || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[boxStatus(box)] || 'bg-gray-100 text-gray-600'}`}>
                          {boxStatus(box)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {box.photos?.length > 0 ? (
                          <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5" />{box.photos.length}</span>
                        ) : '—'}
                      </td>
                    </motion.tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-16 text-gray-400 text-sm">No volts found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        <AnimatePresence>
          {selected && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-gray-900">Volt Detail</h2>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    ['Position', selected.position],
                    ['Client', selected.client_name],
                    ['Job Type', selected.job_type],
                    ['Content Type', selected.content_type || '—'],
                    ['Packer', selected.packer || '—'],
                    ['Status', boxStatus(selected)],
                    ['Comments', selected.comments || '—'],
                    ['Vault Status', selected.vault_status?.join(', ') || '—'],
                    ['Room Location', selected.room_location?.join(', ') || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-3">
                      <span className="text-sm text-gray-400 w-32 flex-shrink-0">{label}</span>
                      <span className="text-sm text-gray-900 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
                {selected.photos?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-400 mb-2">Photos</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selected.photos.map((photo, i) => (
                        <img key={i} src={photo} alt={`Photo ${i + 1}`} className="w-full h-32 object-cover rounded-xl" />
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => deleteBox(selected.box_id)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Volt Modal */}
        <AnimatePresence>
          {showAdd && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-gray-900">New Volt</h2>
                  <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={addVolt} className="space-y-4">
                  <div className="bg-blue-50 rounded-xl p-3 text-sm font-medium text-blue-700">
                    WH{warehouseId} · Row {form.row} · Col {form.column} · {form.level === 1 ? 'Lower (L1)' : 'Upper (L2)'}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Row</label>
                      <select value={form.row} onChange={e => setForm(f => ({ ...f, row: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {ROWS.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Column</label>
                      <select value={form.column} onChange={e => setForm(f => ({ ...f, column: Number(e.target.value) }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {COLUMNS.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Level</label>
                      <select value={form.level} onChange={e => setForm(f => ({ ...f, level: Number(e.target.value) }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value={1}>Lower (L1)</option>
                        <option value={2}>Upper (L2)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Client Name <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="Client name" value={form.client_name}
                      onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Job Type</label>
                    <div className="flex flex-wrap gap-2">
                      {JOB_TYPES.map(t => (
                        <button type="button" key={t}
                          onClick={() => setForm(f => ({ ...f, job_type: t }))}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${form.job_type === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Contents Type</label>
                    <div className="flex flex-wrap gap-2">
                      {CONTENTS_TYPES.map(t => (
                        <button type="button" key={t}
                          onClick={() => setForm(f => ({ ...f, contents_type: t }))}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${form.contents_type === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Room Location (multi)</label>
                    <div className="flex flex-wrap gap-2">
                      {ROOM_LOCATIONS.map(r => (
                        <button type="button" key={r}
                          onClick={() => setForm(f => ({ ...f, room_location: toggleMulti(f.room_location, r) }))}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${form.room_location.includes(r) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Vault Status (multi)</label>
                    <div className="flex flex-wrap gap-2">
                      {VAULT_STATUSES.map(s => (
                        <button type="button" key={s}
                          onClick={() => setForm(f => ({ ...f, vault_status: toggleMulti(f.vault_status, s) }))}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${form.vault_status.includes(s) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Packer</label>
                    <input type="text" placeholder="Who packed this?" value={form.packer}
                      onChange={e => setForm(f => ({ ...f, packer: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Status</label>
                    <div className="flex gap-2">
                      {['PENDING', 'READY', 'DELIVERED'].map(s => (
                        <button type="button" key={s}
                          onClick={() => setForm(f => ({ ...f, status: s }))}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${form.status === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Comments</label>
                    <textarea placeholder="Add comments..." value={form.comments}
                      onChange={e => setForm(f => ({ ...f, comments: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>

                  {saveError && <p className="text-sm text-red-500">{saveError}</p>}

                  <button type="submit" disabled={saving}
                    className="w-full py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {saving ? 'Saving...' : 'Create Volt'}
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
