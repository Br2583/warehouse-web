'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Squares2X2Icon, BuildingOffice2Icon, MagnifyingGlassIcon, WrenchScrewdriverIcon,
  ChartBarIcon, CameraIcon, ChatBubbleLeftRightIcon, TrashIcon, UserIcon, ArchiveBoxIcon,
} from '@heroicons/react/24/outline';

const items = [
  { href: '/dashboard',   label: 'Home',        icon: Squares2X2Icon },
  { href: '/warehouses',  label: 'Warehouses',  icon: BuildingOffice2Icon },
  { href: '/search',      label: 'Search',      icon: MagnifyingGlassIcon },
  { href: '/production',  label: 'Production',  icon: WrenchScrewdriverIcon },
  { href: '/chat',        label: 'Chat',        icon: ChatBubbleLeftRightIcon },
  { href: '/stats',       label: 'Stats',       icon: ChartBarIcon },
  { href: '/snapshots',   label: 'Snapshots',   icon: CameraIcon },
  { href: '/storage',     label: 'Storage',     icon: ArchiveBoxIcon },
  { href: '/deleted',     label: 'Deleted',     icon: TrashIcon },
  { href: '/profile',     label: 'Profile',     icon: UserIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-lg">
      <div className="flex overflow-x-auto scrollbar-none px-1 py-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 flex-shrink-0 min-w-[64px]"
            >
              <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={`text-[10px] font-medium ${active ? 'text-blue-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
