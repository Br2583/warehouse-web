'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, RotateCcw, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

export default function DeletedPage() {
  const [deleted, setDeleted] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeleted = () =>
    api.get('/api/deleted-boxes').then(setDeleted).catch(console.error).finally(() => setLoading(false));

  useEffect(() => { fetchDeleted(); }, []);

  const restore = async (id: string) => {
    try {
      await api.post(`/api/deleted-boxes/${id}/restore`, {});
      fetchDeleted();
    } catch (e: any) {
      alert(e.message || 'Could not restore volt');
    }
  };

  const permDelete = async (id: string) => {
    if (!confirm('Permanently delete this volt?')) return;
    try {
      await api.delete(`/api/deleted-boxes/${id}`);
      fetchDeleted();
    } catch (e: any) {
      alert(e.message || 'Could not delete volt');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Deleted Volts</h1>
          <p className="text-gray-500 text-sm mt-1">{deleted.length} archived volts</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : deleted.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No deleted volts</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Position</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Client</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Job Type</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Deleted At</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deleted.map((box, i) => (
                  <motion.tr
                    key={box.deleted_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{box.position}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{box.client_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{box.job_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{new Date(box.deleted_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => restore(box.deleted_id)}
                          className="flex items-center gap-1 text-xs text-green-600 hover:bg-green-50 px-2.5 py-1.5 rounded-lg transition-colors">
                          <RotateCcw className="w-3 h-3" /> Restore
                        </button>
                        <button onClick={() => permDelete(box.deleted_id)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors">
                          <X className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
