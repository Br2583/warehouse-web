'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BuildingOffice2Icon, ArchiveBoxIcon, PlusIcon, ChevronRightIcon, ArrowPathIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import Sidebar from '@/components/Sidebar';
import { pb } from '@/lib/pb';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import ConfirmModal from '@/components/ConfirmModal';

interface Warehouse {
  id: string;
  name: string;
  address?: string;
  color?: string;
  vault_count: number;
}


export default function WarehousesPage() {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const fetchWarehouses = async () => {
    const cid = user?.company_id;
    if (!cid) { setLoading(false); return; }
    try {
      const [whs, vaults] = await Promise.all([
        pb.collection('warehouses').getFullList({ filter: `company_id="${cid}"` }),
        pb.collection('vaults').getFullList({ filter: `company_id="${cid}"`, fields: 'id,warehouse_id' }),
      ]);
      const counts: Record<string, number> = {};
      for (const v of vaults) counts[v.warehouse_id] = (counts[v.warehouse_id] || 0) + 1;
      setWarehouses(whs.map(w => ({
        id:         w.id,
        name:       w['name'] as string,
        address:    w['address'] as string | undefined,
        color:      w['color'] as string | undefined,
        vault_count: counts[w.id] || 0,
      })));
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { if (user?.company_id) fetchWarehouses(); }, [user?.company_id]);

  const createWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!newName.trim()) return;
    if (!user?.company_id) { setCreateError('No company linked to your account. Please contact support.'); return; }
    setCreating(true);
    try {
      await pb.collection('warehouses').create({
        company_id: user.company_id,
        name:       newName.trim(),
        rows:       10,
        cols:       8,
      });
      setNewName('');
      setShowCreate(false);
      await fetchWarehouses();
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create warehouse. Please try again.');
    } finally { setCreating(false); }
  };

  const deleteWarehouse = (id: string, name: string) => {
    setConfirmModal({
      message: `Delete "${name}"? All vaults in this warehouse will also be deleted. This cannot be undone.`,
      onConfirm: async () => {
        try {
          const vaults = await pb.collection('vaults').getFullList({ filter: `warehouse_id="${id}"`, fields: 'id' });
          await Promise.all(vaults.map((v: any) => pb.collection('vaults').delete(v.id)));
          await pb.collection('warehouses').delete(id);
          await fetchWarehouses();
        } catch {}
      },
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 p-4 md:p-8 pb-28 md:pb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
            <p className="text-gray-500 text-sm mt-1">Select a warehouse to manage its inventory</p>
          </div>
          {user?.role === 'owner' && (
            <button
             
              onClick={() => setShowCreate(s => !s)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" /> New Warehouse
            </button>
          )}
        </div>

        {showCreate && (
          <motion.form
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={createWarehouse}
            className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 flex gap-3"
          >
            <input
              type="text"
              placeholder="Warehouse name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              autoFocus
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {creating && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
              Create
            </button>
            <button type="button" onClick={() => { setShowCreate(false); setCreateError(''); }} className="px-4 py-2.5 text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
          </motion.form>
        )}
        {createError && (
          <p className="text-red-500 text-sm mb-4 px-1">{createError}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : warehouses.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BuildingOffice2Icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No warehouses yet</p>
            <p className="text-sm mt-1">Create your first warehouse to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {warehouses.map((wh, i) => (
              <motion.div
                key={wh.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="relative group">
                  {user?.role === 'owner' && (
                    <button
                      onClick={e => { e.preventDefault(); deleteWarehouse(wh.id, wh.name); }}
                      className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 md:opacity-0 md:group-hover:opacity-100 transition-all"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                  <Link href={`/warehouses/${wh.id}`}>
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-all cursor-pointer">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <BuildingOffice2Icon className="w-6 h-6 text-blue-600" />
                        </div>
                        <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">{wh.name}</h2>
                      {wh.address && <p className="text-xs text-gray-400 mt-0.5">{wh.address}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <ArchiveBoxIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-2xl font-bold text-gray-900">{wh.vault_count}</span>
                        <span className="text-sm text-gray-400">vaults stored</span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-50">
                        <span className="text-xs text-blue-600 font-medium">View inventory â†’</span>
                      </div>
                    </div>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
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
