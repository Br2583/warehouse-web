'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  HomeIcon, BuildingOffice2Icon, ArchiveBoxIcon, WrenchScrewdriverIcon,
  MagnifyingGlassIcon, ChartBarSquareIcon, CameraIcon, ChatBubbleLeftRightIcon,
  UserCircleIcon, ArrowRightOnRectangleIcon, Bars3Icon, XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolid, BuildingOffice2Icon as BuildingSolid, ArchiveBoxIcon as ArchiveSolid,
  WrenchScrewdriverIcon as WrenchSolid, MagnifyingGlassIcon as SearchSolid,
  ChartBarSquareIcon as ChartSolid, CameraIcon as CameraSolid,
  ChatBubbleLeftRightIcon as ChatSolid, UserCircleIcon as UserSolid,
} from '@heroicons/react/24/solid';

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',   icon: HomeIcon,                 iconActive: HomeSolid },
  { href: '/warehouses', label: 'Warehouses',  icon: BuildingOffice2Icon,      iconActive: BuildingSolid },
  { href: '/storage',    label: 'Storage',     icon: ArchiveBoxIcon,           iconActive: ArchiveSolid },
  { href: '/production', label: 'Production',  icon: WrenchScrewdriverIcon,    iconActive: WrenchSolid },
  { href: '/search',     label: 'Search',      icon: MagnifyingGlassIcon,      iconActive: SearchSolid },
  { href: '/stats',      label: 'Statistics',  icon: ChartBarSquareIcon,       iconActive: ChartSolid },
  { href: '/snapshots',  label: 'Snapshots',   icon: CameraIcon,               iconActive: CameraSolid },
  { href: '/chat',       label: 'Chat',        icon: ChatBubbleLeftRightIcon,  iconActive: ChatSolid },
  { href: '/profile',    label: 'Profile',     icon: UserCircleIcon,           iconActive: UserSolid },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      {/* Hamburger FAB */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="md:hidden fixed bottom-6 right-4 z-40 w-12 h-12 bg-white border border-gray-200 rounded-2xl shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Bars3Icon className="w-5 h-5 text-gray-700" />
      </button>

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
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">Warehouse</p>
              <p className="text-xs text-gray-400 truncate max-w-[140px]">{user?.company_name || 'Manager'}</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-9 h-9 rounded-xl hover:bg-gray-50 flex items-center justify-center"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon, iconActive: IconActive }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            const ActiveIcon = IconActive;
            const InactiveIcon = Icon;
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)}>
                <div className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                  active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}>
                  {active
                    ? <ActiveIcon className="w-5 h-5 flex-shrink-0 text-blue-600" />
                    : <InactiveIcon className="w-5 h-5 flex-shrink-0" />
                  }
                  <span className="text-sm font-medium">{label}</span>
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name || ''}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 text-xs font-bold">{user?.name?.[0]}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>
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
