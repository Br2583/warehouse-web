'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavData } from '@/lib/nav-data-context';
import {
  HomeIcon,
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolid,
  BuildingOffice2Icon as BuildingSolid,
  ClipboardDocumentListIcon as TasksSolid,
  ChatBubbleLeftRightIcon as ChatSolid,
} from '@heroicons/react/24/solid';

interface NativeBottomNavProps {
  onOpenMore: () => void;
}

const TABS = [
  { href: '/dashboard',  label: 'Home',       icon: HomeIcon,                  iconActive: HomeSolid },
  { href: '/warehouses', label: 'Warehouses', icon: BuildingOffice2Icon,       iconActive: BuildingSolid },
  { href: '/tasks',      label: 'Tasks',      icon: ClipboardDocumentListIcon, iconActive: TasksSolid },
  { href: '/chat',       label: 'Chat',       icon: ChatBubbleLeftRightIcon,   iconActive: ChatSolid },
] as const;

export default function NativeBottomNav({ onOpenMore }: NativeBottomNavProps) {
  const pathname = usePathname();
  const { unreadChat, pendingTasks } = useNavData();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-100 flex items-stretch"
      style={{ height: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div
        className="flex w-full items-center"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {TABS.map(({ href, label, icon: Icon, iconActive: IconActive }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          const badge =
            href === '/tasks' ? pendingTasks :
            href === '/chat'  ? unreadChat   : 0;

          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full active:opacity-60 transition-opacity"
            >
              <div className="relative">
                {isActive
                  ? <IconActive className="w-6 h-6 text-blue-600" />
                  : <Icon className="w-6 h-6 text-gray-400" />}
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </Link>
          );
        })}

        {/* More — opens MobileNav drawer */}
        <button
          onClick={onOpenMore}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full active:opacity-60 transition-opacity"
        >
          <Bars3Icon className="w-6 h-6 text-gray-400" />
          <span className="text-[10px] font-medium text-gray-400">More</span>
        </button>
      </div>
    </nav>
  );
}
