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
      className="native-bottom-nav fixed z-50 flex items-center px-3"
      style={{
        left: 14,
        right: 14,
        bottom: `calc(10px + env(safe-area-inset-bottom, 0px))`,
        height: 64,
        background: '#ffffff',
        borderRadius: 40,
        boxShadow: '0 6px 28px rgba(0,0,0,0.13), 0 1px 6px rgba(0,0,0,0.07)',
      }}
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
            className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full active:scale-95 transition-transform"
          >
            <div
              className="relative flex items-center justify-center"
              style={{
                width: 44,
                height: 34,
                borderRadius: 17,
                background: isActive ? '#2563eb' : 'transparent',
                transition: 'background 0.18s ease',
              }}
            >
              {isActive
                ? <IconActive className="w-[22px] h-[22px] text-white" />
                : <Icon className="w-[22px] h-[22px] text-gray-400" />}
              {badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-semibold leading-none ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
              {label}
            </span>
          </Link>
        );
      })}

      {/* More */}
      <button
        onClick={onOpenMore}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full active:scale-95 transition-transform"
      >
        <div
          className="flex items-center justify-center"
          style={{ width: 44, height: 34, borderRadius: 17 }}
        >
          <Bars3Icon className="w-[22px] h-[22px] text-gray-400" />
        </div>
        <span className="text-[10px] font-semibold leading-none text-gray-400">More</span>
      </button>
    </nav>
  );
}
