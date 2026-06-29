'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Search, Trash2, X, Camera, LayoutGrid, List, Pencil, ChevronLeft, ChevronRight, QrCode, Settings2 } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import Sidebar from '@/components/Sidebar';
import VaultForm, { VaultFormData } from '@/components/VaultForm';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import { compressImage } from '@/lib/compress-image';
import { QRCodeSVG } from 'qrcode.react';
import { STATUS_COLORS, STATUS_CELL } from '@/lib/constants';

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


const ROWS    = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const COLUMNS = [1, 2, 3, 4, 5, 6, 7, 8];

const emptyForm: VaultFormData = {
  client_name:   '',
  row:           'A',
  column:        1,
  level:         1,
  job_type:      'Moving',
  contents_type: 'Boxes',
  room_location: [],
  vault_status:  [],
  packer:        '',
  status:        'PENDING',
  comments:      '',
  photos:        [],
};



export default function WarehouseDetailPage() {
  const { id } = useParams();
  const warehouseId = id as string;
  const [warehouseName, setWarehouseName] = useState('');
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
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<VaultFormData | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [warehouseRows, setWarehouseRows] = useState(10);
  const [warehouseCols, setWarehouseCols] = useState(8);
  const [showGridEdit, setShowGridEdit] = useState(false);
  const [gridRowsInput, setGridRowsInput] = useState(10);
  const [gridColsInput, setGridColsInput] = useState(8);
  const [gridSaving, setGridSaving] = useState(false);

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

  useEffect(() => {
    if (window.innerWidth < 768) setViewMode('list');
    fetchBoxes();
    import('@/lib/pb').then(({ pb }) =>
      pb.collection('warehouses').getOne(warehouseId).then(w => {
        setWarehouseName(w.name);
        const r = Number(w.rows) || 10;
        const c = Number(w.cols) || 8;
        setWarehouseRows(r); setGridRowsInput(r);
        setWarehouseCols(c); setGridColsInput(c);
      }).catch(() => {})
    );
  }, [warehouseId]);

  const filtered = boxes.filter(b =>
    b.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.position?.toLowerCase().includes(search.toLowerCase()) ||
    b.packer?.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (box: Box) => {
    setEditForm({
      client_name:   box.client_name || '',
      job_type:      box.job_type || 'Moving',
      contents_type: box.content_type || 'Boxes',
      room_location: box.room_location || [],
      vault_status:  box.vault_status || [],
      packer:        box.packer || '',
      status:        box.estado || box.status || 'PENDING',
      comments:      box.comments || '',
      photos:        box.photos || [],
    });
    setEditError('');
    setShowEdit(true);
  };

  const handleEditPhotos = async (files: FileList | null) => {
    if (!files || !editForm) return;
    try {
      const converted = await Promise.all(Array.from(files).slice(0, 4).map(f => compressImage(f)));
      setEditForm(f => f ? { ...f, photos: [...f.photos, ...converted].slice(0, 4) } : f);
    } catch (err: any) {
      setEditError(err?.message || 'Photo too large');
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !editForm?.client_name.trim()) { setEditError('Client name is required'); return; }
    setEditSaving(true);
    setEditError('');
    try {
      await api.put(`/api/boxes/${selected.box_id}`, {
        client_name:   editForm.client_name.trim(),
        job_type:      editForm.job_type,
        content_type:  editForm.contents_type,
        room_location: editForm.room_location,
        vault_status:  editForm.vault_status,
        packer:        editForm.packer,
        estado:        editForm.status,
        comments:      editForm.comments,
        photos:        editForm.photos,
      });
      setShowEdit(false);
      setSelected(null);
      fetchBoxes();
    } catch (err: any) {
      setEditError(err?.message || 'Failed to save');
    } finally {
      setEditSaving(false);
    }
  };

  const deleteBox = (boxId: string) => {
    setConfirmModal({
      message: 'Delete this vault? This cannot be undone.',
      onConfirm: async () => {
        try {
          await api.delete(`/api/boxes/${boxId}`);
          setSelected(null);
          fetchBoxes();
        } catch (err: any) {
          setApiError(err?.message || 'Failed to delete vault');
        }
      },
    });
  };

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files) return;
    try {
      const converted = await Promise.all(Array.from(files).slice(0, 4).map(f => compressImage(f)));
      setForm(f => ({ ...f, photos: [...f.photos, ...converted].slice(0, 4) }));
    } catch (err: any) {
      setSaveError(err?.message || 'Photo too large');
    }
  };

  const removePhoto = (idx: number) =>
    setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));

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
        photos: form.photos,
      });
      setShowAdd(false);
      setForm(emptyForm);
      fetchBoxes();
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to add vault');
    } finally {
      setSaving(false);
    }
  };

  const boxStatus = (box: Box) => box.estado || box.status || 'PENDING';

  const activeRows = ROWS.slice(0, warehouseRows);
  const activeCols = COLUMNS.slice(0, warehouseCols);

  const saveGridSize = async () => {
    setGridSaving(true);
    try {
      const { pb } = await import('@/lib/pb');
      await pb.collection('warehouses').update(warehouseId, { rows: gridRowsInput, cols: gridColsInput });
      setWarehouseRows(gridRowsInput);
      setWarehouseCols(gridColsInput);
      setShowGridEdit(false);
    } catch { /* silently fail — grid stays as-is */ }
    setGridSaving(false);
  };

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
      <main className="md:ml-64 flex-1 p-4 md:p-8 pb-20 md:pb-8">
        {/* Header */}
        <div data-tutorial="wh-header" className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{warehouseName || 'Warehouse'}</h1>
            <p className="text-gray-500 text-sm mt-1">{boxes.length} vaults stored</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Grid size button */}
            <button
              onClick={() => { setGridRowsInput(warehouseRows); setGridColsInput(warehouseCols); setShowGridEdit(v => !v); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-xl transition-colors ${showGridEdit ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'}`}
              title="Edit grid dimensions"
            >
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">{warehouseRows}×{warehouseCols}</span>
            </button>
            {/* View toggle */}
            <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <LayoutGrid className="w-4 h-4" /><span className="hidden sm:inline ml-1">Map</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <List className="w-4 h-4" /><span className="hidden sm:inline ml-1">List</span>
              </button>
            </div>
            <button
              data-tutorial="wh-add-btn"
              onClick={() => { setForm(emptyForm); setShowAdd(true); setSaveError(''); }}
              className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Vault</span><span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Grid dimension editor */}
        <AnimatePresence>
          {showGridEdit && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-4 bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Rows (A–{ROWS[gridRowsInput - 1]})</label>
                <input type="number" min={1} max={10} value={gridRowsInput} onChange={e => setGridRowsInput(Math.min(10, Math.max(1, Number(e.target.value))))}
                  className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Columns (1–{gridColsInput})</label>
                <input type="number" min={1} max={8} value={gridColsInput} onChange={e => setGridColsInput(Math.min(8, Math.max(1, Number(e.target.value))))}
                  className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={saveGridSize} disabled={gridSaving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
                {gridSaving ? 'Saving...' : 'Apply'}
              </button>
              <button onClick={() => setShowGridEdit(false)} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
            </motion.div>
          )}
        </AnimatePresence>

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
            {/* Level selector + Legend */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 font-medium">Level:</span>
                <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setMapLevel(1)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${mapLevel === 1 ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Lower
                  </button>
                  <button
                    onClick={() => setMapLevel(2)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${mapLevel === 2 ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Upper
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {[['bg-gray-100', 'Empty'], ['bg-amber-400', 'Pending'], ['bg-green-500', 'Ready'], ['bg-blue-500', 'Delivered']].map(([color, label]) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid */}
            <div data-tutorial="wh-map" className="bg-white rounded-2xl border border-gray-100 p-3 md:p-6 overflow-x-auto">
              <div className="min-w-max">
                {/* Column headers */}
                <div className="flex gap-1.5 mb-1.5 ml-8">
                  {activeCols.map(col => (
                    <div key={col} className="w-14 md:w-20 text-center text-[11px] md:text-xs font-semibold text-gray-400">{col}</div>
                  ))}
                </div>

                {activeRows.map(row => (
                  <div key={row} className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-6 md:w-8 text-center text-xs font-bold text-gray-500 flex-shrink-0">{row}</div>

                    {activeCols.map(col => {
                      const box = getBox(row, col, mapLevel);
                      const status = box ? boxStatus(box) : null;
                      return (
                        <motion.button
                          key={col}
                          whileHover={{ scale: 1.03 }}
                          onClick={() => { setShowQR(false); box ? setSelected(box) : openAddAtPosition(row, col, mapLevel); }}
                          className={`w-14 h-14 md:w-20 md:h-14 rounded-xl border-2 flex flex-col items-center justify-center transition-all text-center flex-shrink-0
                            ${box
                              ? `${STATUS_CELL[status!] || 'bg-gray-300'} border-transparent text-white cursor-pointer`
                              : 'bg-gray-50 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                            }`}
                        >
                          {box ? (
                            <>
                              <span className="text-[10px] md:text-xs font-bold leading-tight truncate w-full px-1 text-center">{box.client_name}</span>
                              <span className="text-[9px] md:text-[10px] opacity-80 mt-0.5">{box.job_type}</span>
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
                    <tr><td colSpan={6} className="text-center py-16 text-gray-400 text-sm">No vaults found</td></tr>
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
                  <h2 className="text-lg font-bold text-gray-900">Vault Detail</h2>
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
                        <img
                          key={i}
                          src={photo}
                          alt={`Photo ${i + 1}`}
                          onClick={() => setLightbox({ photos: selected.photos, index: i })}
                          className="w-full h-32 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      ))}
                    </div>
                  </div>
                )}
                {/* QR Code */}
                <div className="mt-4">
                  <button
                    onClick={() => setShowQR(v => !v)}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    {showQR ? 'Hide QR Code' : 'Show QR Code'}
                  </button>
                  {showQR && (
                    <div className="mt-3 flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl">
                      <QRCodeSVG
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/warehouses/${warehouseId}?vault=${selected.box_id}`}
                        size={160}
                        level="M"
                      />
                      <p className="text-xs text-gray-400 text-center">Scan to open this vault</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => openEdit(selected)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-xl transition-colors font-medium"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
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

        {/* Edit Vault Modal */}
        <AnimatePresence>
          {showEdit && editForm && selected && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowEdit(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-gray-900">Edit Vault</h2>
                  <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <VaultForm
                  mode="edit"
                  value={editForm}
                  onChange={setEditForm}
                  positionLabel={`WH${warehouseId} · Row ${selected.row} · Col ${selected.column} · ${selected.level === 1 ? 'Lower (L1)' : 'Upper (L2)'}`}
                  error={editError}
                  saving={editSaving}
                  submitLabel="Save Changes"
                  onSubmit={saveEdit}
                  onPhotos={handleEditPhotos}
                  onRemovePhoto={idx => setEditForm(f => f ? { ...f, photos: f.photos.filter((_, i) => i !== idx) } : f)}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Vault Modal */}
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
                  <h2 className="text-lg font-bold text-gray-900">New Vault</h2>
                  <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <VaultForm
                  mode="add"
                  value={form}
                  onChange={setForm}
                  positionLabel={`WH${warehouseId} · Row ${form.row} · Col ${form.column} · ${form.level === 1 ? 'Lower (L1)' : 'Upper (L2)'}`}
                  error={saveError}
                  saving={saving}
                  submitLabel="Create Vault"
                  onSubmit={addVolt}
                  onPhotos={handlePhotoFiles}
                  onRemovePhoto={removePhoto}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Photo Lightbox */}
        <AnimatePresence>
          {lightbox && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
              onClick={() => setLightbox(null)}
            >
              {/* Close */}
              <button
                onClick={() => setLightbox(null)}
                className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors z-10"
              >
                <X className="w-7 h-7" />
              </button>

              {/* Counter */}
              <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
                {lightbox.index + 1} / {lightbox.photos.length}
              </span>

              {/* Prev */}
              {lightbox.photos.length > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); setLightbox(l => l ? { ...l, index: (l.index - 1 + l.photos.length) % l.photos.length } : null); }}
                  className="absolute left-4 text-white/60 hover:text-white transition-colors z-10"
                >
                  <ChevronLeft className="w-9 h-9" />
                </button>
              )}

              {/* Image */}
              <motion.img
                key={lightbox.index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                src={lightbox.photos[lightbox.index]}
                alt=""
                onClick={e => e.stopPropagation()}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
              />

              {/* Next */}
              {lightbox.photos.length > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); setLightbox(l => l ? { ...l, index: (l.index + 1) % l.photos.length } : null); }}
                  className="absolute right-4 text-white/60 hover:text-white transition-colors z-10"
                >
                  <ChevronRight className="w-9 h-9" />
                </button>
              )}
            </motion.div>
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
