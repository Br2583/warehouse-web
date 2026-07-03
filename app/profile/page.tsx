'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentDuplicateIcon, PlusIcon, ExclamationCircleIcon,
  XMarkIcon, ArrowRightOnRectangleIcon, ShieldCheckIcon, PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import { UserAvatar } from '@/components/UserAvatar';
import { AVATARS } from '@/lib/avatars';
import { api } from '@/lib/api';
import { pb } from '@/lib/pb';
import { useAuth } from '@/lib/auth-context';

export default function ProfilePage() {
  const { user, logout, updatePicture } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [genError, setGenError] = useState('');
  const [loading, setLoading] = useState(true);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  const handleAvatarSelect = async (avatarValue: string) => {
    if (!user) return;
    setPickerOpen(false);
    setAvatarSaving(true);
    setAvatarError('');
    setAvatarSuccess(false);
    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` },
        body: JSON.stringify({ userId: user.id, avatar_base64: avatarValue }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update');
      updatePicture(avatarValue);
      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 3000);
    } catch (e: any) {
      setAvatarError(e?.message || 'Failed to update');
    }
    setAvatarSaving(false);
  };

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
      <main className="md:ml-64 flex-1 min-w-0 p-4 md:p-8 pb-24 md:pb-8 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            <p className="text-gray-500 text-sm mt-1">Account and company settings</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-100 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" /> Sign Out
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
              <div className="flex items-start gap-4">
                {/* Avatar with picker */}
                <div className="relative flex-shrink-0" ref={pickerRef}>
                  <button
                    onClick={() => setPickerOpen(p => !p)}
                    disabled={avatarSaving}
                    className="relative block group"
                    title="Change icon"
                  >
                    <UserAvatar picture={user?.picture} name={user?.name} size={64} shape="square" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-md group-hover:bg-blue-700 transition-colors">
                      {avatarSaving
                        ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        : <PencilSquareIcon className="w-3 h-3 text-white" />
                      }
                    </div>
                  </button>

                  {/* Icon picker */}
                  <AnimatePresence>
                    {pickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.14 }}
                        className="absolute left-0 top-[72px] z-30 bg-white rounded-2xl shadow-xl border border-gray-100 p-3"
                        style={{ width: 228 }}
                      >
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2.5">Choose your icon</p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {AVATARS.map(av => (
                            <button
                              key={av.id}
                              onClick={() => handleAvatarSelect('avatar:' + av.id)}
                              title={av.label}
                              className={`rounded-xl transition-transform hover:scale-110 active:scale-95 ${
                                user?.picture === 'avatar:' + av.id
                                  ? 'ring-2 ring-blue-500 ring-offset-1'
                                  : ''
                              }`}
                            >
                              <UserAvatar picture={'avatar:' + av.id} name="" size={48} shape="square" />
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => handleAvatarSelect('')}
                          className="mt-2 w-full py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          Remove icon
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900">{user?.name}</h2>
                  <p className="text-gray-500 text-sm">{user?.email}</p>
                  <span className="inline-block mt-1 text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full capitalize">{user?.role}</span>
                  {avatarError && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                      <ExclamationCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      {avatarError}
                    </p>
                  )}
                  {avatarSuccess && (
                    <p className="text-xs text-green-600 mt-2">Icon updated!</p>
                  )}
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
                  <PlusIcon className="w-4 h-4" /> Generate Invitation Code
                </button>
              )}
              <AnimatePresence>
                {genError && (
                  <motion.div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2">
                    <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{genError}</span>
                    <button onClick={() => setGenError('')}><XMarkIcon className="w-4 h-4" /></button>
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
                          <DocumentDuplicateIcon className="w-3 h-3" />
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
                    <UserAvatar picture={m.picture} name={m.name} size={36} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.email}</p>
                    </div>
                    <span className="text-xs capitalize text-gray-400">{m.role}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Admin panel link */}
            {user?.id === 'ezcrajrmevn36cu' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheckIcon className="w-4 h-4 text-purple-500" />
                  <h3 className="font-semibold text-gray-900">Administration</h3>
                </div>
                <p className="text-xs text-gray-400 mb-4">Company and access request management.</p>
                <a href="/admin-k9x2m7" className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors">
                  <ShieldCheckIcon className="w-4 h-4" />
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
