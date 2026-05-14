'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, ClipboardList, CheckCircle, Truck, Clock, Play, Check, Plus, Search, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const globalStats = await api.get('/api/stats/global');
        setStats(globalStats);
      } catch (e) { console.error('stats error', e); }

      // Try multiple possible endpoint names for work orders
      for (const path of ['/api/work-orders', '/api/production/orders', '/api/orders']) {
        try {
          const workOrders = await api.get(path);
          if (Array.isArray(workOrders)) {
            setWorkStats({
              total: workOrders.length,
              pending: workOrders.filter((w: any) => w.status === 'pending').length,
              in_progress: workOrders.filter((w: any) => w.status === 'in_progress').length,
              completed: workOrders.filter((w: any) => w.status === 'completed').length,
            });
            break;
          }
        } catch { /* try next */ }
      }

      setLoading(false);
    };
    load();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const overviewCards = [
    { label: 'Total Volts', value: stats?.total_boxes ?? 0, icon: Package, color: 'blue', href: '/warehouses' },
    { label: 'Work Orders', value: workStats.total, icon: ClipboardList, color: 'amber', href: '/production' },
    { label: 'Ready', value: stats?.statuses?.READY ?? 0, icon: CheckCircle, color: 'green', href: '/search?status=READY' },
    { label: 'Delivered', value: stats?.statuses?.DELIVERED ?? 0, icon: Truck, color: 'purple', href: '/search?status=DELIVERED' },
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

  const total = stats?.total_boxes || 0;
  const pending = stats?.statuses?.PENDING || 0;
  const ready = stats?.statuses?.READY || 0;
  const delivered = stats?.statuses?.DELIVERED || 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 pb-20 md:pb-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-gray-400 text-sm">{greeting()},</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            {user?.name?.split(‘ ‘)[0] || ‘User’} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">{user?.company_name}</p>
        </motion.div>

        {/* Overview Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
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

        <div className="grid grid-cols-3 gap-6 mb-8">
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
            <p className="text-xs text-gray-400 mt-2">{total} total volts across all warehouses</p>

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
                { label: 'Pending', value: workStats.pending, icon: Clock, color: 'text-gray-400 bg-gray-50' },
                { label: 'In Progress', value: workStats.in_progress, icon: Play, color: 'text-amber-500 bg-amber-50' },
                { label: 'Completed', value: workStats.completed, icon: Check, color: 'text-green-500 bg-green-50' },
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
        <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Add Volt', icon: Plus, href: '/warehouses', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
              { label: 'New Order', icon: ClipboardList, href: '/production', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
              { label: 'Search', icon: Search, href: '/search', color: 'bg-green-50 text-green-600 hover:bg-green-100' },
              { label: 'Chat', icon: MessageSquare, href: '/chat', color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
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
      </main>
    </div>
  );
}

