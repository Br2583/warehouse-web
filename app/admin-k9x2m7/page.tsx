'use client';

import { useEffect, useState } from 'react';
import { Send, Pause, Play, Trash2, Users, Clock, LogOut, RefreshCw, X, Lock } from 'lucide-react';

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

type Tab = 'pending' | 'active' | 'suspended';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [tab, setTab] = useState<Tab>('pending');
  const [fetching, setFetching] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CompanyRecord | null>(null);
  const [error, setError] = useState('');
  const [successId, setSuccessId] = useState<string | null>(null);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) { setLoginError('Contraseña incorrecta.'); return; }
      setAuthed(true);
    } catch {
      setLoginError('Error de red.');
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    setAuthed(false);
    setPassword('');
    setCompanies([]);
  };

  const fetchCompanies = async () => {
    setFetching(true);
    setError('');
    try {
      const res = await fetch('/api/admin/companies');
      if (res.status === 403) { setAuthed(false); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch {
      setError('No se pudieron cargar las empresas.');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (authed) fetchCompanies();
  }, [authed]);

  useEffect(() => {
    fetch('/api/admin/companies').then(r => {
      if (r.ok) { setAuthed(true); }
    }).catch(() => {});
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
      setError(action === 'send_code' ? 'No se pudo enviar el código.' : 'No se pudo ejecutar la acción.');
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
      setError('No se pudo eliminar la empresa.');
    } finally {
      setActionId(null);
    }
  };

  const fmt = (d: string) => {
    try {
      return new Date((d || '').replace(' ', 'T')).toLocaleDateString('es-AR', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch {
      return d || '-';
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 w-full max-w-sm shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Lock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Panel de Admin</h1>
              <p className="text-xs text-gray-400">Warehouse Manager</p>
            </div>
          </div>
          <form onSubmit={login} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {loginError && <p className="text-xs text-red-600">{loginError}</p>}
            <button
              type="submit"
              disabled={loginLoading || !password}
              className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loginLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pending   = companies.filter(c => !c.approved && !c.suspended);
  const active    = companies.filter(c => c.approved && !c.suspended);
  const suspended = companies.filter(c => c.suspended);

  const tabs: { id: Tab; label: string; count: number; color: string }[] = [
    { id: 'pending',   label: 'Pendientes', count: pending.length,   color: 'bg-amber-100 text-amber-700' },
    { id: 'active',    label: 'Activos',    count: active.length,    color: 'bg-green-100 text-green-700' },
    { id: 'suspended', label: 'Suspendidos', count: suspended.length, color: 'bg-red-100 text-red-700' },
  ];

  const list = tab === 'pending' ? pending : tab === 'active' ? active : suspended;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel de Admin</h1>
            <p className="text-sm text-gray-500 mt-1">Gestión de empresas</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCompanies}
              disabled={fetching}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Recargar"
            >
              <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir
            </button>
          </div>
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
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${t.color}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
          </div>
        )}

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
                          <span className="text-gray-400">Dueño:</span>{' '}
                          <span className="font-medium text-gray-700">{company.owner.name}</span>
                          {' · '}
                          <a href={`mailto:${company.owner.email}`} className="text-blue-600 hover:underline">
                            {company.owner.email}
                          </a>
                        </p>
                      )}
                      <p className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {company.members.length} miembro{company.members.length !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {fmt(company.created)}
                        </span>
                      </p>
                    </div>

                    {successId === company.id && (
                      <p className="text-xs text-green-600 mt-2 font-medium">
                        Código enviado a {company.owner?.email}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    {(tab === 'pending' || tab === 'active') && (
                      <button
                        onClick={() => doAction(company.id, 'send_code')}
                        disabled={actionId === company.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Enviar código
                      </button>
                    )}
                    {tab === 'active' && (
                      <button
                        onClick={() => doAction(company.id, 'suspend')}
                        disabled={actionId === company.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        Suspender
                      </button>
                    )}
                    {tab === 'suspended' && (
                      <button
                        onClick={() => doAction(company.id, 'reactivate')}
                        disabled={actionId === company.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-100 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Reactivar
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDelete(company)}
                      disabled={actionId === company.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar
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
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Eliminar empresa</h3>
                <p className="text-xs text-gray-400">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Se eliminará <strong>{confirmDelete.name}</strong> y todos sus usuarios ({confirmDelete.members.length} miembro{confirmDelete.members.length !== 1 ? 's' : ''}).
              {confirmDelete.owner?.email && ' El dueño recibirá un email.'}
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
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
