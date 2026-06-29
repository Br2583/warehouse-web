'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Copy, Plus, AlertCircle, X, LogOut, Shield } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [genError, setGenError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/company/info'),
      api.get('/api/company/members'),
    ]).then(([c, m]) => { setCompany(c); setMembers(m); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const generateCode = async () => {
    setGenError('');
    try {
      await api.post('/api/company/generate-code', {});
      const c = await api.get('/api/company/info');
      setCompany(c);
    } catch (err: any) {
      setGenError(err?.message || 'Failed to generate invitation code');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            <p className="text-gray-500 text-sm mt-1">Account and company settings</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-100 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* User Info */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-4">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                  />
                ) : null}
                <div className={`w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0${user?.picture ? ' hidden' : ''}`}>
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{user?.name}</h2>
                  <p className="text-gray-500 text-sm">{user?.email}</p>
                  <span className="inline-block mt-1 text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full capitalize">{user?.role}</span>
                </div>
              </div>
            </motion.div>

            {/* Company */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium text-gray-900">{company?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Members</span>
                  <span className="font-medium text-gray-900">{company?.member_count} / {company?.max_members}</span>
                </div>
              </div>
              {company?.is_owner && (
                <button onClick={generateCode}
                  className="mt-4 flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" /> Generate Invitation Code
                </button>
              )}
              <AnimatePresence>
                {genError && (
                  <motion.div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{genError}</span>
                    <button onClick={() => setGenError('')}><X className="w-4 h-4" /></button>
                  </motion.div>
                )}
              </AnimatePresence>
              {company?.active_invitation_codes?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-2">Active codes:</p>
                  <div className="flex flex-wrap gap-2">
                    {company.active_invitation_codes.map((code: string) => (
                      <div key={code} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                        <span className="text-sm font-mono font-medium text-gray-700">{code}</span>
                        <button onClick={() => navigator.clipboard.writeText(code)} className="text-gray-400 hover:text-blue-500">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Members */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Team Members</h3>
              <div className="space-y-3">
                {members.map(m => (
                  <div key={m.user_id} className="flex items-center gap-3">
                    {m.picture ? (
                      <img
                        src={m.picture}
                        alt={m.name}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                      />
                    ) : null}
                    <div className={`w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0${m.picture ? ' hidden' : ''}`}>
                      <span className="text-sm font-bold text-gray-500">{m.name?.[0]}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.email}</p>
                    </div>
                    <span className="text-xs capitalize text-gray-400">{m.role}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Admin panel link — only visible to the platform admin */}
            {user?.id === 'ezcrajrmevn36cu' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-purple-500" />
                  <h3 className="font-semibold text-gray-900">Administration</h3>
                </div>
                <p className="text-xs text-gray-400 mb-4">Company and access request management.</p>
                <a href="/admin-k9x2m7" className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors">
                  <Shield className="w-4 h-4" />
                  Admin Panel
                </a>
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
