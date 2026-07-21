'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { UserAvatar } from '@/components/UserAvatar';
import {
  HomeIcon, BuildingOffice2Icon, ArchiveBoxIcon, ClipboardDocumentListIcon,
  MagnifyingGlassIcon, ChartBarSquareIcon, CameraIcon, ChatBubbleLeftRightIcon,
  ArrowRightOnRectangleIcon, Bars3Icon, XMarkIcon,
  QrCodeIcon, Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolid, BuildingOffice2Icon as BuildingSolid, ArchiveBoxIcon as ArchiveSolid,
  ClipboardDocumentListIcon as TasksSolid, MagnifyingGlassIcon as SearchSolid,
  ChartBarSquareIcon as ChartSolid, CameraIcon as CameraSolid,
  ChatBubbleLeftRightIcon as ChatSolid, Cog6ToothIcon as CogSolid,
} from '@heroicons/react/24/solid';
import { useNavData } from '@/lib/nav-data-context';

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',   icon: HomeIcon,                  iconActive: HomeSolid },
  { href: '/warehouses', label: 'Warehouses',  icon: BuildingOffice2Icon,       iconActive: BuildingSolid },
  { href: '/storage',    label: 'Storage',     icon: ArchiveBoxIcon,            iconActive: ArchiveSolid },
  { href: '/tasks',      label: 'Tasks',       icon: ClipboardDocumentListIcon, iconActive: TasksSolid },
  { href: '/search',     label: 'Search',      icon: MagnifyingGlassIcon,       iconActive: SearchSolid },
  { href: '/stats',      label: 'Statistics',  icon: ChartBarSquareIcon,        iconActive: ChartSolid },
  { href: '/snapshots',  label: 'Snapshots',   icon: CameraIcon,                iconActive: CameraSolid },
  { href: '/chat',       label: 'Chat',        icon: ChatBubbleLeftRightIcon,   iconActive: ChatSolid },
  { href: '/settings',   label: 'Settings',    icon: Cog6ToothIcon,             iconActive: CogSolid },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { unreadChat, pendingTasks } = useNavData();

  return (
    <>
      {/* Hamburger FAB — hidden when drawer is open so it doesn't float above the backdrop */}
      {!open && <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        style={{ bottom: 'calc(1rem + var(--safe-area-bottom))' }}
        className="md:hidden fixed right-4 z-[60] w-10 h-10 flex items-center justify-center active:scale-95 transition-transform"
      >
        <div className="relative">
          <Bars3Icon className="w-6 h-6 text-gray-600" />
          {(unreadChat + pendingTasks) > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
              {(unreadChat + pendingTasks) > 9 ? '9+' : unreadChat + pendingTasks}
            </span>
          )}
        </div>
      </button>}

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-72 bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header — logo + close */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-950 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-[9px] italic leading-none">WM</span>
            </div>
            <p className="font-bold text-gray-900 text-sm">Warehouse</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-xl hover:bg-gray-50 flex items-center justify-center"
          >
            <XMarkIcon className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* User profile card */}
        <Link
          href="/profile"
          onClick={() => setOpen(false)}
          className="mx-4 mb-3 p-3 bg-gray-50 rounded-2xl flex items-center gap-3 active:bg-gray-100 transition-colors"
        >
          <UserAvatar picture={user?.picture} name={user?.name} size={40} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role} · {user?.company_name}</p>
          </div>
        </Link>

        {/* Scan QR — prominent CTA */}
        <div className="px-4 pt-4 pb-2">
          <Link
            href="/scan"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 w-full bg-blue-600 text-white rounded-2xl px-4 py-3.5 font-semibold text-sm active:scale-95 transition-transform"
          >
            <QrCodeIcon className="w-5 h-5 flex-shrink-0" />
            Scan QR Code
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon, iconActive: IconActive }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            const ActiveIcon = IconActive;
            const InactiveIcon = Icon;
            const badge = href === '/chat' ? unreadChat : href === '/tasks' ? pendingTasks : 0;
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)}>
                <div className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                  active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}>
                  <div className="relative flex-shrink-0">
                    {active
                      ? <ActiveIcon className="w-5 h-5 text-blue-600" />
                      : <InactiveIcon className="w-5 h-5" />
                    }
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer — sign out */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
