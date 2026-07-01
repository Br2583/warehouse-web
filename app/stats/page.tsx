'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  MagnifyingGlassIcon, XMarkIcon, BuildingOffice2Icon, ChevronRightIcon,
  ArchiveBoxIcon, ClockIcon, CheckCircleIcon, TruckIcon,
} from '@heroicons/react/24/outline';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { STATUS_COLORS_HEX } from '@/lib/constants';

// â”€â”€ Colours â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STATUS_TEXT: Record<string, string>    = { PENDING: 'text-amber-700 bg-amber-100', READY: 'text-green-700 bg-green-100', DELIVERED: 'text-indigo-700 bg-indigo-100' };
const JOB_COLORS: Record<string, string>     = { Fire: '#ef4444', Water: '#3b82f6', Moving: '#a855f7', Storage: '#6b7280' };
const JOB_TEXT: Record<string, string>       = { Fire: 'bg-red-100 text-red-700', Water: 'bg-blue-100 text-blue-700', Moving: 'bg-purple-100 text-purple-700', Storage: 'bg-gray-100 text-gray-600' };

// â”€â”€ Count-up number â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CountUp({ value, delay = 0 }: { value: number; delay?: number }) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, v => Math.round(v).toLocaleString());
  useEffect(() => {
    const t = setTimeout(() => {
      const c = animate(mv, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
      return c.stop;
    }, delay);
    return () => clearTimeout(t);
  }, [value, delay, mv]);
  return <motion.span>{display}</motion.span>;
}

// â”€â”€ KPI Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function KpiCard({ label, value, icon: Icon, accent, delay }: {
  label: string; value: number; icon: any; accent: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900 tracking-tight leading-none">
          <CountUp value={value} delay={delay * 1000} />
        </p>
        <p className="text-sm text-gray-400 mt-1.5 font-medium">{label}</p>
      </div>
    </motion.div>
  );
}

// â”€â”€ Donut centre label â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DonutCenter({ total }: { total: number }) {
  return (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
      <tspan x="50%" dy="-8" fontSize="28" fontWeight="700" fill="#111827">{total}</tspan>
      <tspan x="50%" dy="22" fontSize="12" fill="#9ca3af">total</tspan>
    </text>
  );
}

// â”€â”€ Custom tooltip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-xs">
      <span className="font-semibold text-gray-900">{payload[0].name}: </span>
      <span className="text-gray-600">{payload[0].value}</span>
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats]               = useState<any>(null);
  const [boxes, setBoxes]               = useState<any[]>([]);
  const [whNames, setWhNames]           = useState<Record<string, string>>({});
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [sortBy, setSortBy]             = useState<'count' | 'name'>('count');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientPage, setClientPage]     = useState(0);

  const PAGE_SIZE = 50;

  useEffect(() => {
    const load = async () => {
      try {
        const [globalStats, allBoxes, warehouses] = await Promise.allSettled([
          api.get('/api/stats/global'),
          api.get('/api/boxes'),
          api.get('/api/warehouses'),
        ]);
        if (globalStats.status === 'fulfilled') setStats(globalStats.value);
        if (allBoxes.status === 'fulfilled') {
          const d = allBoxes.value;
          setBoxes(Array.isArray(d) ? d : d?.boxes || []);
        }
        if (warehouses.status === 'fulfilled') {
          const whs: any[] = Array.isArray(warehouses.value) ? warehouses.value : warehouses.value?.warehouses || [];
          const map: Record<string, string> = {};
          whs.forEach((w: any) => { map[w.warehouse_id || w.id] = w.name; });
          setWhNames(map);
        }
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const total     = stats?.total_boxes ?? boxes.length ?? 0;
  const pending   = stats?.statuses?.PENDING   ?? 0;
  const ready     = stats?.statuses?.READY     ?? 0;
  const delivered = stats?.statuses?.DELIVERED ?? 0;

  // Pie data (status)
  const pieData = useMemo(() => [
    { name: 'Pending',   value: pending,   color: STATUS_COLORS_HEX.PENDING },
    { name: 'Ready',     value: ready,     color: STATUS_COLORS_HEX.READY },
    { name: 'Delivered', value: delivered, color: STATUS_COLORS_HEX.DELIVERED },
  ].filter(d => d.value > 0), [pending, ready, delivered]);

  // Bar data (job type)
  const jobData = useMemo(() =>
    Object.entries(stats?.job_types || {}).map(([k, v]) => ({ name: k, value: v as number, fill: JOB_COLORS[k] || '#6b7280' })),
  [stats]);

  // Client stats from boxes
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 p-4 md:p-8 pb-28 md:pb-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
          <p className="text-gray-500 text-sm mt-1">Inventory analytics &amp; client overview</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Total Vaults"  value={total}     icon={ArchiveBoxIcon}   accent="bg-blue-100 text-blue-600"   delay={0} />
              <KpiCard label="Pending"       value={pending}   icon={ClockIcon}        accent="bg-amber-100 text-amber-600" delay={0.08} />
              <KpiCard label="Ready"         value={ready}     icon={CheckCircleIcon}  accent="bg-green-100 text-green-600" delay={0.16} />
              <KpiCard label="Delivered"     value={delivered} icon={TruckIcon}        accent="bg-indigo-100 text-indigo-600" delay={0.24} />
            </div>

            {/* Charts row: Donut + Job type bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Donut â€” Status breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl border border-gray-100 p-6"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              >
                <h2 className="font-semibold text-gray-900 mb-1">Status Breakdown</h2>
                <p className="text-xs text-gray-400 mb-4">Distribution of vault states</p>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius={62} outerRadius={88}
                        paddingAngle={3}
                        dataKey="value"
                        animationBegin={300}
                        animationDuration={900}
                        labelLine={false}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent" />
                        ))}
                        <DonutCenter total={total} />
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        iconType="circle" iconSize={8}
                        formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-gray-300 text-sm">No data yet</div>
                )}
              </motion.div>

              {/* Bar chart â€” Job type */}
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
                className="bg-white rounded-2xl border border-gray-100 p-6"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              >
                <h2 className="font-semibold text-gray-900 mb-1">By Job Type</h2>
                <p className="text-xs text-gray-400 mb-4">Vaults per restoration category</p>
                {jobData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={jobData} barSize={32} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                      <Bar dataKey="value" name="Vaults" radius={[6, 6, 0, 0]} animationBegin={400} animationDuration={900}>
                        {jobData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-gray-300 text-sm">No data yet</div>
                )}
              </motion.div>
            </div>

            {/* Client table */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.54 }}
              className="bg-white rounded-2xl border border-gray-100 p-6"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              {/* Table header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="font-semibold text-gray-900">Clients</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{clientList.length} clients · {boxes.length} vaults</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex bg-gray-100 rounded-xl overflow-hidden text-xs">
                    <button onClick={() => setSortBy('count')}
                      className={`px-3 py-2 font-medium transition-colors ${sortBy === 'count' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                      Most vaults
                    </button>
                    <button onClick={() => setSortBy('name')}
                      className={`px-3 py-2 font-medium transition-colors ${sortBy === 'name' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                      Aâ€“Z
                    </button>
                  </div>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-2 w-3.5 h-3.5 text-gray-400" />
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
                <p className="text-center py-12 text-gray-400 text-sm">No clients found</p>
              ) : (
                <div className="space-y-2">
                  {clientList.map((client, i) => {
                    const maxClient = clientList[0]?.total || 1;
                    const pct = (client.total / maxClient) * 100;
                    return (
                      <motion.div
                        key={client.name}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.025 }}
                        onClick={() => { setSelectedClient(client.name); setClientPage(0); }}
                        className="group flex items-center gap-4 px-4 py-3.5 rounded-xl border border-transparent hover:border-blue-100 hover:bg-blue-50/50 cursor-pointer transition-all"
                      >
                        {/* Avatar */}
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-blue-600">{client.name[0].toUpperCase()}</span>
                        </div>

                        {/* Name + bar */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-sm font-semibold text-gray-900 truncate">{client.name}</p>
                            <span className="text-sm font-bold text-gray-900 ml-2 flex-shrink-0">{client.total}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.7, delay: 0.6 + i * 0.03, ease: 'easeOut' }}
                              className="h-full rounded-full bg-blue-500"
                            />
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
                          {Object.entries(client.byJob).slice(0, 2).map(([job]) => (
                            <span key={job} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${JOB_TEXT[job] || 'bg-gray-100 text-gray-600'}`}>{job}</span>
                          ))}
                        </div>

                        <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>

          </div>
        )}
      </main>

      {/* Client detail modal */}
      <AnimatePresence>
        {selectedClient && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setSelectedClient(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                    <span className="text-base font-bold text-blue-600">{selectedClient[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedClient}</h2>
                    <p className="text-sm text-gray-400">{clientVolts.length} vault{clientVolts.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <XMarkIcon className="w-5 h-5" />
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
                  <span key={job} className={`text-xs font-medium px-3 py-1 rounded-full ${JOB_TEXT[job] || 'bg-gray-100 text-gray-600'}`}>
                    {job}: {count}
                  </span>
                ))}
              </div>

              {/* Vaults table */}
              <div className="overflow-y-auto overflow-x-auto flex-1">
                <table className="w-full min-w-[560px] text-sm">
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
                    {clientVolts.slice(clientPage * PAGE_SIZE, (clientPage + 1) * PAGE_SIZE).map((box, i) => {
                      const status = box.estado || box.status || 'PENDING';
                      const pos = box.row && box.column ? `${box.row}${box.column} L${box.level}` : box.position || 'â€”';
                      return (
                        <tr key={box.box_id || i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 font-medium text-gray-900">{pos}</td>
                          <td className="px-6 py-3 text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: JOB_COLORS[box.job_type] || '#9ca3af' }} />
                              {box.job_type || 'â€”'}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-gray-500">
                            <div className="flex items-center gap-1">
                              <BuildingOffice2Icon className="w-3.5 h-3.5" /> {whNames[box.warehouse_id] || box.warehouse_id || 'â€”'}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-gray-500">{box.packer || 'â€”'}</td>
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
                {clientVolts.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 text-sm">
                    <span className="text-gray-400">
                      {clientPage * PAGE_SIZE + 1}â€“{Math.min((clientPage + 1) * PAGE_SIZE, clientVolts.length)} of {clientVolts.length}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setClientPage(p => Math.max(0, p - 1))}
                        disabled={clientPage === 0}
                        className="px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setClientPage(p => p + 1)}
                        disabled={(clientPage + 1) * PAGE_SIZE >= clientVolts.length}
                        className="px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
