'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PaperAirplaneIcon, PauseIcon, PlayIcon, TrashIcon, UsersIcon, ClockIcon,
  ArrowRightOnRectangleIcon, ArrowPathIcon, XMarkIcon,
} from '@/components/icons';

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

interface ServiceStatus { ok: boolean; ms: number }
interface HealthData {
  pb: ServiceStatus;
  redis: ServiceStatus;
  brevo: ServiceStatus;
  allOk: boolean;
  uptime: number | null;
  historyCount: number;
  history: { ts: number; allOk: boolean; pb: ServiceStatus; redis: ServiceStatus; brevo: ServiceStatus }[];
  ts: number;
}

interface SecurityEvent {
  type: string;
  ip: string;
  detail: string;
  ts: number;
}
interface SecurityData {
  events: SecurityEvent[];
  stats: Record<string, number>;
  ts: number;
}

interface DbStatsData {
  users: number;
  companies: number;
  boxes: number;
  tasks: number;
  ts: number;
}

type Tab = 'pending' | 'active' | 'suspended' | 'rejected' | 'health' | 'security' | 'stats';

export default function AdminPage() {
  const router = useRouter();

  // ── Company management state (untouched) ──
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [tab, setTab] = useState<Tab>('pending');
  const [fetching, setFetching] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CompanyRecord | null>(null);
  const [error, setError] = useState('');
  const [successId, setSuccessId] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  // ── Monitoring state ──
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState('');

  const [securityData, setSecurityData] = useState<SecurityData | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState('');

  const [statsData, setStatsData] = useState<DbStatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');

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

  const fetchHealth = async () => {
    setHealthLoading(true);
    setHealthError('');
    try {
      const res = await fetch('/api/admin/health');
      if (!res.ok) throw new Error();
      setHealthData(await res.json());
    } catch {
      setHealthError('Failed to fetch health data.');
    } finally {
      setHealthLoading(false);
    }
  };

  const fetchSecurity = async () => {
    setSecurityLoading(true);
    setSecurityError('');
    try {
      const res = await fetch('/api/admin/security-events');
      if (!res.ok) throw new Error();
      setSecurityData(await res.json());
    } catch {
      setSecurityError('Failed to fetch security events.');
    } finally {
      setSecurityLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError('');
    try {
      const res = await fetch('/api/admin/db-stats');
      if (!res.ok) throw new Error();
      setStatsData(await res.json());
    } catch {
      setStatsError('Failed to fetch database stats.');
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const changeTab = (t: Tab) => {
    setTab(t);
    setSuccessId(null);
    if (t === 'health' && !healthData) fetchHealth();
    if (t === 'security' && !securityData) fetchSecurity();
    if (t === 'stats' && !statsData) fetchStats();
  };

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

  const fmtTime = (ts: number) => {
    try {
      return new Date(ts).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return '-'; }
  };

  const pending   = companies.filter(c => !c.approved && !c.suspended && !c.rejected);
  const active    = companies.filter(c => c.approved && !c.suspended);
  const suspended = companies.filter(c => c.suspended);
  const rejected  = companies.filter(c => c.rejected && !c.approved && !c.suspended);

  const companyTabs: { id: Tab; label: string; count: number; color: string }[] = [
    { id: 'pending',   label: 'Pending',   count: pending.length,   color: 'bg-amber-100 text-amber-700' },
    { id: 'active',    label: 'Active',    count: active.length,    color: 'bg-green-100 text-green-700' },
    { id: 'suspended', label: 'Suspended', count: suspended.length, color: 'bg-red-100 text-red-700' },
    { id: 'rejected',  label: 'Rejected',  count: rejected.length,  color: 'bg-gray-100 text-gray-600' },
  ];

  const monitorTabs: { id: Tab; label: string }[] = [
    { id: 'health',   label: 'Health' },
    { id: 'security', label: 'Security' },
    { id: 'stats',    label: 'Stats' },
  ];

  const listMap: Record<string, CompanyRecord[]> = { pending, active, suspended, rejected };
  const list = listMap[tab] ?? [];
  const isCompanyTab = ['pending', 'active', 'suspended', 'rejected'].includes(tab);

  // ── Service status badge ──
  const StatusBadge = ({ ok, ms }: ServiceStatus) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
      {ok ? 'Online' : 'Down'} {ok && ms > 0 && <span className="text-green-500/70">{ms}ms</span>}
    </span>
  );

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
              onClick={() => {
                if (tab === 'health') fetchHealth();
                else if (tab === 'security') fetchSecurity();
                else if (tab === 'stats') fetchStats();
                else fetchCompanies();
              }}
              disabled={fetching || healthLoading || securityLoading || statsLoading}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className={`w-4 h-4 ${(fetching || healthLoading || securityLoading || statsLoading) ? 'animate-spin' : ''}`} />
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

        {/* ── Company tabs ── */}
        <div className="flex flex-wrap gap-2 mb-2">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {companyTabs.map(t => (
              <button
                key={t.id}
                onClick={() => changeTab(t.id)}
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

          {/* ── Monitor tabs ── */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {monitorTabs.map(t => (
              <button
                key={t.id}
                onClick={() => changeTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Company management content (untouched) ── */}
        {isCompanyTab && (
          <>
            {truncated && (
              <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-xl px-4 py-3 mb-4">
                Showing first 200 companies only. Total may exceed this limit.
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
                <span className="flex-1">{error}</span>
                <button onClick={() => setError('')}><XMarkIcon className="w-4 h-4" /></button>
              </div>
            )}
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
                  <div key={company.id} className="bg-white rounded-2xl border border-gray-100 p-5">
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
          </>
        )}

        {/* ── Health tab ── */}
        {tab === 'health' && (
          <div className="mt-4 space-y-4">
            {healthLoading && (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {healthError && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
                {healthError}
              </div>
            )}
            {healthData && !healthLoading && (
              <>
                {/* Overall status */}
                <div className={`rounded-2xl border p-5 flex items-center gap-4 ${healthData.allOk ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${healthData.allOk ? 'bg-green-100' : 'bg-red-100'}`}>
                    {healthData.allOk ? '✓' : '!'}
                  </div>
                  <div>
                    <p className={`font-semibold ${healthData.allOk ? 'text-green-800' : 'text-red-800'}`}>
                      {healthData.allOk ? 'All systems operational' : 'One or more services are down'}
                    </p>
                    {healthData.uptime !== null && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        Uptime: <strong>{healthData.uptime}%</strong> ({healthData.historyCount} checks recorded)
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">Last checked: {fmtTime(healthData.ts)}</p>
                  </div>
                </div>

                {/* Service cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {([
                    { name: 'PocketBase (DB)', key: 'pb' },
                    { name: 'Redis (Upstash)', key: 'redis' },
                    { name: 'Brevo (Email)', key: 'brevo' },
                  ] as const).map(svc => {
                    const s = healthData[svc.key];
                    return (
                      <div key={svc.key} className="bg-white rounded-2xl border border-gray-100 p-4">
                        <p className="text-xs text-gray-400 mb-2">{svc.name}</p>
                        <StatusBadge {...s} />
                        {s.ms > 0 && (
                          <p className="text-xs text-gray-400 mt-2">{s.ms}ms response time</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* History mini-chart */}
                {healthData.history.length > 1 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <p className="text-xs font-medium text-gray-500 mb-3">Last {healthData.history.length} checks (newest → oldest)</p>
                    <div className="flex gap-1 flex-wrap">
                      {healthData.history.map((h, i) => (
                        <div
                          key={i}
                          title={`${fmtTime(h.ts)} — ${h.allOk ? 'OK' : 'DOWN'}`}
                          className={`w-5 h-5 rounded ${h.allOk ? 'bg-green-400' : 'bg-red-400'}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Green = all OK · Red = at least one service down</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Security tab ── */}
        {tab === 'security' && (
          <div className="mt-4 space-y-4">
            {securityLoading && (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {securityError && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
                {securityError}
              </div>
            )}
            {securityData && !securityLoading && (
              <>
                {/* Stats cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-400">Rate limit hits (last 7 days)</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{securityData.stats.rate_limit_hit || 0}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-400">Admin login failures (last 7 days)</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{securityData.stats.admin_login_failed || 0}</p>
                  </div>
                </div>

                {/* Events list */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-50">
                    <p className="text-sm font-medium text-gray-700">
                      Recent Events <span className="text-gray-400 font-normal">({securityData.events.length})</span>
                    </p>
                  </div>
                  {securityData.events.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">No security events recorded yet</div>
                  ) : (
                    <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                      {securityData.events.map((e, i) => (
                        <div key={i} className="px-5 py-3 flex items-start gap-3">
                          <span className={`mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                            e.type === 'admin_login_failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {e.type === 'admin_login_failed' ? 'Admin Login' : 'Rate Limit'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-600 truncate">{e.detail}</p>
                            <p className="text-xs text-gray-400 mt-0.5">IP: {e.ip} · {fmtTime(e.ts)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Stats tab ── */}
        {tab === 'stats' && (
          <div className="mt-4 space-y-4">
            {statsLoading && (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {statsError && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
                {statsError}
              </div>
            )}
            {statsData && !statsLoading && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {([
                    { label: 'Users', value: statsData.users },
                    { label: 'Companies', value: statsData.companies },
                    { label: 'Vaults', value: statsData.boxes },
                    { label: 'Tasks', value: statsData.tasks },
                  ]).map(({ label, value }) => (
                    <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
                        {value === -1 ? <span className="text-gray-300 text-base">N/A</span> : value.toLocaleString('en-US')}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 text-right">
                  Fetched: {fmtTime(statsData.ts)}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete confirm modal (untouched) */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[55] p-4"
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
