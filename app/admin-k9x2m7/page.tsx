'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PaperAirplaneIcon, PauseIcon, PlayIcon, TrashIcon, UsersIcon, ClockIcon,
  ArrowRightOnRectangleIcon, ArrowPathIcon, XMarkIcon,
} from '@heroicons/react/24/outline';

interface CompanyRecord {
  id: string;
  name: string;
  owner_id: string;
  approved: boolean;
  suspended: boolean;
  rejected: boolean;
  created: string;
  members: { id: string; name: string; email: string; role: string }[];
  owner: { id: string; name: string; email: string } | null;
}

type Tab = 'pending' | 'active' | 'suspended' | 'rejected';

export default function AdminPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [tab, setTab] = useState<Tab>('pending');
  const [fetching, setFetching] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CompanyRecord | null>(null);
  const [error, setError] = useState('');
  const [successId, setSuccessId] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.replace('/admin-k9x2m7/login');
  };

  const fetchCompanies = async () => {
    setFetching(true);
    setError('');
    try {
      const res = await fetch('/api/admin/companies');
      if (res.status === 403) { router.replace('/admin-k9x2m7/login'); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCompanies(data.companies || []);
      setTruncated(!!data.truncated);
    } catch {
      setError('Failed to load companies.');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const doAction = async (id: string, action: string) => {
    setActionId(id);
    setError('');
    setSuccessId(null);
    try {
      const res = await fetch(`/api/admin/companies/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      if (action === 'send_code') setSuccessId(id);
      await fetchCompanies();
    } catch {
      setError(action === 'send_code' ? 'Failed to send code.' : 'Failed to perform action.');
    } finally {
      setActionId(null);
    }
  };

  const doDelete = async (company: CompanyRecord) => {
    setActionId(company.id);
    setConfirmDelete(null);
    setError('');
    try {
      const res = await fetch(`/api/admin/companies/${company.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await fetchCompanies();
    } catch {
      setError('Failed to delete company.');
    } finally {
      setActionId(null);
    }
  };

  const fmt = (d: string) => {
    try {
      return new Date((d || '').replace(' ', 'T')).toLocaleDateString('en-US', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch {
      return d || '-';
    }
  };

  const pending   = companies.filter(c => !c.approved && !c.suspended && !c.rejected);
  const active    = companies.filter(c => c.approved && !c.suspended);
  const suspended = companies.filter(c => c.suspended);
  const rejected  = companies.filter(c => c.rejected && !c.approved && !c.suspended);

  const tabs: { id: Tab; label: string; count: number; color: string }[] = [
    { id: 'pending',   label: 'Pending',   count: pending.length,   color: 'bg-amber-100 text-amber-700' },
    { id: 'active',    label: 'Active',    count: active.length,    color: 'bg-green-100 text-green-700' },
    { id: 'suspended', label: 'Suspended', count: suspended.length, color: 'bg-red-100 text-red-700' },
    { id: 'rejected',  label: 'Rejected',  count: rejected.length,  color: 'bg-gray-100 text-gray-600' },
  ];

  const listMap: Record<Tab, CompanyRecord[]> = { pending, active, suspended, rejected };
  const list = listMap[tab] ?? [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500 mt-1">Company Management</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCompanies}
              disabled={fetching}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSuccessId(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${t.color}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Truncation warning */}
        {truncated && (
          <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-xl px-4 py-3 mb-4">
            ⚠ Showing first 200 companies only. Total may exceed this limit.
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')}><XMarkIcon className="w-4 h-4" /></button>
          </div>
        )}

        {/* List */}
        {fetching ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No companies in this category</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(company => (
              <div
                key={company.id}
                className="bg-white rounded-2xl border border-gray-100 p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">{company.name}</h3>
                    <div className="text-sm text-gray-500 space-y-0.5">
                      {company.owner && (
                        <p>
                          <span className="text-gray-400">Owner:</span>{' '}
                          <span className="font-medium text-gray-700">{company.owner.name}</span>
                          {' · '}
                          <a href={`mailto:${company.owner.email}`} className="text-blue-600 hover:underline">
                            {company.owner.email}
                          </a>
                        </p>
                      )}
                      <p className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <UsersIcon className="w-3.5 h-3.5" />
                          {company.members.length} member{company.members.length !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5" />
                          {fmt(company.created)}
                        </span>
                      </p>
                    </div>

                    {successId === company.id && (
                      <p className="text-xs text-green-600 mt-2 font-medium">
                        Code sent to {company.owner?.email}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    {tab === 'pending' && (
                      <>
                        <button
                          onClick={() => doAction(company.id, 'approve')}
                          disabled={actionId === company.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-100 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => doAction(company.id, 'reject')}
                          disabled={actionId === company.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-100 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          ✗ Reject
                        </button>
                      </>
                    )}
                    {(tab === 'pending' || tab === 'active') && (
                      <button
                        onClick={() => doAction(company.id, 'send_code')}
                        disabled={actionId === company.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        <PaperAirplaneIcon className="w-3.5 h-3.5" />
                        Send Code
                      </button>
                    )}
                    {tab === 'active' && (
                      <button
                        onClick={() => doAction(company.id, 'suspend')}
                        disabled={actionId === company.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                      >
                        <PauseIcon className="w-3.5 h-3.5" />
                        Suspend
                      </button>
                    )}
                    {tab === 'suspended' && (
                      <button
                        onClick={() => doAction(company.id, 'reactivate')}
                        disabled={actionId === company.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-100 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        <PlayIcon className="w-3.5 h-3.5" />
                        Reactivate
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDelete(company)}
                      disabled={actionId === company.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      Delete
                    </button>
                    {actionId === company.id && (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <TrashIcon className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Delete company</h3>
                <p className="text-xs text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              This will delete <strong>{confirmDelete.name}</strong> and all its users ({confirmDelete.members.length} member{confirmDelete.members.length !== 1 ? 's' : ''}).
              {confirmDelete.owner?.email && ' The owner will receive an email.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => doDelete(confirmDelete)}
                className="flex-1 py-2 text-sm text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
