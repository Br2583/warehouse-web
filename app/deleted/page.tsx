'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrashIcon, ArrowPathIcon, XMarkIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { pb } from '@/lib/pb';
import { useAuth } from '@/lib/auth-context';
import ConfirmModal from '@/components/ConfirmModal';
import { parseDateOpt } from '@/lib/utils';

export default function DeletedPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const [deleted, setDeleted] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [whNames, setWhNames] = useState<Record<string, string>>({});
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const fetchDeleted = () =>
    api.get('/api/deleted-boxes')
      .then(setDeleted)
      .catch(() => setError('Failed to load deleted vaults. Try again.'))
      .finally(() => setLoading(false));

  useEffect(() => { fetchDeleted(); }, []);

  useEffect(() => {
    if (!user?.company_id) return;
    pb.collection('warehouses')
      .getFullList({ filter: `company_id="${user.company_id}"`, fields: 'id,name' })
      .then(whs => {
        const map: Record<string, string> = {};
        whs.forEach(w => { map[w.id] = w['name'] as string; });
        setWhNames(map);
      })
      .catch(() => {});
  }, [user?.company_id]);

  const restore = async (id: string) => {
    try {
      await api.post(`/api/deleted-boxes/${id}/restore`, {});
      fetchDeleted();
    } catch (e: any) {
      setError(e.message || 'Could not restore vault');
    }
  };

  const permDelete = (id: string) => {
    setConfirmModal({
      message: 'Permanently delete this vault? This cannot be undone.',
      onConfirm: async () => {
        try {
          await api.delete(`/api/deleted-boxes/${id}`);
          fetchDeleted();
        } catch (e: any) {
          setError(e.message || 'Could not delete vault');
        }
      },
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 p-4 md:p-8 pb-28 md:pb-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Deleted Vaults</h1>
          <p className="text-gray-500 text-sm mt-1">{deleted.length} archived vaults</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl mb-4"
            >
              <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><XMarkIcon className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : deleted.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No deleted vaults</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Position</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Client</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Warehouse</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Deleted At</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deleted.map((box, i) => (
                  <motion.tr
                    key={box.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{box.position}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{box.client_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{whNames[box.warehouse_id] || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{box.deleted_at ? parseDateOpt(box.deleted_at)?.toLocaleDateString() ?? '-' : '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {isOwner && (
                          <button onClick={() => restore(box.id)}
                            className="flex items-center gap-1 text-xs text-green-600 hover:bg-green-50 px-2.5 py-1.5 rounded-lg transition-colors">
                            <ArrowPathIcon className="w-3 h-3" /> Restore
                          </button>
                        )}
                        {isOwner && (
                          <button onClick={() => permDelete(box.id)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors">
                            <TrashIcon className="w-3 h-3" /> Permanently Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
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
