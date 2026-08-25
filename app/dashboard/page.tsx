'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArchiveBoxIcon, ClipboardDocumentListIcon, CheckCircleIcon, TruckIcon,
  ClockIcon, PlayIcon, CheckIcon, PlusIcon, MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { parseDateOpt, timeAgo } from '@/lib/utils';
import { CountUp } from '@/components/CountUp';
import { ACTION_CONFIG } from '@/lib/activity-config';
import Sidebar from '@/components/Sidebar';
import { SkeletonDashboardCard } from '@/components/Skeleton';
import Link from 'next/link';

const STATUS_COLORS_LIGHT: Record<string, string> = {
  PENDING:   'bg-amber-50 text-amber-700',
  READY:     'bg-green-50 text-green-700',
  DELIVERED: 'bg-blue-50 text-blue-700',
};

const CARD_CFG: Record<string, { lightBg: string; accentColor: string; iconBg: string }> = {
  blue:   { lightBg: '#eff6ff', accentColor: '#1d4ed8', iconBg: 'bg-blue-600' },
  amber:  { lightBg: '#fffbeb', accentColor: '#b45309', iconBg: 'bg-amber-500' },
  green:  { lightBg: '#f0fdf4', accentColor: '#15803d', iconBg: 'bg-green-600' },
  purple: { lightBg: '#f5f3ff', accentColor: '#6d28d9', iconBg: 'bg-purple-600' },
};

const JOB_TYPE_CFG: Record<string, { label: string; dot: string; accent: string; bg: string }> = {
  Fire:    { label: 'Fire',    dot: 'bg-red-400',    accent: 'text-red-600',    bg: 'bg-red-50' },
  Water:   { label: 'Water',   dot: 'bg-blue-400',   accent: 'text-blue-600',   bg: 'bg-blue-50' },
  Moving:  { label: 'Moving',  dot: 'bg-amber-400',  accent: 'text-amber-600',  bg: 'bg-amber-50' },
  Storage: { label: 'Storage', dot: 'bg-gray-400',   accent: 'text-gray-600',   bg: 'bg-gray-100' },
  Other:   { label: 'Other',   dot: 'bg-purple-400', accent: 'text-purple-600', bg: 'bg-purple-50' },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' as const }
  }),
};

export default function DashboardPage() {
  const { user, canManage } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [workStats, setWorkStats] = useState({ total: 0, pending: 0, in_progress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [activityItems, setActivityItems] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    if (!user?.company_id) return;
    const load = async () => {
      const [globalStats, taskList] = await Promise.allSettled([
        api.get('/api/stats/global'),
        api.get('/api/tasks'),
      ]);

      if (globalStats.status === 'fulfilled') { setStats(globalStats.value); setStatsError(false); }
      else setStatsError(true);

      if (taskList.status === 'fulfilled' && Array.isArray(taskList.value)) {
        const t = taskList.value;
        setWorkStats({
          total:       t.length,
          pending:     t.filter((x: any) => x.status === 'PENDING').length,
          in_progress: t.filter((x: any) => x.status === 'IN_PROGRESS').length,
          completed:   t.filter((x: any) => x.status === 'DONE').length,
        });
      }
      setLoading(false);
    };
    load();
  }, [user?.company_id]);

  useEffect(() => {
    if (!canManage || !user?.company_id) { setActivityLoading(false); return; }
    api.get('/api/activity?perPage=5')
      .then((d: any) => setActivityItems(d.items || []))
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, [canManage, user?.company_id]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const overviewCards = [
    { label: 'Total Vaults', value: stats?.total_boxes ?? 0,          icon: ArchiveBoxIcon,           color: 'blue',   href: '/warehouses' },
    { label: 'Pending',      value: stats?.statuses?.PENDING ?? 0,    icon: ClockIcon,                color: 'amber',  href: '/search?status=PENDING' },
    { label: 'Ready',        value: stats?.statuses?.READY ?? 0,      icon: CheckCircleIcon,          color: 'green',  href: '/search?status=READY' },
    { label: 'Delivered',    value: stats?.statuses?.DELIVERED ?? 0,  icon: TruckIcon,                color: 'purple', href: '/search?status=DELIVERED' },
  ];

  const total     = stats?.total_boxes || 0;
  const pending   = stats?.statuses?.PENDING || 0;
  const ready     = stats?.statuses?.READY || 0;
  const delivered = stats?.statuses?.DELIVERED || 0;
  const attentionBoxes: any[] = stats?.attention || [];

  // Job types: only show types that have at least 1 vault, ordered by standard list
  const JOB_ORDER = ['Fire', 'Water', 'Moving', 'Storage', 'Other'];
  const jobTypes = stats?.job_types || {};
  const jobTypeEntries = JOB_ORDER
    .filter(k => jobTypes[k])
    .map(k => ({ key: k, count: jobTypes[k] as number }));
  // Also include any unknown types
  Object.entries(jobTypes).forEach(([k, v]) => {
    if (!JOB_ORDER.includes(k)) jobTypeEntries.push({ key: k, count: v as number });
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 px-4 pb-8 md:px-8 md:pb-8 topbar-offset">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 md:mb-8">
          <p className="text-gray-400 text-sm">{greeting()},</p>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mt-0.5">
            {user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{user?.company_name}</p>
        </motion.div>

        {/* Stats error banner */}
        {statsError && !loading && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-700 text-sm px-4 py-3 rounded-xl mb-4">
            <span className="flex-1">Could not load statistics. Numbers may be outdated.</span>
          </div>
        )}

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

        {/* Inventory Status */}
        <div className="mb-5 md:mb-8">
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
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
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(pending / total) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }} className="h-full bg-amber-400" />
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(ready / total) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }} className="h-full bg-green-400" />
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(delivered / total) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.7 }} className="h-full bg-blue-500" />
                </>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">{total} total vaults across all warehouses</p>

            {/* By Warehouse */}
            {stats?.by_warehouse && (
              <div className="mt-5 pt-5 border-t border-gray-50">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">By Warehouse</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(stats.by_warehouse).map(([whId, count]: any) => (
                    <div key={whId} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-gray-900">{count}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{stats?.wh_map?.[whId] || 'Warehouse'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Work Orders summary */}
            <div className="mt-5 pt-5 border-t border-gray-50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Work Orders</p>
                <Link href="/tasks" className="text-xs text-blue-600 font-medium hover:text-blue-800 transition-colors">View all →</Link>
              </div>
              <div className="flex items-center gap-4 md:gap-6">
                {[
                  { label: 'Pending',     value: workStats.pending,     color: 'text-gray-500',  dot: 'bg-gray-300' },
                  { label: 'In Progress', value: workStats.in_progress, color: 'text-amber-500', dot: 'bg-amber-400' },
                  { label: 'Done',        value: workStats.completed,   color: 'text-green-600', dot: 'bg-green-400' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
                    <span className="text-xs text-gray-400">{s.label}</span>
                    <span className={`text-sm font-bold ml-0.5 ${s.color}`}>{s.value}</span>
                  </div>
                ))}
                <span className="ml-auto text-xs text-gray-300">{workStats.total} total</span>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Quick Actions */}
        <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show" className="mb-5 md:mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Add Vault', icon: PlusIcon,                   href: '/warehouses',  color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
              { label: 'New Task',  icon: ClipboardDocumentListIcon,  href: '/tasks?new=1', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
              { label: 'Search',   icon: MagnifyingGlassIcon,        href: '/search',      color: 'bg-green-50 text-green-600 hover:bg-green-100' },
              { label: 'Chat',     icon: ChatBubbleLeftRightIcon,    href: '/chat',        color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
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

        {/* Job Types breakdown */}
        {jobTypeEntries.length > 0 && (
          <motion.div custom={7} variants={fadeUp} initial="hidden" animate="show" className="mb-5 md:mb-8">
            <h2 className="font-semibold text-gray-900 mb-4">By Job Type</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {jobTypeEntries.map(({ key, count }) => {
                const cfg = JOB_TYPE_CFG[key] || { label: key, dot: 'bg-gray-400', accent: 'text-gray-600', bg: 'bg-gray-100' };
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={key} className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5"
                    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{cfg.label}</span>
                    </div>
                    <p className={`text-3xl font-black tracking-tight ${cfg.accent}`}>{count}</p>
                    <div className="mt-3 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, delay: 0.4 }}
                        className={`h-full rounded-full ${cfg.dot}`}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">{pct}% of total</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Needs Attention — oldest PENDING vaults */}
        {attentionBoxes.length > 0 && (
          <motion.div custom={8} variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 mb-5 md:mb-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-gray-900">Needs Attention</h2>
                <p className="text-xs text-gray-400 mt-0.5">Oldest pending vaults</p>
              </div>
              <Link href="/search?status=PENDING" className="text-xs text-amber-600 font-medium hover:text-amber-800 transition-colors">
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {attentionBoxes.map((box) => {
                const created = parseDateOpt(box.created);
                const diffMs  = created ? Date.now() - created.getTime() : 0;
                const diffD   = Math.floor(diffMs / 86400000);
                const diffH   = Math.floor(diffMs / 3600000);
                const age     = diffD > 0 ? `${diffD}d` : diffH > 0 ? `${diffH}h` : 'today';
                const urgent  = diffD >= 3;
                const whName  = stats?.wh_map?.[box.warehouse_id] || '';
                return (
                  <Link
                    key={box.box_id}
                    href={box.warehouse_id ? `/warehouses/${box.warehouse_id}?vault=${box.box_id}` : '/search?status=PENDING'}
                  >
                    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-xl px-2 -mx-2 transition-colors cursor-pointer">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${urgent ? 'bg-red-50' : 'bg-amber-50'}`}>
                        <ClockIcon className={`w-4 h-4 ${urgent ? 'text-red-400' : 'text-amber-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{box.client_name || '—'}</p>
                        <p className="text-xs text-gray-400 truncate">{[box.position, whName].filter(Boolean).join(' · ')}</p>
                      </div>
                      <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${urgent ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                        {age}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Team Activity — canManage only */}
        {canManage && (
          <motion.div custom={9} variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Team Activity</h2>
              <Link href="/activity" className="text-xs text-blue-600 font-medium hover:text-blue-800 transition-colors">
                View all →
              </Link>
            </div>
            {activityLoading ? (
              <div className="py-6 flex justify-center"><div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" /></div>
            ) : activityItems.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No activity yet</p>
            ) : (
              <div className="space-y-0 divide-y divide-gray-50">
                {activityItems.map((item: any) => {
                  const cfg = ACTION_CONFIG[item.action] || ACTION_CONFIG.EDITED;
                  const ActionIcon = cfg.Icon;
                  return (
                    <div key={item.id} className="flex items-center gap-3 py-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <ActionIcon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">
                          <span className="font-medium">{item.user_name}</span>
                          {' '}<span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                        </p>
                        <p className="text-xs text-gray-400 truncate">{item.entity_label}</p>
                      </div>
                      <span className="text-xs text-gray-300 flex-shrink-0 ml-2">{timeAgo(item.created)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
