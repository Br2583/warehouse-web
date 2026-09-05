'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import AppFooter from '@/components/AppFooter';
import {
  UsersIcon, DevicePhoneMobileIcon, ExclamationTriangleIcon,
  ArrowRightOnRectangleIcon, ChevronRightIcon, CheckCircleIcon,
  BuildingOffice2Icon, KeyIcon, EyeIcon, EyeSlashIcon, PlusIcon,
  DocumentDuplicateIcon, XMarkIcon, TrashIcon, EnvelopeIcon, PhoneIcon,
  ExclamationCircleIcon, ArrowUpIcon, ArrowDownIcon,
  PencilSquareIcon, ShieldCheckIcon,
} from '@/components/icons';
import Sidebar from '@/components/Sidebar';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { pb } from '@/lib/pb';
import { compressAvatar } from '@/lib/compress-image';
import { isNativePlatform, pickPhotoFileNative } from '@/lib/pick-photo';
import { checkBiometry, biometricLockEnabled, setBiometricLockEnabled, biometricUnlock } from '@/lib/biometric';
import { useToast } from '@/lib/toast-context';
import ConfirmModal from '@/components/ConfirmModal';

const card = 'bg-white rounded-2xl border border-gray-100 p-6 mb-4';
const sectionTitle = 'text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4';

export default function SettingsPage() {
  const { user, logout, canManage, refreshUser, updatePicture } = useAuth();
  const { showToast } = useToast();
  const isOwner = user?.role === 'owner';

  const [company, setCompany] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile — merged in from the old /profile page
  const [isAdmin, setIsAdmin] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyNameValue, setCompanyNameValue] = useState('');
  const [companySaving, setCompanySaving] = useState(false);
  const [companyError, setCompanyError] = useState('');

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

  // Security — biometric app lock (native only)
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLabel, setBioLabel] = useState('');
  const [bioOn, setBioOn] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);

  useEffect(() => {
    checkBiometry().then(r => { setBioAvailable(r.available); setBioLabel(r.label); }).catch(() => {});
    setBioOn(biometricLockEnabled());
  }, []);

  const toggleBiometric = async () => {
    setBioBusy(true);
    if (bioOn) {
      setBiometricLockEnabled(false);
      setBioOn(false);
      showToast('App lock disabled');
    } else {
      // Verify once before turning it on, so nobody enables a lock they can't pass.
      const ok = await biometricUnlock('Confirm to enable app lock');
      if (ok) {
        setBiometricLockEnabled(true);
        setBioOn(true);
        showToast('App lock enabled');
      }
    }
    setBioBusy(false);
  };

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

  // Native detection
  const [isNative, setIsNative] = useState(false);

  // Team management
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState('');

  // Role change (owner only)
  const [roleChangingId, setRoleChangingId] = useState<string | null>(null);
  const [roleError, setRoleError] = useState('');

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
    if (!pb.authStore.token) return;
    fetch('/api/profile/is-admin', { headers: { Authorization: `Bearer ${pb.authStore.token}` } })
      .then(r => r.json())
      .then(d => setIsAdmin(!!d?.isAdmin))
      .catch(() => {});
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

  useEffect(() => {
    import('@capacitor/core').then(({ Capacitor }) => {
      if (Capacitor.isNativePlatform()) setIsNative(true);
    });
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

  const processAvatarFile = async (file: File) => {
    if (!user) return;
    setAvatarSaving(true);
    setAvatarError('');
    try {
      const dataUrl = await compressAvatar(file);
      await pb.collection('users').update(user.id, { avatar_base64: dataUrl });
      updatePicture(dataUrl);
      showToast('Photo updated');
    } catch (err: any) {
      setAvatarError(err?.message || 'Failed to upload photo');
    }
    setAvatarSaving(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await processAvatarFile(file);
  };

  // Native uses the Capacitor camera/gallery chooser; web clicks the hidden input.
  const openAvatarPicker = async () => {
    if (isNativePlatform()) {
      try {
        const file = await pickPhotoFileNative('prompt');
        if (file) await processAvatarFile(file);
      } catch {
        setAvatarError('Could not open the camera. Check the app’s camera and photo permissions.');
      }
    } else {
      photoInputRef.current?.click();
    }
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
    } catch (err: any) {
      setNameError(err?.message || 'Failed to update name');
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
    } catch (err: any) {
      setCompanyError(err?.message || 'Failed to update company name');
    }
    setCompanySaving(false);
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

  const changeRole = async (memberId: string, newRole: 'manager' | 'worker') => {
    setRoleChangingId(memberId);
    setRoleError('');
    try {
      const res = await fetch(`/api/company/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) { setRoleError(data.error || 'Failed to update role'); return; }
      setMembers(prev => prev.map(m => m.user_id === memberId ? { ...m, role: newRole } : m));
      showToast(newRole === 'manager' ? 'Promoted to Manager' : 'Demoted to Worker');
    } catch {
      setRoleError('Failed to update role');
    } finally {
      setRoleChangingId(null);
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
      await logout();
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
      await logout();
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
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex flex-1">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 px-4 md:px-8 pb-8 md:pb-8 topbar-offset">
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
              <div className="flex items-center gap-4">
                <button
                  onClick={openAvatarPicker}
                  disabled={avatarSaving}
                  title="Change photo"
                  className="relative rounded-full flex-shrink-0 group disabled:opacity-60"
                >
                  <UserAvatar picture={user?.picture} name={user?.name} size={52} />
                  <span className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {avatarSaving
                      ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin block" />
                      : <PencilSquareIcon className="w-4 h-4 text-white" />
                    }
                  </span>
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />

                <div className="flex-1 min-w-0">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={nameValue}
                        onChange={e => setNameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                        autoFocus
                        aria-label="Your name"
                        className="flex-1 min-w-0 text-sm font-semibold text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                      />
                      <button onClick={saveName} disabled={nameSaving} className="text-sm font-medium text-blue-600 disabled:opacity-40 flex-shrink-0">
                        {nameSaving ? '…' : 'Save'}
                      </button>
                      <button onClick={() => setEditingName(false)} className="text-sm text-gray-400 flex-shrink-0">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setNameValue(user?.name || ''); setNameError(''); setEditingName(true); }}
                      className="flex items-center gap-1.5 group max-w-full"
                    >
                      <span className="font-semibold text-gray-900 truncate">{user?.name}</span>
                      <PencilSquareIcon className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                    </button>
                  )}
                  <p className="text-sm text-gray-400 truncate">{user?.email}</p>
                  <span className="text-xs font-medium text-blue-600 capitalize">{user?.role}</span>
                </div>
              </div>

              {(avatarError || nameError) && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2 mt-3">
                  <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{avatarError || nameError}</span>
                  <button onClick={() => { setAvatarError(''); setNameError(''); }}><XMarkIcon className="w-4 h-4" /></button>
                </div>
              )}

              {isAdmin && (
                <Link
                  href="/admin-k9x2m7"
                  className="flex items-center gap-3 mt-5 pt-5 border-t border-gray-50 group"
                >
                  <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShieldCheckIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Administration</p>
                    <p className="text-xs text-gray-400">Approve companies and manage accounts</p>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors flex-shrink-0" />
                </Link>
              )}
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
                      {editingCompany ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={companyNameValue}
                            onChange={e => setCompanyNameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveCompanyName(); if (e.key === 'Escape') setEditingCompany(false); }}
                            autoFocus
                            aria-label="Company name"
                            className="flex-1 min-w-0 text-sm font-semibold text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                          />
                          <button onClick={saveCompanyName} disabled={companySaving} className="text-sm font-medium text-blue-600 disabled:opacity-40 flex-shrink-0">
                            {companySaving ? '…' : 'Save'}
                          </button>
                          <button onClick={() => setEditingCompany(false)} className="text-sm text-gray-400 flex-shrink-0">Cancel</button>
                        </div>
                      ) : isOwner ? (
                        <button
                          onClick={() => { setCompanyNameValue(company?.name || ''); setCompanyError(''); setEditingCompany(true); }}
                          className="flex items-center gap-1.5 group max-w-full"
                        >
                          <span className="font-semibold text-gray-900 truncate">{company?.name || user?.company_name || '—'}</span>
                          <PencilSquareIcon className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                        </button>
                      ) : (
                        <p className="font-semibold text-gray-900 truncate">{company?.name || user?.company_name || '—'}</p>
                      )}
                      <p className="text-xs text-gray-400">{company?.industry || 'Warehousing'} · {members.length} {members.length === 1 ? 'member' : 'members'}</p>
                    </div>
                  </div>

                  {companyError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2 mb-3">
                      <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{companyError}</span>
                      <button onClick={() => setCompanyError('')}><XMarkIcon className="w-4 h-4" /></button>
                    </div>
                  )}

                  {removeError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2 mb-3">
                      <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{removeError}</span>
                      <button onClick={() => setRemoveError('')}><XMarkIcon className="w-4 h-4" /></button>
                    </div>
                  )}
                  {roleError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2 mb-3">
                      <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{roleError}</span>
                      <button onClick={() => setRoleError('')}><XMarkIcon className="w-4 h-4" /></button>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {members.map(m => {
                      const managerCount = members.filter(x => x.role === 'manager').length;
                      const canPromote = m.role === 'worker' && managerCount < 5;
                      return (
                        <div key={m.user_id} className="flex items-center gap-3">
                          <UserAvatar picture={m.picture} name={m.name} size={34} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                            <p className="text-xs text-gray-400 truncate">{m.email}</p>
                          </div>
                          <span className="text-xs text-gray-400 capitalize flex-shrink-0">{m.role}</span>
                          {isOwner && m.user_id !== user?.id && m.role !== 'owner' && (
                            m.role === 'worker' ? (
                              <button
                                onClick={() => changeRole(m.user_id, 'manager')}
                                disabled={!canPromote || roleChangingId === m.user_id}
                                title={canPromote ? 'Promote to Manager' : 'Maximum 5 managers reached'}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-40 flex-shrink-0"
                              >
                                {roleChangingId === m.user_id
                                  ? <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin block" />
                                  : <><ArrowUpIcon className="w-3 h-3" /></>
                                }
                              </button>
                            ) : (
                              <button
                                onClick={() => changeRole(m.user_id, 'worker')}
                                disabled={roleChangingId === m.user_id}
                                title="Demote to Worker"
                                className="flex items-center gap-1 text-xs text-amber-600 hover:bg-amber-50 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-40 flex-shrink-0"
                              >
                                {roleChangingId === m.user_id
                                  ? <span className="w-3 h-3 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin block" />
                                  : <><ArrowDownIcon className="w-3 h-3" /></>
                                }
                              </button>
                            )
                          )}
                          {canManage && m.user_id !== user?.id && m.role !== 'owner' && (
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
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* ─── Invite Codes (owner only — API rejects managers) ─── */}
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
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-950 text-white rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50"
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
          <motion.div custom={canManage ? 3 : 2} variants={fade} initial="hidden" animate="show">
            <p className={sectionTitle}>Security</p>
            <div className={card}>
              {bioAvailable && (
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a7.464 7.464 0 0 1-1.15 3.993m1.989 3.559A11.209 11.209 0 0 0 8.25 10.5a3.75 3.75 0 1 1 7.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 0 1-3.6 9.75m6.633-4.596a18.666 18.666 0 0 1-2.485 5.33" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">App lock</p>
                      <p className="text-xs text-gray-400">Require {bioLabel.toLowerCase()} to open the app</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={bioOn}
                    aria-label="Require biometrics to open the app"
                    onClick={toggleBiometric}
                    disabled={bioBusy}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${bioOn ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${bioOn ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
              )}
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
                  onClick={() => {
                    if (showPasswordForm) {
                      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
                      setShowCurrent(false); setShowNew(false); setShowConfirm(false);
                    }
                    setShowPasswordForm(p => !p); setPasswordError('');
                  }}
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
                        className="w-full py-2 text-sm bg-gray-950 text-white rounded-full hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
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
          <motion.div custom={canManage ? 4 : 3} variants={fade} initial="hidden" animate="show">
            <p className={sectionTitle}>Support</p>
            <div className={card}>
              <div className="space-y-1">
                <a href="mailto:support@managerwarehouse.cc" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <EnvelopeIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="text-sm font-medium text-gray-900">support@managerwarehouse.cc</p>
                  </div>
                </a>
                <a href="tel:+17142178029" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <PhoneIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="text-sm font-medium text-gray-900">+1 (714) 217-8029</p>
                  </div>
                </a>
              </div>
              <p className="text-xs text-gray-400 mt-3 px-1">We typically respond within 24–48 hours on business days.</p>
            </div>
          </motion.div>

          {/* ─── Install App ─── */}
          {!isNative && <motion.div custom={canManage ? 5 : 4} variants={fade} initial="hidden" animate="show">
            <p className={sectionTitle}>Install App</p>
            <div className={card}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-950 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-[11px] italic">WM</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-0.5">Warehouse Manager</p>
                  <p className="text-sm text-gray-400 mb-4">
                    Add to your home screen for faster access — opens in its own window, without the browser bar.
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
          </motion.div>}

          {/* ─── Danger Zone ─── */}
          <motion.div custom={canManage ? 6 : 5} variants={fade} initial="hidden" animate="show">
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
      </div>
      {/* Sidebar is fixed at w-64, so the footer needs the same offset or it
          renders underneath it and loses its first column on desktop. */}
      {!isNative && (
        <div className="md:ml-64">
          <AppFooter />
        </div>
      )}

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
