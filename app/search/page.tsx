'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Search, Building2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useSearchParams } from 'next/navigation';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  READY: 'bg-green-100 text-green-700',
  DELIVERED: 'bg-blue-100 text-blue-700',
};

function SearchContent() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (statusFilter) {
      setLoading(true);
      setSearched(true);
      setLabel(`Status: ${statusFilter}`);
      api.get(`/api/search/global?q=${statusFilter}`)
        .then(data => {
          const filtered = Array.isArray(data)
            ? data.filter((b: any) => (b.estado || b.status) === statusFilter)
            : [];
          setResults(filtered);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }
  }, [statusFilter]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.length < 2) return;
    setLoading(true);
    setSearched(true);
    setLabel(`"${query}"`);
    try {
      const data = await api.get(`/api/search/global?q=${encodeURIComponent(query)}`);
      setResults(Array.isArray(data) ? data : []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {statusFilter ? `${statusFilter} Volts` : 'Global Search'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Search across all warehouses</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Client name, packer, job type..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={query.length < 2}
            className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Search
          </button>
        </form>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && searched && (
          <div>
            <p className="text-sm text-gray-500 mb-4">{results.length} results for {label}</p>
            {results.length === 0 ? (
              <div className="text-center py-16 text-gray-400">No results found</div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Position</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Client</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Job Type</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Warehouse</th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((box, i) => (
                      <motion.tr
                        key={box.box_id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{box.position}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{box.client_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{box.job_type}</td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Building2 className="w-3.5 h-3.5" /> {box.warehouse_id}
                          </span>
                        </td>
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
