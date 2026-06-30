'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
import Link from 'next/link';
const STATUS_COLORS_LIGHT: Record<string, string> = {
  PENDING:   'bg-amber-50 text-amber-700',
  READY:     'bg-green-50 text-green-700',
  DELIVERED: 'bg-blue-50 text-blue-700',
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
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user?.company_id) return;
    const load = async () => {
      try {
        const [globalStats, allBoxes] = await Promise.allSettled([
          api.get('/api/stats/global'),
          api.get('/api/boxes'),
        ]);
        if (globalStats.status === 'fulfilled') setStats(globalStats.value);
        if (allBoxes.status === 'fulfilled' && Array.isArray(allBoxes.value)) setBoxes(allBoxes.value);
      } catch { /* stats unavailable, show zeros */ }

      try {
        const workOrders = await api.get('/api/work-orders');
        if (Array.isArray(workOrders)) {
          setWorkStats({
            total: workOrders.length,
            pending: workOrders.filter((w: any) => w.status === 'pending').length,
            in_progress: workOrders.filter((w: any) => w.status === 'in_progress').length,
            completed: workOrders.filter((w: any) => w.status === 'completed' || w.status === 'done').length,
          });
        }
      } catch { /* no work orders yet */ }

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

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  const iconBg: Record<string, string> = {
    blue: 'bg-blue-600',
    amber: 'bg-amber-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
  };

  // E1: 7-day vault histogram
  const histogramData = (() => {
    const days: { label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dateStr = d.toISOString().split('T')[0];
      const count = boxes.filter(b => {
        return b.created?.split(/[ T]/)[0] === dateStr;
      }).length;
      days.push({ label: key, count });
    }
    return days;
  })();

  // E7: recent activity (last 5 vaults by created date)
  const recentBoxes = [...boxes]
    .sort((a, b) => (b.created || '').localeCompare(a.created || ''))
    .slice(0, 5);

  // E6: SLA — PENDING vaults older than 3 days
  const slaCount = boxes.filter(b => {
    if ((b.estado || b.status) !== 'PENDING') return false;
    const created = parseDateOpt(b.created);
    if (!created) return false;
    return (Date.now() - created.getTime()) > 3 * 24 * 60 * 60 * 1000;
  }).length;

  const total = stats?.total_boxes || 0;
  const pending = stats?.statuses?.PENDING || 0;
  const ready = stats?.statuses?.READY || 0;
  const delivered = stats?.statuses?.DELIVERED || 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 pb-28 md:pb-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-gray-400 text-sm">{greeting()},</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            {user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{user?.company_name}</p>
        </motion.div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {overviewCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.label} custom={i} variants={fadeUp} initial="hidden" animate="show">
                <Link href={card.href}>
                  <div className={`bg-white rounded-2xl border p-5 hover:shadow-md transition-shadow cursor-pointer ${colorMap[card.color]}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${iconBg[card.color]}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                      {loading ? '—' : card.value}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{card.label}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Inventory Status */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-5">Inventory Status</h2>
            <div className="flex gap-6 mb-5">
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
                <div className="flex gap-4">
                  {Object.entries(stats.by_warehouse).map(([id, count]: any) => (
                    <div key={id} className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-gray-900">{count}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Warehouse {id}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Production Status */}
          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-gray-100 p-6">
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
          <motion.div custom={7} variants={fadeUp} initial="hidden" animate="show" className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-5">Vaults Added — Last 7 Days</h2>
            {boxes.length === 0 && !loading ? (
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
          <motion.div custom={8} variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
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
          <motion.div custom={9} variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-gray-100 p-6">
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

