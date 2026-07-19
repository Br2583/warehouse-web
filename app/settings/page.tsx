'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  UsersIcon, DevicePhoneMobileIcon, ExclamationTriangleIcon,
  ArrowRightOnRectangleIcon, ChevronRightIcon, CheckCircleIcon,
  BuildingOffice2Icon, KeyIcon, EyeIcon, EyeSlashIcon, PlusIcon,
  DocumentDuplicateIcon, XMarkIcon, TrashIcon, LifebuoyIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import Sidebar from '@/components/Sidebar';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { pb } from '@/lib/pb';
import { useToast } from '@/lib/toast-context';
import ConfirmModal from '@/components/ConfirmModal';

const card = 'bg-white rounded-2xl border border-gray-100 p-6 mb-4';
const sectionTitle = 'text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const isOwner = user?.role === 'owner';

  const [company, setCompany] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // PWA
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [pwaInstalling, setPwaInstalling] = useState(false);
  const [pwaSuccess, setPwaSuccess] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  // Danger zone
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [leaveError, setLeaveError] = useState('');

  // Security — change password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Invite codes
  const [generatingCode, setGeneratingCode] = useState(false);
  const [genError, setGenError] = useState('');

  // Team management
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/api/company/info'),
      api.get('/api/company/members'),
    ])
      .then(([c, m]) => {
        setCompany(c);
        setMembers(Array.isArray(m) ? m : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setPwaInstalled(standalone);

    const ua = navigator.userAgent;
    setIsIos(/iphone|ipad|ipod/i.test(ua));
    setIsAndroid(/android/i.test(ua));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler as any);
    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  const installPwa = async () => {
    if (!deferredPrompt) return;
    setPwaInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setPwaInstalling(false);
    if (outcome === 'accepted') {
      setPwaSuccess(true);
      showToast('App installed!');
    }
  };

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
      showToast('Member removed');
    } catch {
      setRemoveError('Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

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

  const fade = {
    hidden: { opacity: 0, y: 12 },
    show: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.06, duration: 0.3, ease: 'easeOut' as const },
    }),
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 px-4 md:px-8 pb-28 md:pb-8 topbar-offset">
        <div className="max-w-2xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-gray-900 mb-6"
          >
            Settings
          </motion.h1>

          {/* ─── Account ─── */}
          <motion.div custom={0} variants={fade} initial="hidden" animate="show">
            <p className={sectionTitle}>Account</p>
            <div className={card}>
              <Link href="/profile" className="flex items-center gap-4 group">
                <UserAvatar picture={user?.picture} name={user?.name} size={52} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-sm text-gray-400 truncate">{user?.email}</p>
                  <span className="text-xs font-medium text-blue-600 capitalize">{user?.role}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-blue-600 font-medium group-hover:gap-2 transition-all flex-shrink-0">
                  Edit Profile
                  <ChevronRightIcon className="w-4 h-4" />
                </div>
              </Link>
            </div>
          </motion.div>

          {/* ─── Company & Team ─── */}
          <motion.div custom={1} variants={fade} initial="hidden" animate="show">
            <p className={sectionTitle}>Company &amp; Team</p>
            <div className={card}>
              {loading ? (
                <div className="space-y-3">
                  <div className="h-12 bg-gray-50 rounded-xl animate-pulse" />
                  <div className="h-10 bg-gray-50 rounded-xl animate-pulse" />
                  <div className="h-10 bg-gray-50 rounded-xl animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <BuildingOffice2Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{company?.name || user?.company_name || '—'}</p>
                      <p className="text-xs text-gray-400">{company?.industry || 'Warehousing'} · {members.length} {members.length === 1 ? 'member' : 'members'}</p>
                    </div>
                  </div>

                  {removeError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2 mb-3">
                      <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{removeError}</span>
                      <button onClick={() => setRemoveError('')}><XMarkIcon className="w-4 h-4" /></button>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {members.map(m => (
                      <div key={m.user_id} className="flex items-center gap-3">
                        <UserAvatar picture={m.picture} name={m.name} size={34} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                          <p className="text-xs text-gray-400 truncate">{m.email}</p>
                        </div>
                        <span className="text-xs text-gray-400 capitalize flex-shrink-0">{m.role}</span>
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
                </>
              )}
            </div>
          </motion.div>

          {/* ─── Invite Codes (owner only) ─── */}
          {isOwner && (
            <motion.div id="invite" custom={2} variants={fade} initial="hidden" animate="show">
              <p className={sectionTitle}>Invite Codes</p>
              <div className={card}>
                <p className="text-sm text-gray-500 mb-4">
                  Share an invite code so people can join your company.
                </p>
                <button
                  onClick={generateCode}
                  disabled={generatingCode}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {generatingCode
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <PlusIcon className="w-4 h-4" />
                  }
                  Generate Code
                </button>

                <AnimatePresence>
                  {genError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2"
                    >
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
                          <button
                            onClick={() => { navigator.clipboard.writeText(code); showToast('Copied!'); }}
                            className="text-gray-400 hover:text-blue-500 transition-colors"
                          >
                            <DocumentDuplicateIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── Security ─── */}
          <motion.div custom={isOwner ? 3 : 2} variants={fade} initial="hidden" animate="show">
            <p className={sectionTitle}>Security</p>
            <div className={card}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <KeyIcon className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Password</p>
                    <p className="text-xs text-gray-400">Change your login password</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowPasswordForm(p => !p); setPasswordError(''); }}
                  className="text-sm text-blue-600 hover:underline flex-shrink-0"
                >
                  {showPasswordForm ? 'Cancel' : 'Change'}
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
            </div>
          </motion.div>

          {/* ─── Support ─── */}
          <motion.div custom={isOwner ? 4 : 3} variants={fade} initial="hidden" animate="show">
            <p className={sectionTitle}>Support</p>
            <div className={card}>
              <Link href="/support" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <LifebuoyIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">Help &amp; Support</p>
                  <p className="text-sm text-gray-400">Get help, report issues, documentation</p>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
              </Link>
            </div>
          </motion.div>

          {/* ─── Install App ─── */}
          <motion.div custom={isOwner ? 5 : 4} variants={fade} initial="hidden" animate="show">
            <p className={sectionTitle}>Install App</p>
            <div className={card}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-950 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-[11px] italic">WM</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-0.5">Warehouse Manager</p>
                  <p className="text-sm text-gray-400 mb-4">
                    Add to your home screen for faster access — works offline too.
                  </p>

                  {pwaInstalled || pwaSuccess ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                      <CheckCircleIcon className="w-5 h-5" />
                      Already installed on this device
                    </div>
                  ) : deferredPrompt ? (
                    <button
                      onClick={installPwa}
                      disabled={pwaInstalling}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-950 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      <DevicePhoneMobileIcon className="w-4 h-4" />
                      {pwaInstalling ? 'Installing…' : 'Install App'}
                    </button>
                  ) : isIos ? (
                    <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
                      <p className="font-semibold text-blue-800 mb-2">iOS Instructions:</p>
                      <p>1. Tap the <strong>Share</strong> button <span className="text-blue-600">⬆</span> at the bottom of Safari</p>
                      <p>2. Scroll down and tap <strong>Add to Home Screen</strong></p>
                      <p>3. Tap <strong>Add</strong> in the top right</p>
                    </div>
                  ) : isAndroid ? (
                    <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
                      <p className="font-semibold text-blue-800 mb-2">Android Instructions:</p>
                      <p>1. Tap the <strong>three-dot menu</strong> <span className="text-blue-600">⋮</span> in Chrome</p>
                      <p>2. Tap <strong>Add to Home screen</strong></p>
                      <p>3. Tap <strong>Add</strong> to confirm</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <DevicePhoneMobileIcon className="w-4 h-4" />
                      Open on mobile to install the app
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ─── Danger Zone ─── */}
          <motion.div custom={isOwner ? 6 : 5} variants={fade} initial="hidden" animate="show">
            <p className={sectionTitle}>Danger Zone</p>
            <div className="bg-white rounded-2xl border border-red-100 p-6 mb-4">
              <div className="flex items-start gap-3 mb-5">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-500">
                  These actions are <strong>permanent and cannot be undone</strong>. Proceed with caution.
                </p>
              </div>

              <div className="space-y-3">
                {!isOwner && user?.company_id && (
                  <div className="p-4 border border-red-100 rounded-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">Leave Company</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          You will be removed from {company?.name || 'your company'}. You'll need a new invite code to rejoin.
                        </p>
                        {leaveError && <p className="text-xs text-red-500 mt-1">{leaveError}</p>}
                      </div>
                      <button
                        onClick={() => setConfirmLeave(true)}
                        disabled={leaveSaving}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 bg-red-50 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50 flex-shrink-0"
                      >
                        {leaveSaving
                          ? <span className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                          : <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        }
                        Leave
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-4 border border-red-100 rounded-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">Delete Account</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {isOwner
                          ? 'Permanently deletes your account and the entire company, including all vaults, warehouses, and team members.'
                          : 'Permanently deletes your account and all your data.'}
                      </p>
                      {deleteError && <p className="text-xs text-red-500 mt-1">{deleteError}</p>}
                    </div>
                    <button
                      onClick={() => setConfirmDelete(true)}
                      disabled={deleteSaving}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 bg-red-50 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {deleteSaving
                        ? <span className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                        : <ExclamationTriangleIcon className="w-4 h-4" />
                      }
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {confirmDelete && (
        <ConfirmModal
          message={
            isOwner
              ? 'Are you sure you want to permanently delete your account and the entire company? This will remove ALL vaults, warehouses, and team members. This cannot be undone.'
              : 'Are you sure you want to permanently delete your account? This action cannot be undone.'
          }
          confirmLabel="Delete Account"
          onConfirm={deleteAccount}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {confirmLeave && (
        <ConfirmModal
          message={`Are you sure you want to leave ${company?.name || 'your company'}? You will need a new invitation code to rejoin.`}
          confirmLabel="Leave Company"
          onConfirm={leaveCompany}
          onCancel={() => setConfirmLeave(false)}
        />
      )}
    </div>
  );
}
