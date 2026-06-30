'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, MapPin, User, Camera, Pencil, Trash2, X, ChevronLeft, AlertCircle, Check, Loader2, Grid3X3, Settings2 } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { compressImage } from '@/lib/compress-image';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  AVAILABLE:   { color: 'bg-green-100 text-green-700',  label: 'Available' },
  OCCUPIED:    { color: 'bg-amber-100 text-amber-700',  label: 'Occupied' },
  MAINTENANCE: { color: 'bg-red-100 text-red-600',      label: 'Maintenance' },
};
const STATUSES = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];

const MAX_PHOTOS = 4;

async function geocode(address: string, city: string, state: string): Promise<string | null> {
  const q = [address, city, state].filter(Boolean).join(', ');
  if (!q) return null;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`);
    const data = await res.json();
    if (data[0]) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.012},${lat - 0.008},${lon + 0.012},${lat + 0.008}&layer=mapnik&marker=${lat},${lon}`;
    }
  } catch {}
  return null;
}

export default function StorageDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const fileRef = useRef<HTMLInputElement>(null);

  const [unit, setUnit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);

  // Position map
  const [slots, setSlots] = useState<Record<string, { client: string; notes: string; occupied: boolean }>>({});
  const [gridRows, setGridRows] = useState(4);
  const [gridCols, setGridCols] = useState(6);
  const [slotModal, setSlotModal] = useState<string | null>(null); // key = "R1C2"
  const [slotForm, setSlotForm] = useState({ client: '', notes: '' });
  const [slotSaving, setSlotSaving] = useState(false);
  const [showGridConfig, setShowGridConfig] = useState(false);
  const [gridConfigForm, setGridConfigForm] = useState({ rows: 4, cols: 6 });
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    api.get(`/api/storage/${id}`)
      .then(data => {
        setUnit(data);
        setForm(data);
        setSlots(data.slots || {});
        setGridRows(data.grid_rows || 4);
        setGridCols(data.grid_cols || 6);
        setGridConfigForm({ rows: data.grid_rows || 4, cols: data.grid_cols || 6 });
        if (data.address || data.city) {
          geocode(data.address, data.city, data.state).then(setMapUrl);
        }
      })
      .catch(() => router.replace('/storage'))
      .finally(() => setLoading(false));
  }, [id]);

  const startEdit = () => {
    setForm({ ...unit });
    setEditMode(true);
    setError('');
    setSuccess('');
  };

  const cancelEdit = () => {
    setEditMode(false);
    setError('');
  };

  const save = async () => {
    if (!form.unit_name?.trim()) { setError('Unit name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const updated = await api.put(`/api/storage/${id}`, form);
      setUnit(updated);
      setEditMode(false);
      setSuccess('Saved');
      setTimeout(() => setSuccess(''), 2500);
      // Re-geocode if address changed
      if (updated.address !== unit.address || updated.city !== unit.city) {
        geocode(updated.address, updated.city, updated.state).then(setMapUrl);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const addPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError('');
    const files = Array.from(e.target.files || []);
    const current = form.photos?.length || 0;
    if (current + files.length > MAX_PHOTOS) {
      setPhotoError(`Max ${MAX_PHOTOS} photos`); return;
    }
    try {
      const b64s = await Promise.all(files.map(compressImage));
      setForm((f: any) => ({ ...f, photos: [...(f.photos || []), ...b64s] }));
    } catch (e: any) { setPhotoError(e.message); }
    e.target.value = '';
  };

  const removePhoto = (idx: number) => {
    setForm((f: any) => ({ ...f, photos: f.photos.filter((_: any, i: number) => i !== idx) }));
  };

  const openSlot = (key: string) => {
    const existing = slots[key];
    setSlotForm({ client: existing?.client || '', notes: existing?.notes || '' });
    setSlotModal(key);
  };

  const saveSlot = async () => {
    if (!slotModal) return;
    setSlotSaving(true);
    const updated = {
      ...slots,
      [slotModal]: {
        client: slotForm.client.trim(),
        notes: slotForm.notes.trim(),
        occupied: !!(slotForm.client.trim() || slotForm.notes.trim()),
      },
    };
    // Remove empty slots to keep the JSON lean
    if (!updated[slotModal].occupied) delete updated[slotModal];
    try {
      await api.put(`/api/storage/${id}`, { ...unit, slots: updated, grid_rows: gridRows, grid_cols: gridCols });
      setSlots(updated);
      setUnit((u: any) => ({ ...u, slots: updated }));
    } catch { /* ignore */ }
    setSlotSaving(false);
    setSlotModal(null);
  };

  const saveGridConfig = async () => {
    const rows = Math.min(10, Math.max(1, gridConfigForm.rows));
    const cols = Math.min(12, Math.max(1, gridConfigForm.cols));
    try {
      await api.put(`/api/storage/${id}`, { ...unit, slots, grid_rows: rows, grid_cols: cols });
      setGridRows(rows);
      setGridCols(cols);
      setUnit((u: any) => ({ ...u, grid_rows: rows, grid_cols: cols }));
    } catch { /* ignore */ }
    setShowGridConfig(false);
  };

  const deleteUnit = () => {
    setConfirmModal({
      message: 'Delete this storage unit? This cannot be undone.',
      onConfirm: async () => {
        try {
          await api.delete(`/api/storage/${id}`);
          router.replace('/storage');
        } catch (e: any) { setError(e?.message || 'Failed to delete'); }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="md:ml-64 flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  const displayData = editMode ? form : unit;
  const sc = STATUS_CONFIG[displayData?.status] || STATUS_CONFIG.AVAILABLE;
  const photos: string[] = displayData?.photos || [];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 pb-28 md:pb-8 max-w-3xl">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/storage" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{unit?.unit_name}</h1>
            <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mt-1 ${sc.color}`}>{sc.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {success && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-green-600 text-sm font-medium">
                <Check className="w-4 h-4" /> Saved
              </motion.span>
            )}
            {isOwner && !editMode && (
              <button onClick={startEdit}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:text-blue-600 transition-colors">
                <Pencil className="w-4 h-4" /> Edit
              </button>
            )}
          </div>
        </div>

        {/* Photo gallery */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Photos {photos.length > 0 && `(${photos.length}/${MAX_PHOTOS})`}</h2>
          {photos.length === 0 && !editMode ? (
            <div className="h-28 flex items-center justify-center bg-gray-50 rounded-xl text-gray-300">
              <Camera className="w-8 h-8" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((src, i) => (
                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden cursor-pointer" onClick={() => setLightbox(i)}>
                  <img src={src} alt={`photo-${i}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  {editMode && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {editMode && photos.length < MAX_PHOTOS && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 hover:border-blue-400 hover:text-blue-400 transition-colors"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs mt-1">Add</span>
                </button>
              )}
            </div>
          )}
          {photoError && <p className="text-xs text-red-500 mt-2">{photoError}</p>}
          <input ref={fileRef} type="file" accept="image/*,.heic,.heif,.webp,.avif,.pdf" multiple className="hidden" onChange={addPhotos} />
        </motion.div>

        {/* Position Map */}
        {!editMode && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-gray-700">Position Map</h2>
                <span className="text-xs text-gray-400">{gridRows}×{gridCols}</span>
              </div>
              {isOwner && (
                <button onClick={() => { setGridConfigForm({ rows: gridRows, cols: gridCols }); setShowGridConfig(s => !s); }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50">
                  <Settings2 className="w-3.5 h-3.5" /> Configure
                </button>
              )}
            </div>

            {/* Grid config panel */}
            <AnimatePresence>
              {showGridConfig && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-4">
                  <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-10">Rows</label>
                      <input type="number" min={1} max={10} value={gridConfigForm.rows}
                        onChange={e => setGridConfigForm(f => ({ ...f, rows: parseInt(e.target.value) || 1 }))}
                        className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-10">Cols</label>
                      <input type="number" min={1} max={12} value={gridConfigForm.cols}
                        onChange={e => setGridConfigForm(f => ({ ...f, cols: parseInt(e.target.value) || 1 }))}
                        className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <button onClick={saveGridConfig}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
                      Apply
                    </button>
                    <button onClick={() => setShowGridConfig(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-3 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200 inline-block" /> Empty</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Occupied</span>
            </div>

            {/* Grid */}
            <div className="overflow-x-auto">
              <div className="inline-grid gap-1.5 min-w-max" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
                {Array.from({ length: gridRows }).map((_, ri) =>
                  Array.from({ length: gridCols }).map((_, ci) => {
                    const key = `R${ri + 1}C${ci + 1}`;
                    const slot = slots[key];
                    return (
                      <button
                        key={key}
                        onClick={() => openSlot(key)}
                        title={slot?.occupied ? `${slot.client || 'Occupied'}${slot.notes ? ` — ${slot.notes}` : ''}` : key}
                        className={`w-10 h-10 rounded-lg text-[10px] font-medium transition-all flex flex-col items-center justify-center gap-0 border
                          ${slot?.occupied
                            ? 'bg-blue-500 border-blue-400 text-white hover:bg-blue-600'
                            : 'bg-gray-50 border-gray-200 text-gray-300 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-500'
                          }`}
                      >
                        <span>{String.fromCharCode(65 + ri)}{ci + 1}</span>
                        {slot?.occupied && slot.client && (
                          <span className="text-[7px] leading-none text-blue-100 truncate w-8 text-center">{slot.client.split(' ')[0]}</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <p className="text-xs text-gray-300 mt-3">
              {Object.values(slots).filter(s => s.occupied).length} / {gridRows * gridCols} slots occupied
            </p>
          </motion.div>
        )}

        {/* Slot modal */}
        <AnimatePresence>
          {slotModal && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSlotModal(null)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Slot {slotModal}</h3>
                  <button onClick={() => setSlotModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Client / Label</label>
                    <input autoFocus type="text" placeholder="e.g. John Smith" value={slotForm.client}
                      onChange={e => setSlotForm(f => ({ ...f, client: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Notes</label>
                    <input type="text" placeholder="e.g. Boxes, Furniture..." value={slotForm.notes}
                      onChange={e => setSlotForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => { setSlotForm({ client: '', notes: '' }); saveSlot(); }}
                    className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                    Clear
                  </button>
                  <button onClick={saveSlot} disabled={slotSaving}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {slotSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Map */}
        {mapUrl && !editMode && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-5">
            <div className="px-5 pt-4 pb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-700">Location</h2>
            </div>
            <iframe
              src={mapUrl}
              className="w-full h-56 border-0"
              title="Storage location map"
              loading="lazy"
            />
          </motion.div>
        )}

        {/* Details / Edit form */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Details</h2>

          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Unit Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.unit_name || ''} onChange={e => setForm((f: any) => ({ ...f, unit_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Address</label>
                  <input type="text" placeholder="Street address" value={form.address || ''} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">City</label>
                  <input type="text" placeholder="City" value={form.city || ''} onChange={e => setForm((f: any) => ({ ...f, city: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">State</label>
                  <input type="text" placeholder="State" value={form.state || ''} onChange={e => setForm((f: any) => ({ ...f, state: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Client</label>
                  <input type="text" placeholder="Assigned client (optional)" value={form.client_name || ''} onChange={e => setForm((f: any) => ({ ...f, client_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Capacity</label>
                  <input type="text" placeholder="e.g. 200 sq ft" value={form.capacity || ''} onChange={e => setForm((f: any) => ({ ...f, capacity: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Access Code</label>
                  <input type="text" placeholder="Gate or door code" value={form.access_code || ''} onChange={e => setForm((f: any) => ({ ...f, access_code: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Status</label>
                  <div className="flex gap-2">
                    {STATUSES.map(s => (
                      <button key={s} type="button"
                        onClick={() => setForm((f: any) => ({ ...f, status: s }))}
                        className={`flex-1 py-2 text-xs rounded-xl border transition-colors ${form.status === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                        {STATUS_CONFIG[s].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <textarea rows={3} placeholder="Additional notes..." value={form.notes || ''} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Unit Name',    value: unit?.unit_name },
                { label: 'Address',      value: [unit?.address, unit?.city, unit?.state].filter(Boolean).join(', ') || '—' },
                { label: 'Client',       value: unit?.client_name || '—' },
                { label: 'Capacity',     value: unit?.capacity || '—' },
                { label: 'Access Code',  value: unit?.access_code || '—' },
                { label: 'Notes',        value: unit?.notes || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm gap-4">
                  <span className="text-gray-400 flex-shrink-0">{label}</span>
                  <span className="text-gray-900 font-medium text-right">{value}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Errors */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        {editMode ? (
          <div className="flex gap-3">
            <button onClick={cancelEdit} className="px-5 py-2.5 text-gray-400 hover:text-gray-600 text-sm transition-colors">Cancel</button>
            <button onClick={save} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        ) : isOwner && (
          <button onClick={deleteUnit}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors">
            <Trash2 className="w-4 h-4" /> Delete Storage Unit
          </button>
        )}

        {/* Lightbox */}
        <AnimatePresence>
          {lightbox !== null && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                <img src={photos[lightbox]} alt="Photo" className="w-full rounded-2xl object-contain max-h-[80vh]" />
                <button onClick={() => setLightbox(null)} className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
                  <X className="w-4 h-4" />
                </button>
                {photos.length > 1 && (
                  <>
                    <button onClick={() => setLightbox(i => i !== null ? (i - 1 + photos.length) % photos.length : 0)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
                      ‹
                    </button>
                    <button onClick={() => setLightbox(i => i !== null ? (i + 1) % photos.length : 0)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
                      ›
                    </button>
                  </>
                )}
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
