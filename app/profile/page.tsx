'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentDuplicateIcon, PlusIcon, ExclamationCircleIcon,
  XMarkIcon, ArrowRightOnRectangleIcon, ShieldCheckIcon, PencilSquareIcon,
  TrashIcon, KeyIcon, EyeIcon, EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import { UserAvatar } from '@/components/UserAvatar';
import { AVATARS } from '@/lib/avatars';
import { api } from '@/lib/api';
import { pb } from '@/lib/pb';
import { useAuth } from '@/lib/auth-context';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/lib/toast-context';

export default function ProfilePage() {
  const { user, logout, updatePicture } = useAuth();
  const { showToast } = useToast();
  const [company, setCompany] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [genError, setGenError] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState('');

  // Avatar picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  // A-1: Inline name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  // A-2: Change password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // A-3: Delete account
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSaving, setDeleteSaving] = useState(false);

  // A-4: Leave company
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const [leaveSaving, setLeaveSaving] = useState(false);

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
    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` },
        body: JSON.stringify({ userId: user.id, avatar_base64: avatarValue }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update');
      updatePicture(avatarValue);
      showToast('Icon updated');
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

  const removeMember = async (memberId: string) => {
    setRemoveError('');
    setRemovingId(memberId);
    try {
      const res = await fetch(`/api/company/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRemoveError(data.error || 'Failed to remove member');
        return;
      }
      setMembers(prev => prev.filter(m => m.user_id !== memberId));
    } catch {
      setRemoveError('Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

  const generateCode = async () => {
    if (generatingCode) return;
    setGenError('');
    setGeneratingCode(true);
    try {
      await api.post('/api/company/generate-code', {});
      const c = await api.get('/api/company/info');
      setCompany(c);
      showToast('Invite code generated');
    } catch (err: any) {
      setGenError(err?.message || 'Failed to generate invitation code');
    } finally {
      setGeneratingCode(false);
    }
  };

  // A-1: Save edited name
  const saveName = async () => {
    if (!nameValue.trim() || nameValue.trim() === user?.name) {
      setEditingName(false);
      return;
    }
    setNameSaving(true);
    setNameError('');
    try {
      await api.put('/api/profile', { name: nameValue.trim() });
      setEditingName(false);
      showToast('Name updated');
    } catch (e: any) {
      setNameError(e?.message || 'Failed to update name');
    }
    setNameSaving(false);
  };

  // A-2: Change password
  const changePassword = async () => {
    setPasswordError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    setPasswordSaving(true);
    try {
      await pb.collection('users').update(user!.id, {
        password: newPassword,
        passwordConfirm: confirmPassword,
        oldPassword: currentPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      showToast('Password changed successfully');
    } catch (e: any) {
      setPasswordError(e?.message || 'Failed to change password. Check your current password.');
    }
    setPasswordSaving(false);
  };

  // A-3: Delete account
  const deleteAccount = async () => {
    setDeleteSaving(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to delete account');
      }
      logout();
    } catch (e: any) {
      setDeleteError(e?.message || 'Failed to delete account');
      setDeleteSaving(false);
    }
  };

  // A-4: Leave company
  const leaveCompany = async () => {
    setLeaveSaving(true);
    setLeaveError('');
    try {
      const res = await fetch('/api/company/members/self', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to leave company');
      }
      logout();
    } catch (e: any) {
      setLeaveError(e?.message || 'Failed to leave company');
      setLeaveSaving(false);
    }
  };

  const isOwner = company?.is_owner;

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
                {/* Avatar picker */}
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
                  {/* A-1: Inline name editing */}
                  {editingName ? (
                    <div className="flex items-center gap-2 mb-0.5">
                      <input
                        value={nameValue}
                        onChange={e => setNameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveName();
                          if (e.key === 'Escape') { setEditingName(false); setNameError(''); }
                        }}
                        className="text-sm font-bold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-[200px]"
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
                    <div className="flex items-center gap-2 mb-0.5">
                      <h2 className="text-lg font-bold text-gray-900">{user?.name}</h2>
                      <button
                        onClick={() => { setNameValue(user?.name || ''); setEditingName(true); setNameError(''); }}
                        title="Edit name"
                        className="text-gray-300 hover:text-blue-500 transition-colors"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-gray-500 text-sm">{user?.email}</p>
                  <span className="inline-block mt-1 text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full capitalize">{user?.role}</span>
                  {nameError && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <ExclamationCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />{nameError}
                    </p>
                  )}
                  {avatarError && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                      <ExclamationCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />{avatarError}
                    </p>
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
              {isOwner && (
                <button onClick={generateCode} disabled={generatingCode}
                  className="mt-4 flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {generatingCode
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <PlusIcon className="w-4 h-4" />}
                  Generate Invitation Code
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

            {/* A-2: Security — Change Password */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyIcon className="w-4 h-4 text-gray-400" />
                  <h3 className="font-semibold text-gray-900">Security</h3>
                </div>
                <button
                  onClick={() => {
                    setShowPasswordForm(p => !p);
                    setPasswordError('');
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showPasswordForm ? 'Cancel' : 'Change Password'}
                </button>
              </div>

              <AnimatePresence>
                {showPasswordForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Current Password</label>
                        <div className="relative">
                          <input
                            type={showCurrent ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showCurrent ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">New Password</label>
                        <div className="relative">
                          <input
                            type={showNew ? 'text' : 'password'}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showNew ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Confirm New Password</label>
                        <div className="relative">
                          <input
                            type={showConfirm ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && changePassword()}
                            className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showConfirm ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      {passwordError && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />{passwordError}
                        </p>
                      )}
                      <button
                        onClick={changePassword}
                        disabled={passwordSaving}
                        className="w-full py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {passwordSaving
                          ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          : 'Update Password'
                        }
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Team Members */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Team Members</h3>
              <AnimatePresence>
                {removeError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2 mb-3"
                  >
                    <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{removeError}</span>
                    <button onClick={() => setRemoveError('')}><XMarkIcon className="w-4 h-4" /></button>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="space-y-3">
                {members.map(m => (
                  <div key={m.user_id} className="flex items-center gap-3">
                    <UserAvatar picture={m.picture} name={m.name} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                      <p className="text-xs text-gray-400 truncate">{m.email}</p>
                    </div>
                    <span className="text-xs capitalize text-gray-400 flex-shrink-0">{m.role}</span>
                    {isOwner && m.user_id !== user?.id && m.role !== 'owner' && (
                      <button
                        onClick={() => removeMember(m.user_id)}
                        disabled={removingId === m.user_id}
                        title="Remove from company"
                        className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                      >
                        {removingId === m.user_id
                          ? <span className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin block" />
                          : <TrashIcon className="w-3.5 h-3.5" />
                        }
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* A-4: Leave Company — only for non-owners who are in a company */}
              {!isOwner && company && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  {leaveError && (
                    <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                      <ExclamationCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />{leaveError}
                    </p>
                  )}
                  <button
                    onClick={() => setConfirmLeave(true)}
                    disabled={leaveSaving}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-100 bg-red-50 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {leaveSaving
                      ? <span className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                      : <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    }
                    Leave Company
                  </button>
                </div>
              )}
            </motion.div>

            {/* A-5: Admin panel link — use NEXT_PUBLIC_ADMIN_USER_EMAIL instead of hardcoded ID */}
            {user?.email === process.env.NEXT_PUBLIC_ADMIN_USER_EMAIL && (
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

            {/* A-3: Danger Zone */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-2xl border border-red-100 p-6">
              <h3 className="font-semibold text-red-600 mb-1">Danger Zone</h3>
              <p className="text-xs text-gray-400 mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
              {deleteError && (
                <p className="text-xs text-red-500 mb-3 flex items-center gap-1">
                  <ExclamationCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />{deleteError}
                </p>
              )}
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={deleteSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {deleteSaving
                  ? <span className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                  : <TrashIcon className="w-4 h-4" />
                }
                Delete Account
              </button>
            </motion.div>
          </div>
        )}
      </main>

      {confirmDelete && (
        <ConfirmModal
          message="Are you sure you want to permanently delete your account? This action cannot be undone."
          confirmLabel="Delete Account"
          onConfirm={deleteAccount}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {confirmLeave && (
        <ConfirmModal
          message={`Are you sure you want to leave ${company?.name}? You will need a new invitation code to rejoin.`}
          confirmLabel="Leave Company"
          onConfirm={leaveCompany}
          onCancel={() => setConfirmLeave(false)}
        />
      )}
    </div>
  );
}
