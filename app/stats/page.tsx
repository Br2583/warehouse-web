'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  MagnifyingGlassIcon, XMarkIcon, BuildingOffice2Icon, ChevronRightIcon,
  ArchiveBoxIcon, ClockIcon, CheckCircleIcon, TruckIcon,
  ArrowTrendingUpIcon, UserGroupIcon,
} from '@heroicons/react/24/outline';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import { STATUS_COLORS_HEX } from '@/lib/constants';

const JOB_COLORS: Record<string, string> = { Fire: '#ef4444', Water: '#3b82f6', Moving: '#a855f7', Storage: '#6b7280' };
const JOB_TEXT: Record<string, string>   = { Fire: 'bg-red-100 text-red-700', Water: 'bg-blue-100 text-blue-700', Moving: 'bg-purple-100 text-purple-700', Storage: 'bg-gray-100 text-gray-600' };

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; text: string; border: string; icon: any }> = {
  PENDING:   { label: 'Pending',   color: '#f59e0b', bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200',  icon: ClockIcon },
  READY:     { label: 'Ready',     color: '#22c55e', bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200',  icon: CheckCircleIcon },
  DELIVERED: { label: 'Delivered', color: '#3b82f6', bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200',   icon: TruckIcon },
};

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

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-xl text-xs">
      <span className="font-semibold text-gray-900">{payload[0].name || payload[0].dataKey}: </span>
      <span className="text-gray-600">{payload[0].value}</span>
    </div>
  );
}

// Build weekly vault creation trend from raw boxes
function buildTrend(boxes: any[]): { week: string; vaults: number }[] {
  const map: Record<string, number> = {};
  boxes.forEach(b => {
    const d = new Date(b.created?.includes('T') ? b.created : (b.created || '').replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return;
    // Get Monday of that week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d); monday.setDate(diff);
    const key = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map).slice(-8).map(([week, vaults]) => ({ week, vaults }));
}

export default function StatsPage() {
  const [stats, setStats]     = useState<any>(null);
  const [boxes, setBoxes]     = useState<any[]>([]);
  const [whNames, setWhNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [sortBy, setSortBy]   = useState<'count' | 'name'>('count');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientPage, setClientPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    const load = async () => {
      try {
        const [gs, ab, whs] = await Promise.allSettled([
          api.get('/api/stats/global'),
          api.get('/api/boxes'),
          api.get('/api/warehouses'),
        ]);
        if (gs.status === 'fulfilled') setStats(gs.value);
        if (ab.status === 'fulfilled') {
          const d = ab.value;
          setBoxes(Array.isArray(d) ? d : d?.boxes || []);
        }
        if (whs.status === 'fulfilled') {
          const arr: any[] = Array.isArray(whs.value) ? whs.value : whs.value?.warehouses || [];
          const map: Record<string, string> = {};
          arr.forEach((w: any) => { map[w.warehouse_id || w.id] = w.name; });
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

  const pieData = useMemo(() => [
    { name: 'Pending',   value: pending,   color: STATUS_COLORS_HEX.PENDING },
    { name: 'Ready',     value: ready,     color: STATUS_COLORS_HEX.READY },
    { name: 'Delivered', value: delivered, color: STATUS_COLORS_HEX.DELIVERED },
  ].filter(d => d.value > 0), [pending, ready, delivered]);

  const jobData = useMemo(() =>
    Object.entries(stats?.job_types || {}).map(([k, v]) => ({ name: k, value: v as number, fill: JOB_COLORS[k] || '#6b7280' })),
  [stats]);

  const trendData = useMemo(() => buildTrend(boxes), [boxes]);

  const warehouseData = useMemo(() => {
    const map: Record<string, number> = {};
    boxes.forEach(b => {
      const name = whNames[b.warehouse_id] || 'Unknown';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [boxes, whNames]);

  const clientStats = useMemo(() => {
    const map: Record<string, { total: number; byJob: Record<string, number>; byStatus: Record<string, number> }> = {};
    boxes.forEach(box => {
      const name = (box.client_name || 'Unknown').trim();
      if (!map[name]) map[name] = { total: 0, byJob: {}, byStatus: {} };
      map[name].total++;
      map[name].byJob[box.job_type || 'Unknown'] = (map[name].byJob[box.job_type || 'Unknown'] || 0) + 1;
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

  // Recent vaults (last 5)
  const recentVaults = useMemo(() =>
    [...boxes].sort((a, b) => a.created < b.created ? 1 : -1).slice(0, 6),
  [boxes]);

  if (loading) return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 p-4 md:p-8 pb-28 md:pb-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          </div>
          <p className="text-gray-400 text-sm ml-12">Real-time inventory intelligence</p>
        </motion.div>

        <div className="space-y-6">

          {/* ── KPI cards with mini sparklines ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Vaults', value: total,     color: '#2563eb', lightBg: '#eff6ff', textColor: '#1d4ed8', icon: ArchiveBoxIcon, delay: 0 },
              { label: 'Pending',      value: pending,   color: '#d97706', lightBg: '#fffbeb', textColor: '#b45309', icon: ClockIcon,        delay: 0.07 },
              { label: 'Ready',        value: ready,     color: '#16a34a', lightBg: '#f0fdf4', textColor: '#15803d', icon: CheckCircleIcon,  delay: 0.14 },
              { label: 'Delivered',    value: delivered, color: '#7c3aed', lightBg: '#f5f3ff', textColor: '#6d28d9', icon: TruckIcon,        delay: 0.21 },
            ].map(({ label, value, color, lightBg, textColor, icon: Icon, delay }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-2xl border border-gray-100 p-5 overflow-hidden relative"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.03)' }}
              >
                {/* Background accent */}
                <div className="absolute inset-0 opacity-30 rounded-2xl" style={{ background: `radial-gradient(ellipse at top right, ${lightBg}, transparent 70%)` }} />

                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: lightBg }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    {total > 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: lightBg, color: textColor }}>
                        {Math.round((value / total) * 100)}%
                      </span>
                    )}
                  </div>

                  <p className="text-3xl font-black text-gray-900 tracking-tight leading-none">
                    <CountUp value={value} delay={delay * 1000} />
                  </p>
                  <p className="text-xs font-semibold text-gray-400 mt-1.5 uppercase tracking-wide">{label}</p>

                  {/* Mini bar */}
                  {total > 0 && (
                    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${(value / total) * 100}%` }}
                        transition={{ duration: 0.9, delay: delay + 0.3, ease: 'easeOut' }}
                        className="h-full rounded-full" style={{ backgroundColor: color }}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Trend + Pie row ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Vault creation trend — 2/3 width */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
              className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-6"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-bold text-gray-900">Vault Activity</h2>
                <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-xl">Last 8 weeks</span>
              </div>
              <p className="text-xs text-gray-400 mb-5">New vaults added per week</p>
              {trendData.length > 1 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
                    <Area dataKey="vaults" name="Vaults" stroke="#2563eb" strokeWidth={2} fill="url(#blueGrad)" dot={{ fill: '#2563eb', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#2563eb', strokeWidth: 0 }} animationBegin={300} animationDuration={1000} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-gray-300 text-sm">Not enough data yet</div>
              )}
            </motion.div>

            {/* Status Donut — 1/3 width */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}
              className="bg-white rounded-2xl border border-gray-100 p-6"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <h2 className="font-bold text-gray-900 mb-0.5">By Status</h2>
              <p className="text-xs text-gray-400 mb-3">Distribution</p>
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={62} paddingAngle={4} dataKey="value" animationBegin={200} animationDuration={900} labelLine={false}>
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                          <tspan x="50%" dy="-8" fontSize="20" fontWeight="800" fill="#111827">{total}</tspan>
                          <tspan x="50%" dy="16" fontSize="9" fill="#9ca3af">TOTAL</tspan>
                        </text>
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {(['PENDING', 'READY', 'DELIVERED'] as const).map(st => {
                      const cfg = STATUS_CFG[st];
                      const val = st === 'PENDING' ? pending : st === 'READY' ? ready : delivered;
                      if (val === 0) return null;
                      return (
                        <div key={st} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                            <span className="text-xs text-gray-500">{cfg.label}</span>
                          </div>
                          <span className="text-xs font-bold text-gray-900">{val}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="h-[150px] flex items-center justify-center text-gray-300 text-sm">No data</div>
              )}
            </motion.div>
          </div>

          {/* ── Job type bar + Warehouse load ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Job type */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl border border-gray-100 p-6"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <h2 className="font-bold text-gray-900 mb-0.5">By Job Type</h2>
              <p className="text-xs text-gray-400 mb-5">Vaults per restoration category</p>
              {jobData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={jobData} barSize={32} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 6 }} />
                    <Bar dataKey="value" name="Vaults" radius={[8, 8, 0, 0]} animationBegin={400} animationDuration={900}>
                      {jobData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-gray-300 text-sm">No data yet</div>
              )}
            </motion.div>

            {/* Warehouse load */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}
              className="bg-white rounded-2xl border border-gray-100 p-6"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <BuildingOffice2Icon className="w-4 h-4 text-gray-400" />
                <h2 className="font-bold text-gray-900">Warehouse Load</h2>
              </div>
              <p className="text-xs text-gray-400 mb-5">Vault count per location</p>
              {warehouseData.length > 0 ? (
                <div className="space-y-4">
                  {warehouseData.map((wh, i) => {
                    const maxVal = warehouseData[0]?.value || 1;
                    const pct = (wh.value / maxVal) * 100;
                    const colors = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a'];
                    const c = colors[i % colors.length];
                    return (
                      <div key={wh.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-semibold text-gray-700 truncate">{wh.name}</p>
                          <span className="text-sm font-bold text-gray-900 ml-2">{wh.value}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.55 + i * 0.1 }}
                            className="h-full rounded-full" style={{ backgroundColor: c }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-gray-300 text-sm">No data yet</div>
              )}
            </motion.div>
          </div>

          {/* ── Recent Vaults + Top Clients ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Recent vaults */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}
              className="bg-white rounded-2xl border border-gray-100 p-6"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <h2 className="font-bold text-gray-900 mb-1">Recent Vaults</h2>
              <p className="text-xs text-gray-400 mb-4">Last added to inventory</p>
              <div className="space-y-3">
                {recentVaults.length === 0 && <p className="text-sm text-gray-300 text-center py-8">No vaults yet</p>}
                {recentVaults.map((box, i) => {
                  const status = box.estado || box.status || 'PENDING';
                  const cfg = STATUS_CFG[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };
                  return (
                    <motion.div
                      key={box.box_id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs"
                        style={{ backgroundColor: JOB_COLORS[box.job_type] + '18', color: JOB_COLORS[box.job_type] || '#6b7280' }}>
                        {(box.client_name || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{box.client_name || '—'}</p>
                        <p className="text-xs text-gray-400">{box.position} · {box.job_type}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Top clients */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.56 }}
              className="bg-white rounded-2xl border border-gray-100 p-6"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <UserGroupIcon className="w-4 h-4 text-gray-400" />
                <h2 className="font-bold text-gray-900">Top Clients</h2>
              </div>
              <p className="text-xs text-gray-400 mb-4">By vault count</p>
              <div className="space-y-3">
                {clientList.length === 0 && <p className="text-sm text-gray-300 text-center py-8">No clients yet</p>}
                {clientList.slice(0, 6).map((client, i) => {
                  const maxVal = clientList[0]?.total || 1;
                  const pct = (client.total / maxVal) * 100;
                  return (
                    <div key={client.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                          <p className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">{client.name}</p>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{client.total}</span>
                      </div>
                      <div className="ml-6 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, delay: 0.65 + i * 0.06 }}
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* ── Full client table ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl border border-gray-100 p-6"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="font-bold text-gray-900">All Clients</h2>
                <p className="text-xs text-gray-400 mt-0.5">{clientList.length} clients · {boxes.length} vaults</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex bg-gray-100 rounded-xl overflow-hidden text-xs">
                  <button onClick={() => setSortBy('count')} className={`px-3 py-2 font-medium transition-colors ${sortBy === 'count' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>Most vaults</button>
                  <button onClick={() => setSortBy('name')} className={`px-3 py-2 font-medium transition-colors ${sortBy === 'name' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>A–Z</button>
                </div>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-2 w-3.5 h-3.5 text-gray-400" />
                  <input placeholder="Search client..." value={search} onChange={e => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-40" />
                </div>
              </div>
            </div>
            {clientList.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">No clients found</p>
            ) : (
              <div className="space-y-1">
                {clientList.map((client, i) => {
                  const maxClient = clientList[0]?.total || 1;
                  const pct = (client.total / maxClient) * 100;
                  const topStatus = Object.entries(client.byStatus).sort((a, b) => b[1] - a[1])[0]?.[0] || 'PENDING';
                  const stCfg = STATUS_CFG[topStatus] || STATUS_CFG.PENDING;
                  return (
                    <motion.div
                      key={client.name}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.015 }}
                      onClick={() => { setSelectedClient(client.name); setClientPage(0); }}
                      className="group flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-all"
                    >
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-blue-600">{client.name[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">{client.name}</p>
                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stCfg.bg} ${stCfg.text}`}>{stCfg.label}</span>
                            <span className="text-sm font-bold text-gray-900">{client.total}</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: 0.6 + i * 0.02 }}
                            className="h-full rounded-full bg-blue-500" />
                        </div>
                      </div>
                      <div className="hidden md:flex items-center gap-1 flex-shrink-0">
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
      </main>

      {/* Client detail modal */}
      <AnimatePresence>
        {selectedClient && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedClient(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-xl flex items-center justify-center">
                    <span className="text-lg font-black text-blue-600">{selectedClient[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedClient}</h2>
                    <p className="text-sm text-gray-400">{clientVolts.length} vault{clientVolts.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-3 flex gap-2 flex-wrap border-b border-gray-50">
                {Object.entries(clientVolts.reduce((acc: any, b) => {
                  const st = b.estado || b.status || 'PENDING';
                  acc[st] = (acc[st] || 0) + 1; return acc;
                }, {})).map(([st, count]: any) => {
                  const cfg = STATUS_CFG[st];
                  return cfg ? <span key={st} className={`text-xs font-semibold px-3 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}: {count}</span> : null;
                })}
                {Object.entries(clientVolts.reduce((acc: any, b) => {
                  const j = b.job_type || 'Unknown'; acc[j] = (acc[j] || 0) + 1; return acc;
                }, {})).map(([job, count]: any) => (
                  <span key={job} className={`text-xs font-semibold px-3 py-1 rounded-full ${JOB_TEXT[job] || 'bg-gray-100 text-gray-600'}`}>{job}: {count}</span>
                ))}
              </div>
              <div className="overflow-y-auto overflow-x-auto flex-1">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="sticky top-0 bg-white border-b border-gray-100">
                    <tr>
                      {['Position', 'Job Type', 'Warehouse', 'Packer', 'Status'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clientVolts.slice(clientPage * PAGE_SIZE, (clientPage + 1) * PAGE_SIZE).map((box, i) => {
                      const status = box.estado || box.status || 'PENDING';
                      const cfg = STATUS_CFG[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };
                      const pos = box.row && box.column ? `${box.row}${box.column} L${box.level}` : box.position || '—';
                      return (
                        <tr key={box.box_id || i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 font-semibold text-gray-900">{pos}</td>
                          <td className="px-6 py-3"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: JOB_COLORS[box.job_type] || '#9ca3af' }} /><span className="text-gray-600">{box.job_type || '—'}</span></div></td>
                          <td className="px-6 py-3 text-gray-500"><div className="flex items-center gap-1"><BuildingOffice2Icon className="w-3.5 h-3.5" />{whNames[box.warehouse_id] || '—'}</div></td>
                          <td className="px-6 py-3 text-gray-500">{box.packer || '—'}</td>
                          <td className="px-6 py-3"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {clientVolts.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 text-sm">
                    <span className="text-gray-400">{clientPage * PAGE_SIZE + 1}–{Math.min((clientPage + 1) * PAGE_SIZE, clientVolts.length)} of {clientVolts.length}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setClientPage(p => Math.max(0, p - 1))} disabled={clientPage === 0} className="px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">Previous</button>
                      <button onClick={() => setClientPage(p => p + 1)} disabled={(clientPage + 1) * PAGE_SIZE >= clientVolts.length} className="px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">Next</button>
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
