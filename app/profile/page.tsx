'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Users, Copy, Trash2, Plus, KeyRound } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function ProfilePage() {
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [pin, setPin] = useState({ current: '', newPin: '', confirm: '' });
  const [pinMsg, setPinMsg] = useState('');
  const [portalCode, setPortalCode] = useState({ current: '', newCode: '', confirm: '' });
  const [portalMsg, setPortalMsg] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/company/info'),
      api.get('/api/company/members'),
    ]).then(([c, m]) => { setCompany(c); setMembers(m); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const generateCode = async () => {
    try {
      await api.post('/api/company/generate-code', {});
      const c = await api.get('/api/company/info');
      setCompany(c);
    } catch (err: any) {
      alert(err?.message || 'Failed to generate invitation code');
    }
  };

  const changePortalCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (portalCode.newCode !== portalCode.confirm) { setPortalMsg('Codes do not match.'); return; }
    if (portalCode.newCode.length < 4) { setPortalMsg('New code must be at least 4 characters.'); return; }
    setPortalLoading(true);
    setPortalMsg('');
    try {
      const res = await fetch('/api/portal/change-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current: portalCode.current, newCode: portalCode.newCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setPortalMsg('Portal code updated successfully!');
        setPortalCode({ current: '', newCode: '', confirm: '' });
      } else {
        setPortalMsg(data.error || 'Failed to update portal code.');
      }
    } catch {
      setPortalMsg('Connection error. Try again.');
    } finally {
      setPortalLoading(false);
    }
  };

  const changePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.newPin !== pin.confirm) { setPinMsg('PINs do not match'); return; }
    if (pin.newPin.length !== 4) { setPinMsg('PIN must be 4 digits'); return; }
    try {
      await api.post('/api/auth/change-pin', { current_pin: pin.current, new_pin: pin.newPin });
      setPinMsg('PIN changed successfully!');
      setPin({ current: '', newPin: '', confirm: '' });
    } catch { setPinMsg('Incorrect current PIN'); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 pb-20 md:pb-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-500 text-sm mt-1">Account and company settings</p>
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
                  <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                )}
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
                      <img src={m.picture} alt={m.name} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-500">{m.name?.[0]}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.email}</p>
                    </div>
                    <span className="text-xs capitalize text-gray-400">{m.role}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Change PIN */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" /> Change PIN
              </h3>
              <form onSubmit={changePin} className="space-y-3">
                {[
                  { label: 'Current PIN', key: 'current' },
                  { label: 'New PIN', key: 'newPin' },
                  { label: 'Confirm PIN', key: 'confirm' },
                ].map(f => (
                  <input key={f.key} type="password" placeholder={f.label} maxLength={4}
                    value={(pin as any)[f.key]}
                    onChange={e => setPin(p => ({ ...p, [f.key]: e.target.value.replace(/\D/g, '') }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ))}
                {pinMsg && <p className={`text-sm ${pinMsg.includes('success') ? 'text-green-600' : 'text-red-500'}`}>{pinMsg}</p>}
                <button type="submit" className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
                  Change PIN
                </button>
              </form>
            </motion.div>

            {/* Change Portal Code — owner only */}
            {company?.is_owner && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-600" /> Portal Access Code
                </h3>
                <p className="text-xs text-gray-400 mb-4">Change the code required to access the portal. Takes effect immediately — no restart needed.</p>
                <form onSubmit={changePortalCode} className="space-y-3">
                  {[
                    { label: 'Current Code', key: 'current' },
                    { label: 'New Code (min 4 chars)', key: 'newCode' },
                    { label: 'Confirm New Code', key: 'confirm' },
                  ].map(f => (
                    <input key={f.key} type="password" placeholder={f.label}
                      value={(portalCode as any)[f.key]}
                      onChange={e => setPortalCode(p => ({ ...p, [f.key]: e.target.value }))}
                      disabled={portalLoading}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  ))}
                  {portalMsg && (
                    <p className={`text-sm ${portalMsg.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
                      {portalMsg}
                    </p>
                  )}
                  <button type="submit" disabled={portalLoading}
                    className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {portalLoading
                      ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : 'Update Portal Code'}
                  </button>
                </form>
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

