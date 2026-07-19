'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  UserCircleIcon, UsersIcon, DevicePhoneMobileIcon,
  ExclamationTriangleIcon, ArrowRightOnRectangleIcon, ChevronRightIcon,
  CheckCircleIcon, BuildingOffice2Icon, ShieldCheckIcon,
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
  const [memberCount, setMemberCount] = useState(0);
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

  useEffect(() => {
    Promise.all([
      api.get('/api/company/info'),
      api.get('/api/company/members'),
    ])
      .then(([c, m]) => { setCompany(c); setMemberCount(Array.isArray(m) ? m.length : 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // PWA detection
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

  const fade = { hidden: { opacity: 0, y: 12 }, show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.3, ease: 'easeOut' as const } }) };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 p-4 md:p-8 pb-28 md:pb-8 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] md:pt-16">
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

              <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Link href="/profile?section=password" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <ShieldCheckIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Password &amp; PIN</p>
                    <p className="text-xs text-gray-400">Change your credentials</p>
                  </div>
                </Link>
                <Link href="/profile?section=avatar" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <UserCircleIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Profile Photo</p>
                    <p className="text-xs text-gray-400">Change avatar or photo</p>
                  </div>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* ─── Company & Team (owner) ─── */}
          <motion.div custom={1} variants={fade} initial="hidden" animate="show">
            <p className={sectionTitle}>Company &amp; Team</p>
            <div className={card}>
              {loading ? (
                <div className="h-12 bg-gray-50 rounded-xl animate-pulse" />
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <BuildingOffice2Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{company?.name || user?.company_name || '—'}</p>
                      <p className="text-xs text-gray-400">{company?.industry || 'Warehousing'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-3">
                    <UsersIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">{memberCount} team {memberCount === 1 ? 'member' : 'members'}</p>
                    </div>
                    <Link href="/profile?tab=team" className="text-xs text-blue-600 font-medium hover:underline flex-shrink-0">
                      {isOwner ? 'Manage' : 'View'}
                    </Link>
                  </div>

                  {isOwner && (
                    <Link
                      href="/profile?tab=team"
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-700">Invite Code &amp; Members</p>
                        <p className="text-xs text-gray-400">Generate codes, remove members</p>
                      </div>
                      <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    </Link>
                  )}
                </>
              )}
            </div>
          </motion.div>

          {/* ─── Install App ─── */}
          <motion.div custom={2} variants={fade} initial="hidden" animate="show">
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
          <motion.div custom={3} variants={fade} initial="hidden" animate="show">
            <p className={sectionTitle}>Danger Zone</p>
            <div className="bg-white rounded-2xl border border-red-100 p-6 mb-4">
              <div className="flex items-start gap-3 mb-5">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-500">
                  These actions are <strong>permanent and cannot be undone</strong>. Proceed with caution.
                </p>
              </div>

              <div className="space-y-3">
                {/* Leave company — only for non-owners who are in a company */}
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

                {/* Delete account */}
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
