'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PencilSquareIcon, ExclamationCircleIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import Sidebar from '@/components/Sidebar';
import { UserAvatar } from '@/components/UserAvatar';
import { AVATARS } from '@/lib/avatars';
import { compressAvatar } from '@/lib/compress-image';
import { api } from '@/lib/api';
import { pb } from '@/lib/pb';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

export default function ProfilePage() {
  const { user, refreshUser, updatePicture } = useAuth();
  const { showToast } = useToast();

  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Avatar picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Inline name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  // Inline company name editing (owner only)
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyNameValue, setCompanyNameValue] = useState('');
  const [companySaving, setCompanySaving] = useState(false);
  const [companyError, setCompanyError] = useState('');

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

  useEffect(() => {
    api.get('/api/company/info')
      .then(setCompany)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarSelect = async (avatarValue: string) => {
    if (!user) return;
    setPickerOpen(false);
    setAvatarSaving(true);
    setAvatarError('');
    try {
      await pb.collection('users').update(user.id, { avatar_base64: avatarValue || null });
      updatePicture(avatarValue);
      showToast(avatarValue ? 'Avatar updated' : 'Avatar removed');
    } catch (e: any) {
      setAvatarError(e?.message || 'Failed to update avatar');
    }
    setAvatarSaving(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPickerOpen(false);
    setAvatarSaving(true);
    setAvatarError('');
    try {
      const dataUrl = await compressAvatar(file);
      await pb.collection('users').update(user!.id, { avatar_base64: dataUrl });
      updatePicture(dataUrl);
      showToast('Photo updated');
    } catch (e: any) {
      setAvatarError(e?.message || 'Failed to upload photo');
    }
    setAvatarSaving(false);
  };

  const saveName = async () => {
    if (!nameValue.trim() || nameValue.trim() === user?.name) {
      setEditingName(false);
      return;
    }
    setNameSaving(true);
    setNameError('');
    try {
      await api.put('/api/profile', { name: nameValue.trim() });
      await refreshUser();
      setEditingName(false);
      showToast('Name updated');
    } catch (e: any) {
      setNameError(e?.message || 'Failed to update name');
    }
    setNameSaving(false);
  };

  const saveCompanyName = async () => {
    if (!companyNameValue.trim() || companyNameValue.trim() === company?.name) {
      setEditingCompany(false);
      return;
    }
    setCompanySaving(true);
    setCompanyError('');
    try {
      await api.put('/api/company/info', { name: companyNameValue.trim() });
      setCompany((prev: any) => ({ ...prev, name: companyNameValue.trim() }));
      await refreshUser();
      setEditingCompany(false);
      showToast('Company name updated');
    } catch (e: any) {
      setCompanyError(e?.message || 'Failed to update company name');
    }
    setCompanySaving(false);
  };

  const isOwner = company?.is_owner;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 px-4 pb-24 md:px-8 md:pb-8 topbar-offset">
        <div className="max-w-xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            <p className="text-sm text-gray-400 mt-1">Your personal information</p>
          </div>

          <div className="space-y-4">
            {/* ─── User card ─── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-6"
            >
              <div className="flex items-start gap-5">
                {/* Avatar picker */}
                <div className="relative flex-shrink-0" ref={pickerRef}>
                  <button
                    onClick={() => setPickerOpen(p => !p)}
                    disabled={avatarSaving}
                    className="relative block group"
                  >
                    <UserAvatar picture={user?.picture} name={user?.name} size={72} shape="square" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-md group-hover:bg-blue-700 transition-colors">
                      {avatarSaving
                        ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        : <PencilSquareIcon className="w-3 h-3 text-white" />
                      }
                    </div>
                  </button>

                  <AnimatePresence>
                    {pickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.14 }}
                        className="absolute left-0 top-[80px] z-30 bg-white rounded-2xl shadow-xl border border-gray-100 p-3"
                        style={{ width: 228 }}
                      >
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2.5">Choose avatar</p>

                        <button
                          onClick={() => photoInputRef.current?.click()}
                          className="w-full flex items-center justify-center gap-2 py-2 mb-2.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Upload photo
                        </button>
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoUpload}
                        />

                        <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-wide mb-1.5">Or pick an icon</p>
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
                          Remove avatar
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Name + info */}
                <div className="flex-1 min-w-0">
                  {editingName ? (
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        value={nameValue}
                        onChange={e => setNameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveName();
                          if (e.key === 'Escape') { setEditingName(false); setNameError(''); }
                        }}
                        className="text-lg font-bold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-[220px]"
                        autoFocus
                        maxLength={60}
                      />
                      <button
                        onClick={saveName}
                        disabled={nameSaving}
                        className="text-xs text-blue-600 hover:underline disabled:opacity-40 flex-shrink-0"
                      >
                        {nameSaving
                          ? <span className="w-3.5 h-3.5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin block" />
                          : 'Save'
                        }
                      </button>
                      <button
                        onClick={() => { setEditingName(false); setNameError(''); }}
                        className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-gray-900 truncate">{user?.name}</h2>
                      <button
                        onClick={() => { setNameValue(user?.name || ''); setEditingName(true); setNameError(''); }}
                        title="Edit name"
                        className="text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <span className="inline-block mt-1.5 text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full capitalize">
                    {user?.role}
                  </span>

                  {nameError && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                      <ExclamationCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />{nameError}
                    </p>
                  )}
                  {avatarError && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                      <ExclamationCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />{avatarError}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* ─── Company info ─── */}
            {!loading && company && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="bg-white rounded-2xl border border-gray-100 p-6"
              >
                <h3 className="font-semibold text-gray-900 mb-3">Company</h3>
                <div className="space-y-2.5">
                  {/* Company name — editable for owner */}
                  <div className="flex items-center justify-between text-sm gap-3">
                    <span className="text-gray-400 flex-shrink-0">Name</span>
                    {isOwner && editingCompany ? (
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <input
                          value={companyNameValue}
                          onChange={e => setCompanyNameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveCompanyName();
                            if (e.key === 'Escape') { setEditingCompany(false); setCompanyError(''); }
                          }}
                          className="text-sm font-medium border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-[180px]"
                          autoFocus
                          maxLength={80}
                        />
                        <button onClick={saveCompanyName} disabled={companySaving} className="text-xs text-blue-600 hover:underline disabled:opacity-40 flex-shrink-0">
                          {companySaving ? <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin block" /> : 'Save'}
                        </button>
                        <button onClick={() => { setEditingCompany(false); setCompanyError(''); }} className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{company.name}</span>
                        {isOwner && (
                          <button
                            onClick={() => { setCompanyNameValue(company.name); setEditingCompany(true); setCompanyError(''); }}
                            className="text-gray-300 hover:text-blue-500 transition-colors"
                          >
                            <PencilSquareIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {companyError && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />{companyError}
                    </p>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Industry</span>
                    <span className="font-medium text-gray-900">{company.industry || 'Warehousing'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Members</span>
                    <span className="font-medium text-gray-900">{company.member_count} / {company.max_members}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── Admin Panel (super-admin only) ─── */}
            {user?.email === process.env.NEXT_PUBLIC_ADMIN_USER_EMAIL && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="bg-white rounded-2xl border border-gray-100 p-6"
              >
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheckIcon className="w-4 h-4 text-purple-500" />
                  <h3 className="font-semibold text-gray-900">Administration</h3>
                </div>
                <p className="text-xs text-gray-400 mb-4">Company and access request management.</p>
                <a
                  href="/admin-k9x2m7"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                >
                  <ShieldCheckIcon className="w-4 h-4" />
                  Admin Panel
                </a>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
