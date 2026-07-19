'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { UserAvatar } from './UserAvatar';
import { useNavData } from '@/lib/nav-data-context';
import Link from 'next/link';
import {
  BellIcon, PlusIcon,
  Cog6ToothIcon, ArrowRightOnRectangleIcon,
  ChatBubbleLeftRightIcon, ClipboardDocumentListIcon,
  PencilSquareIcon, UserPlusIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolid } from '@heroicons/react/24/solid';

export default function TopBar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { unreadChat, pendingTasks } = useNavData();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [timeStr, setTimeStr] = useState(() =>
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      setTimeStr(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!profileRef.current?.contains(e.target as Node)) setShowProfile(false);
      if (!notifRef.current?.contains(e.target as Node)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const totalNotifs = unreadChat + pendingTasks;
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const notifPanel = showNotifs && (
    <div className="absolute right-0 top-11 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-[70]">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-2">
        Notifications
      </p>
      {totalNotifs === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">All caught up!</p>
      ) : (
        <>
          {unreadChat > 0 && (
            <Link
              href="/chat"
              onClick={() => setShowNotifs(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <ChatBubbleLeftRightIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {unreadChat} new {unreadChat === 1 ? 'message' : 'messages'}
                </p>
                <p className="text-xs text-gray-400">Team chat</p>
              </div>
            </Link>
          )}
          {pendingTasks > 0 && (
            <Link
              href="/tasks"
              onClick={() => setShowNotifs(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <ClipboardDocumentListIcon className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {pendingTasks} pending {pendingTasks === 1 ? 'task' : 'tasks'}
                </p>
                <p className="text-xs text-gray-400">Needs attention</p>
              </div>
            </Link>
          )}
        </>
      )}
    </div>
  );

  const bellBtn = (
    <div ref={notifRef} className="relative flex-shrink-0">
      <button
        onClick={() => { setShowNotifs(v => !v); setShowProfile(false); }}
        className="relative w-9 h-9 rounded-xl hover:bg-gray-50 flex items-center justify-center transition-colors"
        aria-label="Notifications"
      >
        {totalNotifs > 0
          ? <BellSolid className="w-5 h-5 text-gray-700" />
          : <BellIcon className="w-5 h-5 text-gray-500" />}
        {totalNotifs > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
            {totalNotifs > 9 ? '9+' : totalNotifs}
          </span>
        )}
      </button>
      {notifPanel}
    </div>
  );

  return (
    <>
      {/* ─── MOBILE top bar ─── */}
      <div
        className="md:hidden fixed top-0 inset-x-0 z-40 bg-white border-b border-gray-100"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="h-14 flex items-center px-4 gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">Hi, {firstName} 👋</p>
            <p className="text-[11px] text-gray-400">{timeStr}</p>
          </div>
          {bellBtn}
          <button
            onClick={() => router.push('/profile')}
            className="flex-shrink-0 active:opacity-70 transition-opacity"
            aria-label="My profile"
          >
            <UserAvatar picture={user?.picture} name={user?.name} size={34} />
          </button>
        </div>
      </div>

      {/* ─── DESKTOP top bar ─── */}
      <div className="hidden md:flex fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-100 z-30 items-center px-6 gap-4">
        {/* Greeting + clock */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Hi, {firstName} 👋</p>
          <p className="text-[11px] text-gray-400">{timeStr}</p>
        </div>

        {/* Quick add task */}
        <Link
          href="/tasks?new=1"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors flex-shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          Add Task
        </Link>

        {/* Bell */}
        {bellBtn}

        {/* Profile dropdown — Settings + Sign out only */}
        <div ref={profileRef} className="relative flex-shrink-0">
          <button
            onClick={() => { setShowProfile(v => !v); setShowNotifs(false); }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <UserAvatar picture={user?.picture} name={user?.name} size={32} />
            <div className="text-left hidden lg:block">
              <p className="text-xs font-semibold text-gray-800 leading-tight truncate max-w-[100px]">
                {user?.name}
              </p>
              <p className="text-[10px] text-gray-400 capitalize">{user?.role}</p>
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-[70]">
              {/* User header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <UserAvatar picture={user?.picture} name={user?.name} size={38} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setShowProfile(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <PencilSquareIcon className="w-4 h-4 text-gray-400" />
                  Edit Profile
                </Link>
                {user?.role === 'owner' && (
                  <Link
                    href="/settings#invite"
                    onClick={() => setShowProfile(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <UserPlusIcon className="w-4 h-4 text-gray-400" />
                    Invite Codes
                  </Link>
                )}
                <Link
                  href="/settings"
                  onClick={() => setShowProfile(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Cog6ToothIcon className="w-4 h-4 text-gray-400" />
                  Settings
                </Link>
              </div>

              <div className="border-t border-gray-100 pt-1">
                <button
                  onClick={() => { setShowProfile(false); logout(); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
