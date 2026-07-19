'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  ArchiveBoxIcon, ClipboardDocumentListIcon, CheckCircleIcon, TruckIcon,
  ClockIcon, PlayIcon, CheckIcon, PlusIcon, MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { parseDate, parseDateOpt } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import { SkeletonDashboardCard } from '@/components/Skeleton';
import Link from 'next/link';
const STATUS_COLORS_LIGHT: Record<string, string> = {
  PENDING:   'bg-amber-50 text-amber-700',
  READY:     'bg-green-50 text-green-700',
  DELIVERED: 'bg-blue-50 text-blue-700',
};

function CountUp({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, v => Math.round(v).toLocaleString());
  useEffect(() => {
    const c = animate(mv, value, { duration: 1.0, ease: [0.16, 1, 0.3, 1] });
    return c.stop;
  }, [value, mv]);
  return <motion.span>{display}</motion.span>;
}

const CARD_CFG: Record<string, { lightBg: string; accentColor: string; iconBg: string }> = {
  blue:   { lightBg: '#eff6ff', accentColor: '#1d4ed8', iconBg: 'bg-blue-600' },
  amber:  { lightBg: '#fffbeb', accentColor: '#b45309', iconBg: 'bg-amber-500' },
  green:  { lightBg: '#f0fdf4', accentColor: '#15803d', iconBg: 'bg-green-600' },
  purple: { lightBg: '#f5f3ff', accentColor: '#6d28d9', iconBg: 'bg-purple-600' },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' as const }
  }),
};


export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [workStats, setWorkStats] = useState({ total: 0, pending: 0, in_progress: 0, completed: 0 });
  const [warehouseNames, setWarehouseNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user?.company_id) return;
    const load = async () => {
      // Single query returns stats + histogram + recent + sla_count
      try {
        const globalStats = await api.get('/api/stats/global');
        setStats(globalStats);
      } catch { /* stats unavailable, show zeros */ }

      try {
        const taskList = await api.get('/api/tasks');
        if (Array.isArray(taskList)) {
          setWorkStats({
            total: taskList.length,
            pending: taskList.filter((t: any) => t.status === 'PENDING').length,
            in_progress: taskList.filter((t: any) => t.status === 'IN_PROGRESS').length,
            completed: taskList.filter((t: any) => t.status === 'DONE').length,
          });
        }
      } catch { /* no tasks yet */ }

      try {
        const whs = await api.get('/api/warehouses');
        if (Array.isArray(whs)) {
          const map: Record<string, string> = {};
          whs.forEach((w: any) => { map[w.id] = w.name || w.warehouse_name || w.id; });
          setWarehouseNames(map);
        }
      } catch { /* warehouse names unavailable */ }

      setLoading(false);
    };
    load();
  }, [user?.company_id]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const overviewCards = [
    { label: 'Total Vaults', value: stats?.total_boxes ?? 0, icon: ArchiveBoxIcon, color: 'blue', href: '/warehouses' },
    { label: 'Work Orders', value: workStats.total, icon: ClipboardDocumentListIcon, color: 'amber', href: '/production' },
    { label: 'Ready', value: stats?.statuses?.READY ?? 0, icon: CheckCircleIcon, color: 'green', href: '/search?status=READY' },
    { label: 'Delivered', value: stats?.statuses?.DELIVERED ?? 0, icon: TruckIcon, color: 'purple', href: '/search?status=DELIVERED' },
  ];


  // Stats now includes histogram, recent, sla_count — no separate boxes load needed
  const histogramData: { label: string; count: number }[] = stats?.histogram || [];
  const recentBoxes: any[] = stats?.recent || [];
  const slaCount: number = stats?.sla_count ?? 0;

  const total = stats?.total_boxes || 0;
  const pending = stats?.statuses?.PENDING || 0;
  const ready = stats?.statuses?.READY || 0;
  const delivered = stats?.statuses?.DELIVERED || 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 px-4 pb-28 md:px-8 md:pb-8 topbar-offset">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 md:mb-8">
          <p className="text-gray-400 text-sm">{greeting()},</p>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mt-0.5">
            {user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{user?.company_name}</p>
        </motion.div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-8">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" animate="show">
                  <SkeletonDashboardCard />
                </motion.div>
              ))
            : overviewCards.map((card, i) => {
                const Icon = card.icon;
                const cfg = CARD_CFG[card.color];
                return (
                  <motion.div key={card.label} custom={i} variants={fadeUp} initial="hidden" animate="show">
                    <Link href={card.href}>
                      <div className="bg-white rounded-2xl p-4 md:p-5 hover:shadow-md transition-all cursor-pointer overflow-hidden relative"
                        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}>
                        <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-50"
                          style={{ background: `radial-gradient(ellipse at top right, ${cfg.lightBg}, transparent 65%)` }} />
                        <div className="relative">
                          <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center mb-3 md:mb-4 ${cfg.iconBg}`}>
                            <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                          </div>
                          <p className="text-3xl md:text-4xl font-black tracking-tight leading-none" style={{ color: cfg.accentColor }}>
                            <CountUp value={card.value} />
                          </p>
                          <p className="text-[11px] font-semibold text-gray-400 mt-2 uppercase tracking-wide">{card.label}</p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })
          }
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-5 md:mb-8">
          {/* Inventory Status */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
            <h2 className="font-semibold text-gray-900 mb-3 md:mb-5">Inventory Status</h2>
            <div className="flex flex-wrap gap-2 md:gap-4 mb-3 md:mb-5">
              {[
                { label: 'Pending', value: pending, color: 'bg-amber-400' },
                { label: 'Ready', value: ready, color: 'bg-green-400' },
                { label: 'Delivered', value: delivered, color: 'bg-blue-500' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${s.color}`} />
                  <span className="text-sm text-gray-500">{s.label}</span>
                  <span className="text-sm font-semibold text-gray-900 ml-1">{s.value}</span>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
              {total > 0 && (
                <>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${(pending / total) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="h-full bg-amber-400"
                  />
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${(ready / total) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="h-full bg-green-400"
                  />
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${(delivered / total) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.7 }}
                    className="h-full bg-blue-500"
                  />
                </>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">{total} total vaults across all warehouses</p>

            {/* By warehouse */}
            {stats?.by_warehouse && (
              <div className="mt-5 pt-5 border-t border-gray-50">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">By Warehouse</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(stats.by_warehouse).map(([whId, count]: any) => (
                    <div key={whId} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-gray-900">{count}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{warehouseNames[whId] || 'Warehouse'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Production Status */}
          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
            <h2 className="font-semibold text-gray-900 mb-5">Production</h2>
            <div className="space-y-4">
              {[
                { label: 'Pending', value: workStats.pending, icon: ClockIcon, color: 'text-gray-400 bg-gray-50' },
                { label: 'In Progress', value: workStats.in_progress, icon: PlayIcon, color: 'text-amber-500 bg-amber-50' },
                { label: 'Completed', value: workStats.completed, icon: CheckIcon, color: 'text-green-500 bg-green-50' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">{item.label}</p>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{item.value}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 pt-5 border-t border-gray-50">
              <p className="text-2xl font-bold text-gray-900">{workStats.total}</p>
              <p className="text-xs text-gray-400">Total work orders</p>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show" className="mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Add Vault', icon: PlusIcon, href: '/warehouses', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
              { label: 'New Order', icon: ClipboardDocumentListIcon, href: '/production', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
              { label: 'Search', icon: MagnifyingGlassIcon, href: '/search', color: 'bg-green-50 text-green-600 hover:bg-green-100' },
              { label: 'Chat', icon: ChatBubbleLeftRightIcon, href: '/chat', color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} href={action.href}>
                  <div className={`flex items-center gap-3 p-4 rounded-xl transition-colors cursor-pointer ${action.color}`}>
                    <Icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{action.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* E1 — 7-day vault histogram */}
          <motion.div custom={7} variants={fadeUp} initial="hidden" animate="show" className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
            <h2 className="font-semibold text-gray-900 mb-5">Vaults Added — Last 7 Days</h2>
            {!loading && histogramData.every(d => d.count === 0) ? (
              <div className="flex items-center justify-center h-28 text-gray-300 text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={histogramData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 12, fontSize: 12, padding: '6px 12px' }}
                    itemStyle={{ color: '#2563eb' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* E6 — SLA widget */}
          <motion.div custom={8} variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 flex flex-col">
            <h2 className="font-semibold text-gray-900 mb-2">SLA Alert</h2>
            <p className="text-xs text-gray-400 mb-5">PENDING vaults over 3 days</p>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-3 ${slaCount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <ExclamationTriangleIcon className={`w-8 h-8 ${slaCount > 0 ? 'text-red-500' : 'text-green-400'}`} />
              </div>
              <p className={`text-4xl font-bold mb-1 ${slaCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{slaCount}</p>
              <p className="text-xs text-gray-400 text-center">
                {slaCount === 0 ? 'All vaults on time' : `vault${slaCount !== 1 ? 's' : ''} need attention`}
              </p>
            </div>
            {slaCount > 0 && (
              <Link href="/search?status=PENDING" className="mt-4 w-full text-center text-xs text-red-600 font-medium py-2 rounded-xl bg-red-50 hover:bg-red-100 transition-colors">
                View pending vaults →
              </Link>
            )}
          </motion.div>
        </div>

        {/* E7 — Recent Activity */}
        {recentBoxes.length > 0 && (
          <motion.div custom={9} variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
            <h2 className="font-semibold text-gray-900 mb-5">Recent Activity</h2>
            <div className="space-y-3">
              {recentBoxes.map((box) => {
                const created = parseDateOpt(box.created);
                const diffMs = created ? Date.now() - created.getTime() : 0;
                const diffH = Math.floor(diffMs / 3600000);
                const diffD = Math.floor(diffMs / 86400000);
                const ago = diffD > 0 ? `${diffD}d ago` : diffH > 0 ? `${diffH}h ago` : 'just now';
                const st = (box.estado || box.status || 'PENDING').toUpperCase();
                return (
                  <div key={box.box_id || box.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ArchiveBoxIcon className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{box.client_name || '—'}</p>
                      <p className="text-xs text-gray-400">{box.position || box.box_id}</p>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS_LIGHT[st] || 'bg-gray-100 text-gray-500'}`}>
                      {st}
                    </span>
                    <span className="flex-shrink-0 text-xs text-gray-300">{ago}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

