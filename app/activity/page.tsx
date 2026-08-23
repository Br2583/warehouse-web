'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardDocumentListIcon, ExclamationCircleIcon,
  FunnelIcon, ArrowUturnLeftIcon, ArrowUpTrayIcon,
  ChevronDownIcon, ChevronUpIcon, ArrowPathIcon,
} from '@/components/icons';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { ACTION_CONFIG } from '@/lib/activity-config';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ActivityItem {
  id: string;
  user_id: string;
  user_name: string;
  action: 'CREATED' | 'EDITED' | 'DELETED' | 'RESTORED' | 'MOVED';
  entity_type: 'vault' | 'storage' | 'task' | 'loose_item';
  entity_id: string;
  entity_label: string;
  before_data?: string;
  created: string;
}


const ENTITY_LABELS: Record<string, string> = {
  vault:      'vault',
  storage:    'storage unit',
  task:       'task',
  loose_item: 'loose item',
};

const PERIODS = [
  { value: '',       label: 'All time' },
  { value: 'today',  label: 'Today' },
  { value: 'week',   label: 'This week' },
  { value: 'month',  label: 'This month' },
];


function entityHref(item: ActivityItem) {
  if (item.entity_type === 'storage')    return `/storage/${item.entity_id}`;
  if (item.entity_type === 'task')       return '/tasks';
  if (item.entity_type === 'loose_item') return '/warehouses';
  // vault: parse before_data to get warehouse_id for a direct link
  try {
    const bd = item.before_data ? JSON.parse(item.before_data) : null;
    if (bd?.warehouse_id) return `/warehouses/${bd.warehouse_id}?vault=${item.entity_id}`;
  } catch { /* fall through */ }
  return `/vault/${item.entity_id}`;
}

function InitialAvatar({ name }: { name: string }) {
  const initial = (name || '?')[0].toUpperCase();
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500', 'bg-indigo-500'];
  const color = colors[initial.charCodeAt(0) % colors.length];
  return (
    <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center flex-shrink-0`}>
      <span className="text-white text-xs font-bold">{initial}</span>
    </div>
  );
}

export default function ActivityPage() {
  const { canManage, loading: authLoading } = useAuth();
  const router = useRouter();

  const [items, setItems]       = useState<ActivityItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadMore, setLoadMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [period, setPeriod]       = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [members, setMembers]     = useState<{ user_id: string; name: string }[]>([]);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Expand state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<Record<string, any>>({});
  const [expandingId, setExpandingId] = useState<string | null>(null);
  const [warehouseMap, setWarehouseMap] = useState<Record<string, string>>({});

  // Revert / Restore / Perm-delete state
  const [revertConfirm, setRevertConfirm] = useState<ActivityItem | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<ActivityItem | null>(null);
  const [permDeleteConfirm, setPermDeleteConfirm] = useState<ActivityItem | null>(null);
  const [reverting, setReverting] = useState(false);
  const [revertResult, setRevertResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!canManage) router.replace('/dashboard');
  }, [canManage, authLoading, router]);

  useEffect(() => {
    api.get('/api/company/members').then((ms: any[]) => setMembers(ms)).catch(() => {});
    api.get('/api/warehouses').then((whs: any[]) => {
      const map: Record<string, string> = {};
      (whs || []).forEach((w: any) => { map[w.id] = w.name; });
      setWarehouseMap(map);
    }).catch(() => {});
  }, []);

  async function handleExpandItem(item: ActivityItem) {
    if (expandedId === item.id) { setExpandedId(null); return; }
    setExpandedId(item.id);
    if (expandedData[item.id] || item.entity_type !== 'vault') return;

    if (item.before_data) {
      try {
        const parsed = JSON.parse(item.before_data);
        setExpandedData(d => ({ ...d, [item.id]: parsed }));
        return;
      } catch {}
    }

    // For non-deleted vaults try to fetch current data
    if (item.action !== 'DELETED') {
      setExpandingId(item.id);
      try {
        const vault = await api.get(`/api/boxes/${item.entity_id}`);
        if (vault) setExpandedData(d => ({ ...d, [item.id]: vault }));
      } catch {}
      finally { setExpandingId(null); }
      return;
    }

    // For deleted vaults with no before_data: parse entity_label as fallback
    // entity_label format: "Vault {row}{col}-L{level} · {client_name}"
    try {
      const label = item.entity_label || '';
      const match = label.match(/Vault\s+([A-J])(\d+)-L(\d+)\s+·\s+(.+)/);
      if (match) {
        setExpandedData(d => ({
          ...d,
          [item.id]: {
            client_name: match[4].trim(),
            row: match[1],
            column: Number(match[2]),
            level: Number(match[3]),
          },
        }));
      }
    } catch {}
  }

  const fetchActivity = useCallback(async (pageNum: number, append: boolean) => {
    setLoadError(null);
    if (append) setLoadMore(true); else setLoading(true);
    try {
      let url = `/api/activity?page=${pageNum}&perPage=25`;
      if (period)       url += `&period=${period}`;
      if (filterUser)   url += `&userId=${filterUser}`;
      if (actionFilter) url += `&action=${actionFilter}`;
      const data = await api.get(url);
      setItems(prev => append ? [...prev, ...(data.items || [])] : (data.items || []));
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.totalItems || 0);
      setPage(pageNum);
    } catch {
      setLoadError('Failed to load activity. Try again.');
    } finally {
      setLoading(false);
      setLoadMore(false);
    }
  }, [period, filterUser, actionFilter]);

  useEffect(() => {
    fetchActivity(1, false);
  }, [fetchActivity]);

  async function handleRevert() {
    if (!revertConfirm) return;
    setReverting(true);
    try {
      await api.put(`/api/activity/${revertConfirm.id}/revert`, {});
      setRevertResult({ id: revertConfirm.id, ok: true, msg: 'Vault reverted to its previous state.' });
      setRevertConfirm(null);
      fetchActivity(1, false);
    } catch (e: any) {
      setRevertResult({ id: revertConfirm.id, ok: false, msg: e?.message || 'Failed to revert. Try again.' });
      setRevertConfirm(null);
    } finally {
      setReverting(false);
    }
  }

  async function handleRestore() {
    if (!restoreConfirm) return;
    setReverting(true);
    try {
      await api.post(`/api/deleted-boxes/${restoreConfirm.entity_id}/restore`, {});
      setRevertResult({ id: restoreConfirm.id, ok: true, msg: 'Vault restored to inventory.' });
      setRestoreConfirm(null);
      fetchActivity(1, false);
    } catch (e: any) {
      setRevertResult({ id: restoreConfirm.id, ok: false, msg: e?.message || 'Failed to restore. The vault may have already been restored or permanently deleted.' });
      setRestoreConfirm(null);
    } finally {
      setReverting(false);
    }
  }

  async function handlePermDelete() {
    if (!permDeleteConfirm) return;
    setReverting(true);
    try {
      await api.delete(`/api/deleted-boxes/${permDeleteConfirm.entity_id}`);
      setRevertResult({ id: permDeleteConfirm.id, ok: true, msg: 'Vault permanently deleted.' });
      setPermDeleteConfirm(null);
      fetchActivity(1, false);
    } catch (e: any) {
      setRevertResult({ id: permDeleteConfirm.id, ok: false, msg: e?.message || 'Failed to permanently delete. Try again.' });
      setPermDeleteConfirm(null);
    } finally {
      setReverting(false);
    }
  }

  const canRevert = (item: ActivityItem) =>
    canManage && item.action === 'EDITED' && item.entity_type === 'vault' && !!item.before_data;

  const canRestore = (item: ActivityItem) =>
    canManage && item.action === 'DELETED' && item.entity_type === 'vault';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 px-4 pb-8 md:px-8 md:pb-8 topbar-offset">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
            {!loading && <p className="text-sm text-gray-400 mt-0.5">{totalItems} {totalItems === 1 ? 'event' : 'events'}</p>}
          </div>
          <button
            onClick={() => fetchActivity(1, false)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Refresh"
            title="Refresh"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
            <FunnelIcon className="w-3.5 h-3.5 text-gray-400" />
            <div className="flex gap-1">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                    period === p.value ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {members.length > 1 && (
            <select
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All people</option>
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>{m.name}</option>
              ))}
            </select>
          )}

          {/* Action filter chips */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1.5 flex-wrap">
            {(['', 'CREATED', 'EDITED', 'DELETED', 'RESTORED', 'MOVED'] as const).map(a => (
              <button
                key={a || 'all'}
                onClick={() => setActionFilter(a)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  actionFilter === a
                    ? a === 'DELETED' ? 'bg-red-500 text-white'
                      : a === 'RESTORED' ? 'bg-green-600 text-white'
                      : 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {a === '' ? 'All actions' : a.charAt(0) + a.slice(1).toLowerCase().replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Revert result banner */}
        {revertResult && (
          <div className={`flex items-center gap-3 text-sm px-4 py-3 rounded-xl mb-4 ${
            revertResult.ok
              ? 'bg-green-50 border border-green-100 text-green-700'
              : 'bg-red-50 border border-red-100 text-red-700'
          }`}>
            <span className="flex-1">{revertResult.msg}</span>
            <button onClick={() => setRevertResult(null)} className="text-xs font-medium underline">Dismiss</button>
          </div>
        )}

        {/* Error */}
        {loadError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
            <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{loadError}</span>
            <button onClick={() => fetchActivity(1, false)} className="text-xs font-medium underline">Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && !loadError && items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <ClipboardDocumentListIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No activity yet</p>
            <p className="text-sm mt-1">Actions on vaults, loose items, storage and tasks will appear here</p>
          </div>
        )}

        {/* Feed */}
        {!loading && items.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {items.map((item, i) => {
              const cfg = ACTION_CONFIG[item.action] || ACTION_CONFIG.EDITED;
              const ActionIcon = cfg.Icon;
              const href = entityHref(item);
              const showRevert  = canRevert(item);
              const showRestore = canRestore(item);
              const isVault = item.entity_type === 'vault';
              const isExpanded = expandedId === item.id;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group">
                    {isVault ? (
                      <button
                        onClick={() => handleExpandItem(item)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <InitialAvatar name={item.user_name} />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                            <span className="text-sm font-semibold text-gray-900 truncate">{item.user_name}</span>
                            <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}>
                              <ActionIcon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                            <span className="text-xs text-gray-500 truncate max-w-[240px] sm:max-w-none">{ENTITY_LABELS[item.entity_type]}</span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{item.entity_label}</p>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{timeAgo(item.created)}</span>
                      </button>
                    ) : (
                      <Link href={href} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                        <InitialAvatar name={item.user_name} />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                            <span className="text-sm font-semibold text-gray-900 truncate">{item.user_name}</span>
                            <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}>
                              <ActionIcon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                            <span className="text-xs text-gray-500 truncate max-w-[240px] sm:max-w-none">{ENTITY_LABELS[item.entity_type]}</span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{item.entity_label}</p>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{timeAgo(item.created)}</span>
                      </Link>
                    )}
                    {isVault && (
                      <button
                        onClick={() => handleExpandItem(item)}
                        className="flex-shrink-0 p-1 text-gray-300 hover:text-gray-500 rounded transition-colors"
                      >
                        {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                      </button>
                    )}
                    {showRestore && (
                      <>
                        <button
                          onClick={() => { setRevertResult(null); setRestoreConfirm(item); }}
                          title="Restore this vault back to inventory"
                          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                          Restore
                        </button>
                        <button
                          onClick={() => { setRevertResult(null); setPermDeleteConfirm(item); }}
                          title="Permanently delete this vault — cannot be undone"
                          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Permanently Delete
                        </button>
                      </>
                    )}
                    {showRevert && (
                      <button
                        onClick={() => { setRevertResult(null); setRevertConfirm(item); }}
                        title="Revert vault to its previous state"
                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                        Revert
                      </button>
                    )}
                  </div>
                  {/* Expanded vault detail */}
                  {isExpanded && isVault && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                      {expandingId === item.id && (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <div className="w-3 h-3 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                          Loading details...
                        </div>
                      )}
                      {expandedData[item.id] && (() => {
                        const d = expandedData[item.id];
                        const wName = warehouseMap[d.warehouse_id] || '';
                        const level = d.level === 2 ? 'Upper' : 'Lower';
                        const pos = d.row && d.column ? `Row ${d.row}, Col ${d.column} · ${level}` : '';
                        return (
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                            {d.client_name && (
                              <><span className="text-gray-400">Client</span><span className="text-gray-700 font-medium truncate">{d.client_name}</span></>
                            )}
                            {pos && (
                              <><span className="text-gray-400">Position</span><span className="text-gray-700 font-medium">{pos}</span></>
                            )}
                            {wName && (
                              <><span className="text-gray-400">Warehouse</span><span className="text-gray-700 font-medium truncate">{wName}</span></>
                            )}
                            {d.job_type && (
                              <><span className="text-gray-400">Type</span><span className="text-gray-700 font-medium">{d.job_type}</span></>
                            )}
                            {(d.estado || d.status) && (
                              <><span className="text-gray-400">Status</span><span className="text-gray-700 font-medium">{d.estado || d.status}</span></>
                            )}
                          </div>
                        );
                      })()}
                      {!expandingId && !expandedData[item.id] && (
                        <p className="text-xs text-gray-400">No details available</p>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {!loading && page < totalPages && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => fetchActivity(page + 1, true)}
              disabled={loadMore}
              className="flex items-center gap-2 px-5 py-2 bg-white border border-gray-200 text-sm text-gray-600 font-medium rounded-full hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {loadMore && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
              Load more
            </button>
          </div>
        )}
      </main>

      {/* Restore confirm modal */}
      {restoreConfirm && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <ArrowUpTrayIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Restore this vault?</h3>
                <p className="text-xs text-gray-500 mt-1">
                  The vault will be moved back to active inventory in its original warehouse and position.
                </p>
                <p className="text-xs font-medium text-gray-700 mt-2 bg-gray-50 rounded-lg px-3 py-2 truncate">
                  {restoreConfirm.entity_label}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRestoreConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={reverting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {reverting && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />}
                {reverting ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanently Delete confirm modal */}
      {permDeleteConfirm && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <ExclamationCircleIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Permanently delete this vault?</h3>
                <p className="text-xs text-gray-500 mt-1">
                  This cannot be undone. All data and photos for this vault will be destroyed.
                </p>
                <p className="text-xs font-medium text-gray-700 mt-2 bg-gray-50 rounded-lg px-3 py-2 truncate">
                  {permDeleteConfirm.entity_label}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPermDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePermDelete}
                disabled={reverting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {reverting && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />}
                {reverting ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revert confirm modal */}
      {revertConfirm && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <ArrowUturnLeftIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Revert this vault?</h3>
                <p className="text-xs text-gray-500 mt-1">
                  This will restore the vault to the state it was in before this edit. The current data will be overwritten.
                </p>
                <p className="text-xs font-medium text-gray-700 mt-2 bg-gray-50 rounded-lg px-3 py-2 truncate">
                  {revertConfirm.entity_label}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRevertConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRevert}
                disabled={reverting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {reverting && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />}
                {reverting ? 'Reverting…' : 'Revert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
