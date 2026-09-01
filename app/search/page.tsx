'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon, BuildingOffice2Icon, FunnelIcon, XMarkIcon,
  ExclamationCircleIcon, ChevronDownIcon, ArchiveBoxIcon,
} from '@/components/icons';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useSearchParams, useRouter } from 'next/navigation';
import { STATUS_COLORS } from '@/lib/constants';
import { usePhotoToken, photoUrl } from '@/lib/photo-url';
import { ItemCountsSummary } from '@/components/ItemCounts';
import { parseCounts } from '@/lib/item-counts';

const JOB_TYPES = ['Fire', 'Water', 'Mold', 'Moving', 'Storage'];
const STATUSES  = ['PENDING', 'READY', 'DELIVERED'];

function formatDate(d: string) {
  if (!d) return '';
  try { return new Date(d.split(/[ T]/)[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}

type Grouped<T> = { client: string; items: T[] };
function groupByClient<T extends { client_name?: string }>(items: T[]): Grouped<T>[] {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const c = (it.client_name || '').trim() || '—';
    if (!map.has(c)) map.set(c, []);
    map.get(c)!.push(it);
  }
  return Array.from(map, ([client, items]) => ({ client, items }));
}

const statusBadge = (s: string) =>
  `text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_COLORS[s] || 'bg-gray-100 text-gray-600'}`;

// ── One vault, expanded ─────────────────────────────────────────────────────
function VaultRow({ box, photoToken, whName, onPhoto, onOpen }: {
  box: any; photoToken: string; whName: (id: string) => string;
  onPhoto: (url: string) => void; onOpen: () => void;
}) {
  const rec = { id: box.box_id, collectionName: 'vaults' };
  const photos: string[] = box.photos || [];
  const meta: [string, string][] = [
    ['Job', box.job_type],
    ['Condition', Array.isArray(box.vault_status) ? box.vault_status.join(', ') : ''],
    ['Room', Array.isArray(box.room_location) ? box.room_location.join(', ') : ''],
    ['Packer', box.packer],
    ['Packed', formatDate(box.pack_date)],
  ];
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-gray-900">{box.position}</span>
          <span className="text-xs text-gray-400 ml-2">{whName(box.warehouse_id)}</span>
        </div>
        <span className={statusBadge(box.estado || box.status)}>{box.estado || box.status}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
        {meta.filter(([, v]) => v).map(([k, v]) => (
          <span key={k}>{k}: <span className="text-gray-700">{v}</span></span>
        ))}
      </div>
      <ItemCountsSummary value={parseCounts(box.item_counts)} compact />
      {photos.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
          {photos.map((p, i) => (
            <img key={i} src={photoUrl(rec, p, 'grid', photoToken)} alt=""
              onClick={() => onPhoto(photoUrl(rec, p, 'full', photoToken))}
              className="w-full h-16 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity" />
          ))}
        </div>
      )}
      <button onClick={onOpen}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
        <ArchiveBoxIcon className="w-4 h-4" /> Open vault
      </button>
    </div>
  );
}

// ── One storage unit, expanded ──────────────────────────────────────────────
function StorageRow({ su, photoToken, onPhoto, onOpen }: {
  su: any; photoToken: string; onPhoto: (url: string) => void; onOpen: () => void;
}) {
  const rec = su.photo_ref || { id: su.id, collectionName: 'storage_units' };
  const photos: string[] = su.photos || [];
  const meta: [string, string][] = [
    ['Condition', Array.isArray(su.condition) ? su.condition.join(', ') : ''],
    ['Contents', su.content_type],
    ['Job', su.job_type],
    ['Packer', su.packer],
    ['Location', [su.city, su.state].filter(Boolean).join(', ')],
    ['Intake', formatDate(su.intake_date)],
  ];
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-semibold text-gray-900">{su.unit_name || '—'}</span>
        <span className={statusBadge(su.estado)}>{su.estado || '—'}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
        {meta.filter(([, v]) => v).map(([k, v]) => (
          <span key={k}>{k}: <span className="text-gray-700">{v}</span></span>
        ))}
      </div>
      <ItemCountsSummary value={parseCounts(su.item_counts)} compact />
      {photos.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
          {photos.map((p, i) => (
            <img key={i} src={photoUrl(rec, p, 'grid', photoToken)} alt=""
              onClick={() => onPhoto(photoUrl(rec, p, 'full', photoToken))}
              className="w-full h-16 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity" />
          ))}
        </div>
      )}
      <button onClick={onOpen}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
        <BuildingOffice2Icon className="w-4 h-4" /> Open storage
      </button>
    </div>
  );
}

// ── Collapsible client group ────────────────────────────────────────────────
function ClientGroup({ client, count, sub, thumbs, photoToken, open, onToggle, children }: {
  client: string; count: number; sub: string;
  thumbs: { rec: any; name: string }[]; photoToken: string;
  open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors">
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{client}</p>
          <p className="text-xs text-gray-400 truncate">{count} {count === 1 ? 'item' : 'items'}{sub ? ` · ${sub}` : ''}</p>
        </div>
        {thumbs.length > 0 && (
          <div className="flex -space-x-2 flex-shrink-0">
            {thumbs.map((t, i) => (
              <img key={i} src={photoUrl(t.rec, t.name, 'tile', photoToken)} alt=""
                className="w-9 h-9 rounded-lg object-cover border-2 border-white bg-gray-100" />
            ))}
          </div>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t border-gray-100 divide-y divide-gray-50">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status');
  const jobTypeFilter = searchParams.get('jobType');
  const router = useRouter();
  const photoToken = usePhotoToken();

  const [query, setQuery]                     = useState(searchParams.get('q') || '');
  const [results, setResults]                 = useState<any[]>([]);
  const [storageResults, setStorageResults]   = useState<any[]>([]);
  const [looseResults, setLooseResults]       = useState<any[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [searched, setSearched]               = useState(false);
  const [warehouses, setWarehouses]           = useState<{ id: string; name: string }[]>([]);
  const [showFilters, setShowFilters]         = useState(!!(statusFilter || jobTypeFilter));
  const [searchError, setSearchError]         = useState<string | null>(null);
  const [expanded, setExpanded]               = useState<Record<string, boolean>>({});
  const [lightbox, setLightbox]               = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus]       = useState(statusFilter || '');
  const [filterJob, setFilterJob]             = useState(jobTypeFilter || '');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterPacker, setFilterPacker]       = useState('');

  const activeFilters = [filterStatus, filterJob, filterWarehouse, filterPacker].filter(Boolean).length;

  useEffect(() => {
    api.get('/api/warehouses')
      .then((d: any) => {
        const arr = Array.isArray(d) ? d : d?.warehouses || [];
        setWarehouses(arr.map((w: any) => ({ id: w.id || w.warehouse_id, name: w.name })));
      })
      .catch(() => {});
  }, []);

  const applyResults = (data: any) => {
    setResults(Array.isArray(data) ? data : (data?.vaults ?? []));
    setStorageResults(Array.isArray(data) ? [] : (data?.storageUnits ?? []));
    setLooseResults(Array.isArray(data) ? [] : (data?.looseItems ?? []));
    setExpanded({}); // reset collapse state for a new result set
  };

  useEffect(() => {
    if (!statusFilter || query.length >= 2) return;
    runSearch('', statusFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (!jobTypeFilter || query.length >= 2) return;
    runSearch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobTypeFilter]);

  // Live search — debounced, min 2 chars
  useEffect(() => {
    if (query.length < 2) return;
    const params = new URLSearchParams();
    params.set('q', query);
    if (filterStatus)    params.set('status', filterStatus);
    if (filterJob)       params.set('job_type', filterJob);
    if (filterWarehouse) params.set('warehouse_id', filterWarehouse);
    if (filterPacker)    params.set('packer', filterPacker);
    const t = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      setSearchError(null);
      try {
        applyResults(await api.get(`/api/search/global?${params.toString()}`));
      } catch {
        setResults([]); setStorageResults([]); setLooseResults([]);
        setSearchError('Search failed. Please try again.');
      } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query, filterStatus, filterJob, filterWarehouse, filterPacker]);

  const runSearch = async (q = query, st = filterStatus) => {
    setLoading(true);
    setSearched(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams();
      if (q)               params.set('q', q);
      if (st)              params.set('status', st);
      if (filterJob)       params.set('job_type', filterJob);
      if (filterWarehouse) params.set('warehouse_id', filterWarehouse);
      if (filterPacker)    params.set('packer', filterPacker);
      applyResults(await api.get(`/api/search/global?${params.toString()}`));
    } catch {
      setResults([]); setStorageResults([]); setLooseResults([]);
      setSearchError('Search failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); runSearch(); };
  const clearFilters = () => { setFilterStatus(''); setFilterJob(''); setFilterWarehouse(''); setFilterPacker(''); };
  const whName = (wid: string) => warehouses.find(w => w.id === wid)?.name || wid;

  const vaultGroups   = useMemo(() => groupByClient(results), [results]);
  const storageGroups = useMemo(() => groupByClient(storageResults), [storageResults]);
  const totalResults  = results.length + storageResults.length + looseResults.length;

  const isOpen = (key: string, def: boolean) => (key in expanded ? expanded[key] : def);
  const toggle = (key: string, def: boolean) => setExpanded(e => ({ ...e, [key]: !isOpen(key, def) }));

  const collectThumbs = (items: any[], recOf: (it: any) => any) => {
    const out: { rec: any; name: string }[] = [];
    for (const it of items) for (const p of (it.photos || [])) { if (out.length < 4) out.push({ rec: recOf(it), name: p }); }
    return out;
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 px-4 pb-8 md:px-8 md:pb-8 topbar-offset">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Client name, packer, position, comments..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className={`relative px-4 py-3 rounded-xl border text-sm font-medium transition-colors flex items-center gap-2
              ${showFilters || activeFilters > 0
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-100 hover:border-blue-300'}`}
          >
            <FunnelIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
          <button
            type="submit"
            className="px-5 py-3 bg-gray-950 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Job Status</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">All statuses</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Job Type</label>
                  <select value={filterJob} onChange={e => setFilterJob(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">All types</option>
                    {JOB_TYPES.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Warehouse</label>
                  <select value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">All warehouses</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Packer</label>
                  <input type="text" placeholder="Packer name..." value={filterPacker} onChange={e => setFilterPacker(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {activeFilters > 0 && (
                  <div className="col-span-2 md:col-span-4 flex justify-end">
                    <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium">
                      <XMarkIcon className="w-3.5 h-3.5" /> Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {searchError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
            <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{searchError}</span>
            <button onClick={() => setSearchError(null)} className="text-red-400 hover:text-red-600"><XMarkIcon className="w-4 h-4" /></button>
          </div>
        )}

        {!loading && searched && (
          totalResults === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No results match your search</div>
          ) : (
            <div className="space-y-6">

              {/* ── Vaults grouped by client ── */}
              {vaultGroups.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-900">{results.length}</span> vault{results.length !== 1 ? 's' : ''}
                    <span className="text-gray-400"> · {vaultGroups.length} client{vaultGroups.length !== 1 ? 's' : ''}</span>
                  </p>
                  {vaultGroups.map(g => {
                    const key = 'v:' + g.client;
                    const def = vaultGroups.length === 1;
                    const jobs = [...new Set(g.items.map((b: any) => b.job_type).filter(Boolean))].join(', ');
                    return (
                      <ClientGroup key={key} client={g.client} count={g.items.length} sub={jobs}
                        thumbs={collectThumbs(g.items, (b: any) => ({ id: b.box_id, collectionName: 'vaults' }))}
                        photoToken={photoToken} open={isOpen(key, def)} onToggle={() => toggle(key, def)}>
                        {g.items.map((box: any) => (
                          <VaultRow key={box.box_id} box={box} photoToken={photoToken} whName={whName}
                            onPhoto={setLightbox}
                            onOpen={() => router.push(`/warehouses/${box.warehouse_id}?vault=${box.box_id}`)} />
                        ))}
                      </ClientGroup>
                    );
                  })}
                </div>
              )}

              {/* ── Storage grouped by client ── */}
              {storageGroups.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Storage Units <span className="text-gray-400 font-normal">· {storageResults.length}</span>
                  </h2>
                  {storageGroups.map(g => {
                    const key = 's:' + g.client;
                    const def = storageGroups.length === 1;
                    return (
                      <ClientGroup key={key} client={g.client} count={g.items.length} sub="storage"
                        thumbs={collectThumbs(g.items, (s: any) => s.photo_ref || { id: s.id, collectionName: 'storage_units' })}
                        photoToken={photoToken} open={isOpen(key, def)} onToggle={() => toggle(key, def)}>
                        {g.items.map((su: any) => (
                          <StorageRow key={su.id} su={su} photoToken={photoToken}
                            onPhoto={setLightbox} onOpen={() => router.push(`/storage/${su.id}`)} />
                        ))}
                      </ClientGroup>
                    );
                  })}
                </div>
              )}

              {/* ── Loose items — compact list ── */}
              {looseResults.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Loose Items <span className="text-gray-400 font-normal">· {looseResults.length}</span>
                  </h2>
                  <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                    {looseResults.map((item: any) => (
                      <button key={item.id} onClick={() => router.push(`/warehouses/${item.warehouse_id}?tab=loose&zone=${item.grid_x}-${item.grid_y}`)}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.client_name || '—'}</p>
                          <p className="text-xs text-gray-400">
                            {item.item_type === 'Furniture' ? (item.furniture_type || 'Furniture') : 'Boxes'} · {whName(item.warehouse_id)} · Zone {item.grid_x}-{item.grid_y}
                          </p>
                        </div>
                        <span className={statusBadge(item.status)}>{item.status || '—'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )
        )}

        {!searched && (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MagnifyingGlassIcon className="w-7 h-7 text-blue-400" />
            </div>
            <p className="text-gray-400 text-sm">Type to search, or use filters to browse</p>
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen bg-gray-50 items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
