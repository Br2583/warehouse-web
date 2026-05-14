'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

export default function StatsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/stats/global').then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  const renderBar = (label: string, value: number, max: number, color: string) => (
    <div key={label} className="flex items-center gap-4">
      <span className="text-sm text-gray-500 w-32 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-sm font-semibold text-gray-900 w-8 text-right">{value}</span>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
          <p className="text-gray-500 text-sm mt-1">Inventory analytics across all warehouses</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {/* Summary */}
            <div className="col-span-2 grid grid-cols-3 gap-4">
              {[
                { label: 'Total Volts', value: stats?.total_boxes ?? 0, color: 'bg-blue-50 text-blue-600' },
                { label: 'Total Capacity', value: stats?.total_capacity ?? 0, color: 'bg-gray-50 text-gray-600' },
                { label: 'Available Slots', value: stats?.available_spaces ?? 0, color: 'bg-green-50 text-green-600' },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl p-5 border border-gray-100 ${s.color}`}>
                  <p className="text-3xl font-bold">{s.value}</p>
                  <p className="text-sm mt-1 opacity-70">{s.label}</p>
                </div>
              ))}
            </div>

            {/* By Status */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-5">By Status</h2>
              <div className="space-y-4">
                {Object.entries(stats?.statuses || {}).map(([k, v]: any) =>
                  renderBar(k, v, stats?.total_boxes, k === 'PENDING' ? 'bg-amber-400' : k === 'READY' ? 'bg-green-400' : 'bg-blue-500')
                )}
              </div>
            </div>

            {/* By Job Type */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-5">By Job Type</h2>
              <div className="space-y-4">
                {Object.entries(stats?.job_types || {}).map(([k, v]: any) =>
                  renderBar(k, v, stats?.total_boxes, 'bg-purple-400')
                )}
              </div>
            </div>

            {/* By Warehouse */}
            <div className="col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-5">By Warehouse</h2>
              <div className="space-y-4">
                {Object.entries(stats?.by_warehouse || {}).map(([k, v]: any) =>
                  renderBar(`Warehouse ${k}`, v, stats?.total_boxes, 'bg-blue-500')
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
