'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Squares2X2Icon, BuildingOffice2Icon, MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon, EllipsisHorizontalIcon,
  WrenchScrewdriverIcon, ChartBarIcon, CameraIcon,
  ArchiveBoxIcon, TrashIcon, UserIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { useUnreadChat } from '@/lib/use-unread-chat';

const mainItems = [
  { href: '/dashboard',  label: 'Home',    icon: Squares2X2Icon },
  { href: '/warehouses', label: 'Warehouses', icon: BuildingOffice2Icon },
  { href: '/search',     label: 'Search',  icon: MagnifyingGlassIcon },
  { href: '/chat',       label: 'Chat',    icon: ChatBubbleLeftRightIcon },
];

const moreItems = [
  { href: '/production', label: 'Production', icon: WrenchScrewdriverIcon },
  { href: '/stats',      label: 'Stats',      icon: ChartBarIcon },
  { href: '/snapshots',  label: 'Snapshots',  icon: CameraIcon },
  { href: '/storage',    label: 'Storage',    icon: ArchiveBoxIcon },
  { href: '/deleted',    label: 'Deleted',    icon: TrashIcon },
  { href: '/profile',    label: 'Profile',    icon: UserIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const unread = useUnreadChat();

  const isMoreActive = moreItems.some(
    i => pathname === i.href || pathname.startsWith(i.href + '/')
  );

  return (
    <>
      {/* More drawer overlay */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More drawer */}
      <div className={`md:hidden fixed bottom-16 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-xl rounded-t-2xl transition-transform duration-200 ${moreOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">More</span>
          <button onClick={() => setMoreOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
            <XMarkIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1 p-3 pb-safe">
          {moreItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className={`text-[10px] font-medium ${active ? 'text-blue-600' : 'text-gray-500'}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-lg">
        <div className="flex items-stretch h-16">
          {mainItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            const isChat = href === '/chat';
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                  {isChat && unread > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${active ? 'text-blue-600' : 'text-gray-400'}`}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(s => !s)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5"
          >
            {moreOpen ? (
              <XMarkIcon className={`w-5 h-5 ${isMoreActive ? 'text-blue-600' : 'text-gray-400'}`} />
            ) : (
              <EllipsisHorizontalIcon className={`w-5 h-5 ${isMoreActive ? 'text-blue-600' : 'text-gray-400'}`} />
            )}
            <span className={`text-[10px] font-medium ${isMoreActive ? 'text-blue-600' : 'text-gray-400'}`}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
