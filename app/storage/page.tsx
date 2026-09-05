'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArchiveBoxIcon, PlusIcon, MapPinIcon, UserCircleIcon, ChevronRightIcon,
  ArrowPathIcon, XMarkIcon, ExclamationCircleIcon,
} from '@/components/icons';
import PhotoAddButton from '@/components/PhotoAddButton';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useOverlayBack } from '@/lib/overlay-back';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { compressImage } from '@/lib/compress-image';
import { photoSrc, photoUrl, usePhotoToken } from '@/lib/photo-url';
import { ItemCountsInput, ItemCountsSummary } from '@/components/ItemCounts';
import { parseCounts, type ItemCounts } from '@/lib/item-counts';

const WORKFLOW_BADGE: Record<string, { color: string; label: string }> = {
  PENDING:   { color: 'bg-amber-100 text-amber-700', label: 'Pending' },
  READY:     { color: 'bg-green-100 text-green-700', label: 'Ready' },
  DELIVERED: { color: 'bg-blue-100 text-blue-700',   label: 'Delivered' },
};
const ST_CONDITIONS = ['Total Loss', 'Needs Cleaning', 'Storage Only'];
const ST_CONTENTS   = ['Boxes', 'Furniture', 'Both'];
const ST_JOBS       = ['Fire', 'Water', 'Mold', 'Moving', 'Storage'];
const stChip = (active: boolean) =>
  `px-3 py-1.5 text-sm rounded-lg border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`;
const emptyStorageForm = () => ({
  client_name: '', unit_name: '', condition: [] as string[], content_type: '', job_type: '',
  pack_date: new Date().toISOString().split('T')[0], packer: '', estado: 'PENDING',
  item_counts: {} as ItemCounts, access_code: '',
  address: '', city: '', state: '', capacity: '',
  status: 'AVAILABLE', notes: '', intake_date: new Date().toISOString().split('T')[0],
  photos: [] as (string | File)[],
});

export default function StoragePage() {
  const { canManage } = useAuth();
  const router = useRouter();

  const photoToken = usePhotoToken();
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  useOverlayBack(showCreate, () => setShowCreate(false));
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState(emptyStorageForm());

  const addCreatePhoto = (photo: string | File) => {
    setForm(f => ({ ...f, photos: [...f.photos, photo].slice(0, 4) }));
  };

  const handleCreatePhotoFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files).slice(0, 6)) {
      try { addCreatePhoto(await compressImage(file)); } catch (err: any) { setCreateError(err?.message || 'Photo too large'); }
    }
  };

  const fetchUnits = async () => {
    setLoadError(null);
    try {
      const data = await api.get('/api/storage');
      setUnits(Array.isArray(data) ? data : []);
    } catch { setLoadError('Failed to load storage units. Try again.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUnits(); }, []);

  const createUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.unit_name.trim()) { setCreateError('Unit name is required'); return; }
    setSaving(true);
    setCreateError('');
    try {
      const created = await api.post('/api/storage', form);
      setShowCreate(false);
      setForm(emptyStorageForm());
      router.push(`/storage/${created.id}`);
    } catch (e: any) {
      setCreateError(e?.message || 'Failed to create storage unit');
    } finally { setSaving(false); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 px-4 pb-8 md:px-8 md:pb-8 topbar-offset">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Storage</h1>
          </div>
          {canManage && (
            <button
              onClick={() => { setShowCreate(s => !s); setCreateError(''); }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-950 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors"
            >
              <PlusIcon className="w-4 h-4" /><span className="hidden sm:inline"> New Storage Unit</span><span className="sm:hidden"> New</span>
            </button>
          )}
        </div>

        {/* Inline create form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">New Storage Unit</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-4 h-4" /></button>
              </div>
              <form onSubmit={createUnit} className="space-y-4">
                {/* Client Name */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Client Name</label>
                  <input type="text" placeholder="Client name" value={form.client_name} autoFocus
                    onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {/* Unit Name */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Unit Name <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="e.g. Unit A-12, Storage Room 3..." value={form.unit_name}
                    onChange={e => setForm(f => ({ ...f, unit_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {/* Condition */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Condition</label>
                  <div className="flex flex-wrap gap-2">
                    {ST_CONDITIONS.map(c => {
                      const active = form.condition.includes(c);
                      return (
                        <button key={c} type="button" className={stChip(active)}
                          onClick={() => setForm(f => ({ ...f, condition: active ? f.condition.filter(x => x !== c) : [...f.condition, c] }))}>{c}</button>
                      );
                    })}
                  </div>
                </div>
                {/* Contents */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Contents</label>
                  <div className="flex flex-wrap gap-2">
                    {ST_CONTENTS.map(c => (
                      <button key={c} type="button" className={stChip(form.content_type === c)}
                        onClick={() => setForm(f => ({ ...f, content_type: c }))}>{c}</button>
                    ))}
                  </div>
                </div>
                {/* Job Type */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Job Type</label>
                  <div className="flex flex-wrap gap-2">
                    {ST_JOBS.map(c => (
                      <button key={c} type="button" className={stChip(form.job_type === c)}
                        onClick={() => setForm(f => ({ ...f, job_type: c }))}>{c}</button>
                    ))}
                  </div>
                </div>
                {/* Pack Date + Packer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Pack Date</label>
                    <input type="date" value={form.pack_date}
                      onChange={e => setForm(f => ({ ...f, pack_date: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Packer</label>
                    <input type="text" placeholder="Who packed this?" value={form.packer}
                      onChange={e => setForm(f => ({ ...f, packer: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                {/* Item counts */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Inventory count</label>
                  <ItemCountsInput value={form.item_counts} onChange={ic => setForm(f => ({ ...f, item_counts: ic }))} />
                </div>
                {/* Access Code — always visible */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Access Code</label>
                  <input type="text" placeholder="Gate or door code" value={form.access_code}
                    onChange={e => setForm(f => ({ ...f, access_code: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {/* Location, capacity, intake */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Address</label>
                    <input type="text" placeholder="Street address" value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">City</label>
                    <input type="text" placeholder="City" value={form.city}
                      onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">State</label>
                    <input type="text" placeholder="State" value={form.state}
                      onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Capacity</label>
                    <input type="text" placeholder="e.g. 200 sq ft, 50 units" value={form.capacity}
                      onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Intake Date</label>
                    <input type="date" value={form.intake_date}
                      onChange={e => setForm(f => ({ ...f, intake_date: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                {/* Photo upload */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Photos (optional, max 4)</label>
                  <div className="flex flex-wrap gap-2">
                    {form.photos.map((photo, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                        <img src={photoSrc(photo, { id: '' }, 'grid', photoToken)} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))}
                          className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-black/70"
                        >&times;</button>
                      </div>
                    ))}
                    {form.photos.length < 4 && (
                      <div className="w-full mt-2">
                        <PhotoAddButton onFiles={handleCreatePhotoFiles} onPhotoNative={addCreatePhoto} remaining={4 - form.photos.length} />
                      </div>
                    )}
                  </div>
                </div>

                {createError && (
                  <div className="md:col-span-2 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />{createError}
                  </div>
                )}
                <div className="md:col-span-2 flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
                  <button type="submit" disabled={saving || !form.unit_name.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-gray-950 text-white text-sm font-medium rounded-full hover:bg-gray-800 disabled:opacity-50 transition-colors">
                    {saving && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                    Create & Open
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {loadError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
            <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{loadError}</span>
            <button onClick={() => fetchUnits()} className="text-xs font-medium text-red-600 hover:text-red-800 underline">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : units.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ArchiveBoxIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No storage units yet</p>
            {canManage && <p className="text-sm mt-1">Create your first storage unit to get started</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {units.map((unit, i) => {
              const sc = WORKFLOW_BADGE[unit.estado] || WORKFLOW_BADGE.PENDING;
              const hasPhoto = unit.photos?.length > 0;
              return (
                <motion.div
                  key={unit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <Link href={`/storage/${unit.id}`}>
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-pointer group">
                      {hasPhoto ? (
                        <div className="h-36 overflow-hidden">
                          <img src={photoUrl(unit.photo_ref, unit.photos[0], 'grid', photoToken)} alt={unit.unit_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      ) : (
                        <div className="h-36 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                          <ArchiveBoxIcon className="w-10 h-10 text-blue-200" />
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h2 className="font-semibold text-gray-900 truncate">{unit.unit_name}</h2>
                          <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${sc.color}`}>{sc.label}</span>
                        </div>
                        {(unit.address || unit.city) && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                            <MapPinIcon className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{[unit.address, unit.city, unit.state].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                        {unit.client_name && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                            <UserCircleIcon className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{unit.client_name}</span>
                          </div>
                        )}
                        {unit.capacity && (
                          <p className="text-xs text-gray-400">Capacity: {unit.capacity}</p>
                        )}
                        <div className="mt-1"><ItemCountsSummary value={parseCounts(unit.item_counts)} compact /></div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                          <span className="text-xs text-blue-600 font-medium">View details</span>
                          <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
