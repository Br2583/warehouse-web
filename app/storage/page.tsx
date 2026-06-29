'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArchiveBoxIcon, PlusIcon, MapPinIcon, UserCircleIcon, ChevronRightIcon,
  ArrowPathIcon, XMarkIcon, ExclamationCircleIcon, CameraIcon,
} from '@heroicons/react/24/outline';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { compressImage } from '@/lib/compress-image';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  AVAILABLE:   { color: 'bg-green-100 text-green-700',  label: 'Available' },
  OCCUPIED:    { color: 'bg-amber-100 text-amber-700',  label: 'Occupied' },
  MAINTENANCE: { color: 'bg-red-100 text-red-600',      label: 'Maintenance' },
};

export default function StoragePage() {
  const { user } = useAuth();
  const router = useRouter();
  const isOwner = user?.role === 'owner';

  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState({ unit_name: '', address: '', city: '', state: '', client_name: '', capacity: '', access_code: '', status: 'AVAILABLE', notes: '', photos: [] as string[] });

  const handleCreatePhotos = async (files: FileList | null) => {
    if (!files) return;
    setCreateError('');
    try {
      const compressed = await Promise.all(Array.from(files).slice(0, 4).map(f => compressImage(f)));
      setForm(f => ({ ...f, photos: [...f.photos, ...compressed].slice(0, 4) }));
    } catch (e: any) { setCreateError(e?.message || 'Photo too large'); }
  };

  const fetchUnits = async () => {
    try {
      const data = await api.get('/api/storage');
      setUnits(Array.isArray(data) ? data : []);
    } catch { setUnits([]); }
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
      setForm({ unit_name: '', address: '', city: '', state: '', client_name: '', capacity: '', access_code: '', status: 'AVAILABLE', notes: '', photos: [] });
      router.push(`/storage/${created.id}`);
    } catch (e: any) {
      setCreateError(e?.message || 'Failed to create storage unit');
    } finally { setSaving(false); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 pb-20 md:pb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Storage Units</h1>
            <p className="text-gray-500 text-sm mt-1">External storage locations</p>
          </div>
          {isOwner && (
            <button
              onClick={() => { setShowCreate(s => !s); setCreateError(''); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" /> New Storage Unit
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
              <form onSubmit={createUnit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Unit Name <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="e.g. Unit A-12, Storage Room 3..." value={form.unit_name}
                    onChange={e => setForm(f => ({ ...f, unit_name: e.target.value }))} autoFocus
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
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
                  <label className="block text-xs text-gray-500 mb-1">Client (optional)</label>
                  <input type="text" placeholder="Assigned client" value={form.client_name}
                    onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Capacity (optional)</label>
                  <input type="text" placeholder="e.g. 200 sq ft, 50 units" value={form.capacity}
                    onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Access Code (optional)</label>
                  <input type="text" placeholder="Gate or door code" value={form.access_code}
                    onChange={e => setForm(f => ({ ...f, access_code: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {/* Photo upload */}
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-500 mb-2">Photos (optional, max 4)</label>
                  <div className="flex flex-wrap gap-2">
                    {form.photos.map((src, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))}
                          className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-black/70"
                        >×</button>
                      </div>
                    ))}
                    {form.photos.length < 4 && (
                      <label className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors flex-shrink-0">
                        <CameraIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-[10px] text-gray-400 mt-0.5">Add</span>
                        <input type="file" accept="image/*" multiple className="hidden"
                          onChange={e => handleCreatePhotos(e.target.files)} />
                      </label>
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
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {saving && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                    Create & Open
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : units.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ArchiveBoxIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No storage units yet</p>
            {isOwner && <p className="text-sm mt-1">Create your first storage unit to get started</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {units.map((unit, i) => {
              const sc = STATUS_CONFIG[unit.status] || STATUS_CONFIG.AVAILABLE;
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
                          <img src={unit.photos[0]} alt={unit.unit_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
