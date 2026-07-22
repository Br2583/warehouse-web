'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon, BuildingOffice2Icon, FunnelIcon, XMarkIcon, ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useSearchParams, useRouter } from 'next/navigation';
import { STATUS_COLORS } from '@/lib/constants';

const JOB_TYPES = ['Fire', 'Water', 'Moving', 'Storage'];
const STATUSES  = ['PENDING', 'READY', 'DELIVERED'];

function SearchContent() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status');
  const router = useRouter();

  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [searched, setSearched]   = useState(false);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus]   = useState(statusFilter || '');
  const [filterJob, setFilterJob]         = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterPacker, setFilterPacker]   = useState('');

  const activeFilters = [filterStatus, filterJob, filterWarehouse, filterPacker].filter(Boolean).length;

  useEffect(() => {
    api.get('/api/warehouses')
      .then((d: any) => {
        const arr = Array.isArray(d) ? d : d?.warehouses || [];
        setWarehouses(arr.map((w: any) => ({ id: w.id || w.warehouse_id, name: w.name })));
      })
      .catch(() => {});
  }, []);

  const buildUrl = (q: string) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (filterStatus) params.set('status', filterStatus);
    if (filterJob) params.set('job_type', filterJob);
    if (filterWarehouse) params.set('warehouse_id', filterWarehouse);
    if (filterPacker) params.set('packer', filterPacker);
    return `/api/search/global?${params.toString()}`;
  };

  useEffect(() => {
    if (!statusFilter) return;
    setFilterStatus(statusFilter);
    runSearch('', statusFilter);
  }, [statusFilter]);

  const runSearch = async (q = query, st = filterStatus) => {
    setLoading(true);
    setSearched(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (st) params.set('status', st);
      if (filterJob) params.set('job_type', filterJob);
      if (filterWarehouse) params.set('warehouse_id', filterWarehouse);
      if (filterPacker) params.set('packer', filterPacker);
      const data = await api.get(`/api/search/global?${params.toString()}`);
      setResults(Array.isArray(data) ? data : []);
    } catch { setResults([]); setSearchError('Search failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); runSearch(); };

  const clearFilters = () => {
    setFilterStatus(''); setFilterJob(''); setFilterWarehouse(''); setFilterPacker('');
  };

  const whName = (wid: string) => warehouses.find(w => w.id === wid)?.name || wid;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 px-4 pb-28 md:px-8 md:pb-8 topbar-offset">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Global Search</h1>
          <p className="text-gray-500 text-sm mt-1">Search across all warehouses</p>
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
            Filters
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-gray-950 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Status */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Status</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">All statuses</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Job Type */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Job Type</label>
                  <select value={filterJob} onChange={e => setFilterJob(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">All types</option>
                    {JOB_TYPES.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>

                {/* Warehouse */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Warehouse</label>
                  <select value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">All warehouses</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>

                {/* Packer */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Packer</label>
                  <input
                    type="text" placeholder="Packer name..."
                    value={filterPacker} onChange={e => setFilterPacker(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">{results.length}</span> vault{results.length !== 1 ? 's' : ''} found
              </p>
              {results.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {filterStatus && <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">{filterStatus}</span>}
                  {filterJob    && <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">{filterJob}</span>}
                  {filterWarehouse && <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">{whName(filterWarehouse)}</span>}
                  {filterPacker && <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-medium">Packer: {filterPacker}</span>}
                </div>
              )}
            </div>

            {results.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">No vaults match your search</div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Position</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Client</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Job Type</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Warehouse</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Packer</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((box, i) => (
                      <motion.tr
                        key={box.box_id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.03, 0.4) }}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/warehouses/${box.warehouse_id}?vault=${box.box_id}`)}
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{box.position}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{box.client_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{box.job_type}</td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <BuildingOffice2Icon className="w-3.5 h-3.5 flex-shrink-0" />
                            {whName(box.warehouse_id)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{box.packer || '—'}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[box.estado || box.status] || 'bg-gray-100 text-gray-600'}`}>
                            {box.estado || box.status}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
