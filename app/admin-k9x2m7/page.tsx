'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Pause, Play, Trash2, Users, Clock, ShieldOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { pb } from '@/lib/pb';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'nreply.warehousemanager529@gmail.com';

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

type Tab = 'pending' | 'active' | 'blocked';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [tab, setTab] = useState<Tab>('pending');
  const [fetching, setFetching] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CompanyRecord | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user?.email !== ADMIN_EMAIL) {
      router.replace('/dashboard');
    }
  }, [user, loading]);

  const fetchCompanies = async () => {
    setFetching(true);
    setError('');
    try {
      const token = pb.authStore.token;
      const res = await fetch('/api/admin/companies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch {
      setError('Could not load companies.');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) fetchCompanies();
  }, [user]);

  const doAction = async (id: string, action: string) => {
    setActionId(id);
    setError('');
    try {
      const token = pb.authStore.token;
      const res = await fetch(`/api/admin/companies/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Action failed');
      await fetchCompanies();
    } catch {
      setError(`Failed to ${action}. Try again.`);
    } finally {
      setActionId(null);
    }
  };

  const doDelete = async (company: CompanyRecord) => {
    setActionId(company.id);
    setConfirmDelete(null);
    setError('');
    try {
      const token = pb.authStore.token;
      const res = await fetch(`/api/admin/companies/${company.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      await fetchCompanies();
    } catch {
      setError('Failed to delete. Try again.');
    } finally {
      setActionId(null);
    }
  };

  if (loading || !user) return null;
  if (user.email !== ADMIN_EMAIL) return null;

  const pending  = companies.filter(c => !c.approved && !c.rejected);
  const active   = companies.filter(c => c.approved && !c.suspended);
  const blocked  = companies.filter(c => c.suspended || c.rejected);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'pending',  label: 'Pendientes', count: pending.length },
    { id: 'active',   label: 'Activos',    count: active.length },
    { id: 'blocked',  label: 'Bloqueados', count: blocked.length },
  ];

  const list = tab === 'pending' ? pending : tab === 'active' ? active : blocked;

  const fmt = (d: string) => new Date(d.replace(' ', 'T')).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de empresas y accesos</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  t.id === 'pending' ? 'bg-amber-100 text-amber-700' :
                  t.id === 'active'  ? 'bg-green-100 text-green-700' :
                                       'bg-red-100 text-red-700'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4"
            >
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        {fetching ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No hay empresas en esta categoría</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(company => (
              <motion.div
                key={company.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{company.name}</h3>
                      {company.suspended && (
                        <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full">Suspendida</span>
                      )}
                      {company.rejected && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Rechazada</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 space-y-0.5">
                      {company.owner && (
                        <p><span className="text-gray-400">Dueño:</span> {company.owner.name} · {company.owner.email}</p>
                      )}
                      <p className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{company.members.length} miembro{company.members.length !== 1 ? 's' : ''}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmt(company.created)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {tab === 'pending' && (
                      <>
                        <button
                          onClick={() => doAction(company.id, 'approve')}
                          disabled={actionId === company.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-100 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Aprobar
                        </button>
                        <button
                          onClick={() => doAction(company.id, 'reject')}
                          disabled={actionId === company.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          Rechazar
                        </button>
                      </>
                    )}
                    {tab === 'active' && (
                      <>
                        <button
                          onClick={() => doAction(company.id, 'suspend')}
                          disabled={actionId === company.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          Suspender
                        </button>
                        <button
                          onClick={() => setConfirmDelete(company)}
                          disabled={actionId === company.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      </>
                    )}
                    {tab === 'blocked' && (
                      <button
                        onClick={() => doAction(company.id, 'reactivate')}
                        disabled={actionId === company.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Reactivar
                      </button>
                    )}
                    {actionId === company.id && (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Eliminar empresa</h3>
                  <p className="text-xs text-gray-400">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Se eliminará <strong>{confirmDelete.name}</strong> y todos sus usuarios ({confirmDelete.members.length} miembro{confirmDelete.members.length !== 1 ? 's' : ''}).
                El dueño recibirá un email de notificación.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => doDelete(confirmDelete)}
                  className="flex-1 py-2 text-sm text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors font-medium"
                >
                  Eliminar todo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
