'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Package, Plus, ChevronRight } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import Link from 'next/link';

const WAREHOUSES = [
  { id: 1, name: 'Warehouse 1' },
  { id: 2, name: 'Warehouse 2' },
  { id: 3, name: 'Warehouse 3' },
];

export default function WarehousesPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get('/api/stats/global').then(setStats).catch(console.error);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
          <p className="text-gray-500 text-sm mt-1">Select a warehouse to manage its inventory</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {WAREHOUSES.map((wh, i) => {
            const count = stats?.by_warehouse?.[wh.id] ?? 0;
            return (
              <motion.div
                key={wh.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/warehouses/${wh.id}`}>
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">{wh.name}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="text-2xl font-bold text-gray-900">{count}</span>
                      <span className="text-sm text-gray-400">volts stored</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-50">
                      <span className="text-xs text-blue-600 font-medium">View inventory →</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
