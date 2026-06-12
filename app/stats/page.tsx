'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Search, X, Building2, ChevronRight } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

const JOB_COLORS: Record<string, string> = {
  Fire:    'bg-red-400',
  Water:   'bg-blue-400',
  Moving:  'bg-purple-400',
  Storage: 'bg-gray-400',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-amber-400',
  READY:     'bg-green-400',
  DELIVERED: 'bg-blue-500',
};

const STATUS_TEXT: Record<string, string> = {
  PENDING:   'text-amber-700 bg-amber-100',
  READY:     'text-green-700 bg-green-100',
  DELIVERED: 'text-blue-700 bg-blue-100',
};

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<any>(null);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'count' | 'name'>('count');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [globalStats, wh1, wh2, wh3] = await Promise.allSettled([
          api.get('/api/stats/global'),
          api.get('/api/boxes?warehouse_id=1'),
          api.get('/api/boxes?warehouse_id=2'),
          api.get('/api/boxes?warehouse_id=3'),
        ]);

        if (globalStats.status === 'fulfilled') setStats(globalStats.value);

        const allBoxes = [wh1, wh2, wh3].flatMap(r => {
          if (r.status !== 'fulfilled') return [];
          const d = r.value;
          return Array.isArray(d) ? d : d?.boxes || [];
        });
        setBoxes(allBoxes);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Group by client
  const clientStats = useMemo(() => {
    const map: Record<string, { total: number; byJob: Record<string, number>; byStatus: Record<string, number> }> = {};
    boxes.forEach(box => {
      const name = (box.client_name || 'Unknown').trim();
      if (!map[name]) map[name] = { total: 0, byJob: {}, byStatus: {} };
      map[name].total++;
      const job = box.job_type || 'Unknown';
      map[name].byJob[job] = (map[name].byJob[job] || 0) + 1;
      const st = box.estado || box.status || 'PENDING';
      map[name].byStatus[st] = (map[name].byStatus[st] || 0) + 1;
    });
    return map;
  }, [boxes]);

  const clientList = useMemo(() => {
    let list = Object.entries(clientStats).map(([name, data]) => ({ name, ...data }));
    if (search) list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    return list.sort((a, b) => sortBy === 'count' ? b.total - a.total : a.name.localeCompare(b.name));
  }, [clientStats, search, sortBy]);

  const clientVolts = useMemo(() =>
    selectedClient ? boxes.filter(b => (b.client_name || 'Unknown').trim() === selectedClient) : [],
  [selectedClient, boxes]);

  const maxClient = clientList[0]?.total || 1;
  const total = stats?.total_boxes || boxes.length || 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 pb-20 md:pb-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
          <p className="text-gray-500 text-sm mt-1">Inventory analytics & client comparison</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Vaults',      value: total,                          color: 'bg-blue-50 text-blue-600' },
                { label: 'Pending',          value: stats?.statuses?.PENDING ?? 0,  color: 'bg-amber-50 text-amber-600' },
                { label: 'Ready',            value: stats?.statuses?.READY ?? 0,    color: 'bg-green-50 text-green-600' },
                { label: 'Delivered',        value: stats?.statuses?.DELIVERED ?? 0,color: 'bg-purple-50 text-purple-600' },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl p-5 border border-gray-100 ${s.color}`}>
                  <p className="text-3xl font-bold">{s.value}</p>
                  <p className="text-sm mt-1 opacity-70">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Status + Job type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-5">By Status</h2>
                <div className="space-y-4">
                  {Object.entries(stats?.statuses || {}).map(([k, v]: any) => (
                    <div key={k} className="flex items-center gap-4">
                      <span className="text-sm text-gray-500 w-24 flex-shrink-0">{k}</span>
                      <Bar value={v} max={total} color={STATUS_COLORS[k] || 'bg-gray-400'} />
                      <span className="text-sm font-semibold text-gray-900 w-8 text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-5">By Job Type</h2>
                <div className="space-y-4">
                  {Object.entries(stats?.job_types || {}).map(([k, v]: any) => (
                    <div key={k} className="flex items-center gap-4">
                      <span className="text-sm text-gray-500 w-24 flex-shrink-0">{k}</span>
                      <Bar value={v} max={total} color={JOB_COLORS[k] || 'bg-gray-400'} />
                      <span className="text-sm font-semibold text-gray-900 w-8 text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* By Warehouse */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-5">By Warehouse</h2>
              <div className="space-y-4">
                {Object.entries(stats?.by_warehouse || {}).map(([k, v]: any) => (
                  <div key={k} className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 w-24 flex-shrink-0">Warehouse {k}</span>
                    <Bar value={v} max={total} color="bg-blue-500" />
                    <span className="text-sm font-semibold text-gray-900 w-8 text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CLIENT COMPARISON */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-semibold text-gray-900">Clients</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{clientList.length} clients · {boxes.length} total vaults</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Sort */}
                  <div className="flex bg-gray-100 rounded-xl overflow-hidden text-xs">
                    <button onClick={() => setSortBy('count')}
                      className={`px-3 py-1.5 font-medium transition-colors ${sortBy === 'count' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>
                      Most vaults
                    </button>
                    <button onClick={() => setSortBy('name')}
                      className={`px-3 py-1.5 font-medium transition-colors ${sortBy === 'name' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>
                      A–Z
                    </button>
                  </div>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      placeholder="Search client..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
                    />
                  </div>
                </div>
              </div>

              {clientList.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">No clients found</p>
              ) : (
                <div className="space-y-3">
                  {clientList.map((client, i) => (
                    <motion.div
                      key={client.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelectedClient(client.name)}
                      className="border border-gray-100 rounded-xl p-4 hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-gray-900 truncate">{client.name}</p>
                            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                              <span className="text-sm font-bold text-gray-900">{client.total} vault{client.total !== 1 ? 's' : ''}</span>
                              <ChevronRight className="w-4 h-4 text-gray-300" />
                            </div>
                          </div>
                          <Bar value={client.total} max={maxClient} color="bg-blue-500" />
                          <div className="flex flex-wrap gap-2 mt-3">
                            {Object.entries(client.byJob).map(([job, count]) => (
                              <div key={job} className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${JOB_COLORS[job] || 'bg-gray-400'}`} />
                                <span className="text-xs text-gray-500">{job}: <span className="font-semibold text-gray-700">{count}</span></span>
                              </div>
                            ))}
                            {Object.entries(client.byStatus).map(([st, count]) => (
                              <span key={st} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_TEXT[st] || 'bg-gray-100 text-gray-600'}`}>
                                {st}: {count}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Client detail modal */}
      <AnimatePresence>
        {selectedClient && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setSelectedClient(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[85vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedClient}</h2>
                    <p className="text-sm text-gray-400">{clientVolts.length} vault{clientVolts.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary pills */}
              <div className="px-6 py-3 flex gap-2 flex-wrap border-b border-gray-50">
                {Object.entries(
                  clientVolts.reduce((acc: any, b) => {
                    const st = b.estado || b.status || 'PENDING';
                    acc[st] = (acc[st] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([st, count]: any) => (
                  <span key={st} className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_TEXT[st] || 'bg-gray-100 text-gray-600'}`}>
                    {st}: {count}
                  </span>
                ))}
                {Object.entries(
                  clientVolts.reduce((acc: any, b) => {
                    const j = b.job_type || 'Unknown';
                    acc[j] = (acc[j] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([job, count]: any) => (
                  <span key={job} className="text-xs font-medium px-3 py-1 rounded-full bg-purple-100 text-purple-700">
                    {job}: {count}
                  </span>
                ))}
              </div>

              {/* Volts table */}
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Position</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Job Type</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Warehouse</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Packer</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientVolts.map((box, i) => {
                      const status = box.estado || box.status || 'PENDING';
                      const pos = box.row && box.column
                        ? `${box.row}${box.column} L${box.level}`
                        : box.position || '—';
                      return (
                        <tr key={box.box_id || i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-900">{pos}</td>
                          <td className="px-6 py-3 text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${JOB_COLORS[box.job_type] || 'bg-gray-400'}`} />
                              {box.job_type || '—'}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-gray-500">
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" /> WH{box.warehouse_id}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-gray-500">{box.packer || '—'}</td>
                          <td className="px-6 py-3">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_TEXT[status] || 'bg-gray-100 text-gray-600'}`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

