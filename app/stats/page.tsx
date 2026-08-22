'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  BuildingOffice2Icon, ChevronRightIcon,
  ArchiveBoxIcon, ClockIcon, CheckCircleIcon, TruckIcon,
  ArrowTrendingUpIcon, UserGroupIcon, ExclamationCircleIcon,
} from '@/components/icons';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Cell, ResponsiveContainer, Tooltip,
} from 'recharts';

const JOB_COLORS: Record<string, string> = { Fire: '#ef4444', Water: '#3b82f6', Mold: '#10b981', Moving: '#a855f7', Storage: '#6b7280' };
const JOB_TEXT: Record<string, string>   = { Fire: 'bg-red-100 text-red-700', Water: 'bg-blue-100 text-blue-700', Mold: 'bg-emerald-100 text-emerald-700', Moving: 'bg-purple-100 text-purple-700', Storage: 'bg-gray-100 text-gray-600' };

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; text: string; icon: any }> = {
  PENDING:   { label: 'Pending',   color: '#f59e0b', bg: 'bg-amber-50',   text: 'text-amber-700',  icon: ClockIcon },
  READY:     { label: 'Ready',     color: '#22c55e', bg: 'bg-green-50',   text: 'text-green-700',  icon: CheckCircleIcon },
  DELIVERED: { label: 'Delivered', color: '#3b82f6', bg: 'bg-blue-50',    text: 'text-blue-700',   icon: TruckIcon },
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

function formatLastLoaded(d: Date): string {
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function parseTs(raw: string): number {
  if (!raw) return NaN;
  const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
  return new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z').getTime();
}

type Period = '7d' | '30d' | '3m' | 'all';
type ClientSort = 'count' | 'days' | 'az';

const PERIOD_LABELS: Record<Period, string> = {
  '7d': '7 days', '30d': '30 days', '3m': '3 months', 'all': 'All time',
};

function filterByPeriod(boxes: any[], period: Period): any[] {
  if (period === 'all') return boxes;
  const now = Date.now();
  const ms: Record<Period, number> = {
    '7d':  7  * 86400_000,
    '30d': 30 * 86400_000,
    '3m':  90 * 86400_000,
    'all': 0,
  };
  const cutoff = now - ms[period];
  return boxes.filter(b => {
    const ts = parseTs(b.created || '');
    return !isNaN(ts) && ts >= cutoff;
  });
}

export default function StatsPage() {
  const router = useRouter();
  const [boxes, setBoxes]               = useState<any[]>([]);
  const [whNames, setWhNames]           = useState<Record<string, string>>({});
  const [storageUnits, setStorageUnits] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState<string | null>(null);
  const [period, setPeriod]             = useState<Period>('all');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [refreshing, setRefreshing]     = useState(false);
  const [clientSort, setClientSort]     = useState<ClientSort>('count');
  const [lastLoaded, setLastLoaded]     = useState<Date | null>(null);
  const lastLoadedRef                   = useRef<number>(0);

  const load = useCallback(async (isRefresh?: boolean) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setLoadError(null);
    try {
      const [ab, whs, st] = await Promise.allSettled([
        api.get('/api/boxes'),
        api.get('/api/warehouses'),
        api.get('/api/storage'),
      ]);
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
      if (st.status === 'fulfilled') {
        const arr: any[] = Array.isArray(st.value) ? st.value : st.value?.units || [];
        setStorageUnits(arr);
      }
      if ([ab, whs].every(r => r.status === 'rejected')) {
        setLoadError('Failed to load stats. Try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      const now = new Date();
      setLastLoaded(now);
      lastLoadedRef.current = now.getTime();
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // On-focus auto-refresh: fires when tab regains focus after 5+ min idle
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoadedRef.current > 5 * 60_000) {
        load(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [load]);

  const filteredBoxes = useMemo(() => filterByPeriod(boxes, period), [boxes, period]);

  const total     = filteredBoxes.length;
  const pending   = filteredBoxes.filter(b => (b.estado || b.status || 'PENDING') === 'PENDING').length;
  const ready     = filteredBoxes.filter(b => (b.estado || b.status || '') === 'READY').length;
  const delivered = filteredBoxes.filter(b => (b.estado || b.status || '') === 'DELIVERED').length;

  const jobData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredBoxes.forEach(b => { const k = b.job_type || 'Unknown'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).map(([k, v]) => ({ name: k, value: v, fill: JOB_COLORS[k] || '#6b7280' }));
  }, [filteredBoxes]);

  const warehouseData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredBoxes.forEach(b => {
      const name = whNames[b.warehouse_id] || 'Unknown';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredBoxes, whNames]);

  const recentVaults = useMemo(() =>
    [...boxes].sort((a, b) => a.created < b.created ? 1 : -1).slice(0, 6),
  [boxes]);

  const clientList = useMemo(() => {
    const nowMs = Date.now();

    // Collect ALL box timestamps per client (not filtered) for days-in-system
    const allTsByClient: Record<string, number[]> = {};
    boxes.forEach(b => {
      const name = (b.client_name || 'Unknown').trim();
      const ts = parseTs(b.created || '');
      if (!isNaN(ts)) {
        if (!allTsByClient[name]) allTsByClient[name] = [];
        allTsByClient[name].push(ts);
      }
    });

    const map: Record<string, {
      count: number;
      byJob: Record<string, number>;
      byStatus: Record<string, number>;
      byCondition: Record<string, number>;
      warehouseIds: Set<string>;
    }> = {};

    filteredBoxes.forEach(b => {
      const name = (b.client_name || 'Unknown').trim();
      if (!map[name]) map[name] = { count: 0, byJob: {}, byStatus: {}, byCondition: {}, warehouseIds: new Set() };
      map[name].count++;
      const jk = b.job_type || 'Unknown';
      map[name].byJob[jk] = (map[name].byJob[jk] || 0) + 1;
      const st = b.estado || b.status || 'PENDING';
      map[name].byStatus[st] = (map[name].byStatus[st] || 0) + 1;
      (Array.isArray(b.vault_status) ? b.vault_status : []).forEach((c: string) => {
        map[name].byCondition[c] = (map[name].byCondition[c] || 0) + 1;
      });
      if (b.warehouse_id) map[name].warehouseIds.add(b.warehouse_id);
    });

    const entries = Object.entries(map).map(([name, d]) => {
      const allTs = allTsByClient[name] || [];
      const firstTs = allTs.length > 0 ? Math.min(...allTs) : NaN;
      const daysInSystem = !isNaN(firstTs) ? Math.floor((nowMs - firstTs) / 86_400_000) : null;
      const firstDate = !isNaN(firstTs)
        ? new Date(firstTs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

      return {
        name,
        count: d.count,
        topJob: Object.entries(d.byJob).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
        byStatus: d.byStatus,
        byCondition: d.byCondition,
        pendingCount: d.byStatus['PENDING'] || 0,
        readyCount: d.byStatus['READY'] || 0,
        deliveredCount: d.byStatus['DELIVERED'] || 0,
        warehouseList: Array.from(d.warehouseIds).map(id => whNames[id] || '').filter(n => n.length > 0),
        daysInSystem,
        firstDate,
        storageList: storageUnits.filter(s =>
          (s.client_name || '').trim().toLowerCase() === name.toLowerCase()
        ),
      };
    });

    if (clientSort === 'count') return entries.sort((a, b) => b.count - a.count);
    if (clientSort === 'days')  return entries.sort((a, b) => (b.daysInSystem ?? -1) - (a.daysInSystem ?? -1));
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredBoxes, boxes, storageUnits, whNames, clientSort]);

  if (loading) return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 flex items-center justify-center topbar-offset">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    </div>
  );

  const maxClientCount = Math.max(...clientList.map(c => c.count), 1);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 px-4 pb-8 md:px-8 md:pb-8 topbar-offset">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8 -mx-4 md:-mx-8 px-4 md:px-8 py-6 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, transparent 75%)' }} />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm" style={{ boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}>
                  <ArrowTrendingUpIcon className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
              </div>
              <p className="text-gray-500 text-sm ml-[52px]">
                {boxes.length > 0
                  ? `${total.toLocaleString()} vault${total !== 1 ? 's' : ''} · ${PERIOD_LABELS[period]}${total === 0 ? ` · ${boxes.length} total` : ''}`
                  : 'Real-time inventory intelligence'}
                {lastLoaded && (
                  <span className="text-gray-400"> · Updated {formatLastLoaded(lastLoaded)}</span>
                )}
              </p>
            </div>
            {/* Period selector + refresh */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-1 bg-white/70 backdrop-blur-sm border border-gray-200 p-1 rounded-xl shadow-sm overflow-x-auto">
                {(['7d', '30d', '3m', 'all'] as Period[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${period === p ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>
              <button
                onClick={() => load(true)}
                disabled={refreshing}
                title="Refresh data"
                className="flex items-center justify-center w-9 h-9 flex-shrink-0 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm disabled:opacity-40"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}>
                  <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>

        {loadError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
            <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{loadError}</span>
            <button onClick={() => { setLoadError(null); window.location.reload(); }} className="text-xs font-medium text-red-600 hover:text-red-800 underline">Retry</button>
          </div>
        )}

        {!loadError && total === 0 && boxes.length > 0 && period !== 'all' && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 text-amber-700 text-sm px-4 py-3 rounded-xl mb-4">
            <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">No vaults were added in the last {PERIOD_LABELS[period].toLowerCase()}. Your {boxes.length} vault{boxes.length !== 1 ? 's' : ''} are older than this period.</span>
            <button onClick={() => setPeriod('all')} className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline whitespace-nowrap">Show All time</button>
          </div>
        )}

        <div className="space-y-6">

          {/* ── KPI cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: 'Total Vaults', value: total,     color: '#2563eb', lightBg: '#eff6ff', textColor: '#1d4ed8', icon: ArchiveBoxIcon, delay: 0 },
              { label: 'Pending',      value: pending,   color: '#d97706', lightBg: '#fffbeb', textColor: '#b45309', icon: ClockIcon,        delay: 0.07 },
              { label: 'Ready',        value: ready,     color: '#16a34a', lightBg: '#f0fdf4', textColor: '#15803d', icon: CheckCircleIcon,  delay: 0.14 },
              { label: 'Delivered',    value: delivered, color: '#7c3aed', lightBg: '#f5f3ff', textColor: '#6d28d9', icon: TruckIcon,        delay: 0.21 },
            ].map(({ label, value, color, lightBg, textColor, icon: Icon, delay }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 overflow-hidden relative"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.03)' }}
              >
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
                  <p className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight leading-none">
                    <CountUp value={value} delay={delay * 1000} />
                  </p>
                  <p className="text-xs font-semibold text-gray-400 mt-1.5 uppercase tracking-wide">{label}</p>
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

          {/* ── Clients (HERO — most useful section) ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            className="bg-white rounded-2xl border border-gray-100 p-6"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            {/* Section header + sort chips */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <UserGroupIcon className="w-4 h-4 text-gray-400" />
                  <h2 className="font-bold text-gray-900">Clients</h2>
                </div>
                <p className="text-xs text-gray-400 pl-6">
                  {clientList.length} client{clientList.length !== 1 ? 's' : ''} · {filteredBoxes.length} vault{filteredBoxes.length !== 1 ? 's' : ''} · {PERIOD_LABELS[period]}
                </p>
              </div>
              {/* Sort chips — horizontal scroll on mobile */}
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5 -mb-0.5">
                {(['count', 'days', 'az'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setClientSort(s)}
                    className={`flex-shrink-0 min-h-[36px] px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                      clientSort === s
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {s === 'count' ? 'Most vaults' : s === 'days' ? 'Longest in system' : 'A–Z'}
                  </button>
                ))}
              </div>
            </div>

            {clientList.length === 0 ? (
              <div className="text-sm text-gray-300 text-center py-8">No clients yet</div>
            ) : (
              <div className="space-y-1">
                {clientList.map((client, i) => {
                  const pct = (client.count / maxClientCount) * 100;
                  const isExpanded = expandedClient === client.name;
                  return (
                    <div key={client.name}>
                      {/* Collapsed row */}
                      <motion.div
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                        onClick={() => setExpandedClient(isExpanded ? null : client.name)}
                        className="group flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-all min-h-[60px]"
                      >
                        {/* Avatar */}
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-blue-600">{client.name[0]?.toUpperCase()}</span>
                        </div>

                        {/* Name + bar */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1.5">
                            <p className="text-sm font-semibold text-gray-900 truncate">{client.name}</p>
                            {client.topJob && (
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${JOB_TEXT[client.topJob] || 'bg-gray-100 text-gray-600'}`}>
                                {client.topJob}
                              </span>
                            )}
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.7, delay: 0.3 + i * 0.03 }}
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                            />
                          </div>
                        </div>

                        {/* Count + days (right, desktop) */}
                        <div className="flex-shrink-0 text-right hidden sm:block">
                          <p className="text-sm font-bold text-gray-900">{client.count} vault{client.count !== 1 ? 's' : ''}</p>
                          {client.daysInSystem !== null && (
                            <p className="text-[11px] text-gray-400">{client.daysInSystem}d in system</p>
                          )}
                        </div>
                        {/* Mobile: compact */}
                        <div className="flex-shrink-0 text-right sm:hidden">
                          <p className="text-sm font-bold text-gray-900">{client.count}v</p>
                          {client.daysInSystem !== null && (
                            <p className="text-[11px] text-gray-400">{client.daysInSystem}d</p>
                          )}
                        </div>

                        {/* P/R/D badges (desktop) */}
                        <div className="flex-shrink-0 hidden md:flex items-center gap-1 text-[11px] font-semibold">
                          {client.pendingCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600">{client.pendingCount}P</span>
                          )}
                          {client.readyCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-green-50 text-green-600">{client.readyCount}R</span>
                          )}
                          {client.deliveredCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600">{client.deliveredCount}D</span>
                          )}
                        </div>

                        <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronRightIcon className={`w-4 h-4 flex-shrink-0 transition-colors ${isExpanded ? 'text-blue-500' : 'text-gray-300 group-hover:text-blue-400'}`} />
                        </motion.div>
                      </motion.div>

                      {/* Expanded panel */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ duration: 0.2 }}
                          className="mx-3 mb-2 overflow-hidden"
                        >
                          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">

                            {/* Time in system + P/R/D row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 pb-4 border-b border-gray-200">
                              {client.daysInSystem !== null && (
                                <div className="flex items-center gap-1.5">
                                  <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-xs font-semibold text-gray-700">
                                    {client.daysInSystem} day{client.daysInSystem !== 1 ? 's' : ''} in system
                                  </span>
                                  {client.firstDate && (
                                    <span className="text-xs text-gray-400">since {client.firstDate}</span>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 ml-auto">
                                {client.pendingCount > 0 && (
                                  <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-amber-50 text-amber-600">{client.pendingCount} Pending</span>
                                )}
                                {client.readyCount > 0 && (
                                  <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-green-50 text-green-600">{client.readyCount} Ready</span>
                                )}
                                {client.deliveredCount > 0 && (
                                  <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-blue-50 text-blue-600">{client.deliveredCount} Delivered</span>
                                )}
                              </div>
                            </div>

                            {/* Status bars + Condition */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                              <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">By Status</p>
                                <div className="space-y-2">
                                  {[
                                    { key: 'PENDING',   label: 'Pending',   color: '#f59e0b' },
                                    { key: 'READY',     label: 'Ready',     color: '#22c55e' },
                                    { key: 'DELIVERED', label: 'Delivered', color: '#3b82f6' },
                                  ].map(({ key, label, color }) => {
                                    const val = client.byStatus[key] || 0;
                                    if (val === 0) return null;
                                    return (
                                      <div key={key}>
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-xs text-gray-500">{label}</span>
                                          <span className="text-xs font-bold text-gray-900">{val}</span>
                                        </div>
                                        <div className="h-1.5 bg-white rounded-full overflow-hidden border border-gray-100">
                                          <div className="h-full rounded-full transition-all" style={{ width: `${(val / client.count) * 100}%`, backgroundColor: color }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">By Condition</p>
                                {Object.keys(client.byCondition).length === 0 ? (
                                  <p className="text-xs text-gray-300">No conditions tagged</p>
                                ) : (
                                  <div className="space-y-2">
                                    {Object.entries(client.byCondition).sort((a, b) => b[1] - a[1]).map(([cond, val]) => (
                                      <div key={cond}>
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-xs text-gray-500 truncate">{cond}</span>
                                          <span className="text-xs font-bold text-gray-900 ml-1">{val}</span>
                                        </div>
                                        <div className="h-1.5 bg-white rounded-full overflow-hidden border border-gray-100">
                                          <div className="h-full rounded-full bg-violet-400" style={{ width: `${(val / client.count) * 100}%` }} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Warehouses */}
                            {client.warehouseList.length > 0 && (
                              <div className="border-t border-gray-200 pt-3 mb-3">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Warehouses</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {client.warehouseList.map((wh: string) => (
                                    <span key={wh} className="flex items-center gap-1 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-2 py-1">
                                      <BuildingOffice2Icon className="w-3 h-3 text-gray-400" />
                                      {wh}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Storage units */}
                            {client.storageList.length > 0 && (
                              <div className="border-t border-gray-200 pt-3 mb-3">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                  Storage Units ({client.storageList.length})
                                </p>
                                <div className="space-y-1">
                                  {client.storageList.map((s: any) => (
                                    <button
                                      key={s.id}
                                      onClick={(e) => { e.stopPropagation(); router.push(`/storage/${s.id}`); }}
                                      className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-white transition-colors group/s min-h-[36px]"
                                    >
                                      <BuildingOffice2Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                      <span className="text-xs font-medium text-gray-700 truncate flex-1">{s.unit_name || 'Unnamed'}</span>
                                      {(s.city || s.state) && (
                                        <span className="text-[10px] text-gray-400 flex-shrink-0">{[s.city, s.state].filter(Boolean).join(', ')}</span>
                                      )}
                                      {s.status && (
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">{s.status}</span>
                                      )}
                                      <ChevronRightIcon className="w-3 h-3 text-gray-300 group-hover/s:text-blue-400 flex-shrink-0" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* View all vaults */}
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/search?q=${encodeURIComponent(client.name)}`); }}
                              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors min-h-[36px]"
                            >
                              View all vaults
                              <ChevronRightIcon className="w-3 h-3" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* ── By Job Type + Warehouse Load ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

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

          {/* ── Recent Vaults ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}
            className="bg-white rounded-2xl border border-gray-100 p-6"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <h2 className="font-bold text-gray-900 mb-1">Recent Vaults</h2>
            <p className="text-xs text-gray-400 mb-4">Last added to inventory · all time</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentVaults.length === 0 && <p className="text-sm text-gray-300 text-center py-8 col-span-2">No vaults yet</p>}
              {recentVaults.map((box, i) => {
                const status = box.estado || box.status || 'PENDING';
                const cfg = STATUS_CFG[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };
                return (
                  <motion.div
                    key={box.box_id || i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs"
                      style={{ backgroundColor: (JOB_COLORS[box.job_type] || '#6b7280') + '18', color: JOB_COLORS[box.job_type] || '#6b7280' }}>
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

        </div>
      </main>
    </div>
  );
}
