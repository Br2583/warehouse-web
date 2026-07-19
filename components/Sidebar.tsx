'use client';

import { useAuth } from '@/lib/auth-context';
import { motion } from 'framer-motion';
import {
  HomeIcon, BuildingOffice2Icon, ArchiveBoxIcon, ClipboardDocumentListIcon,
  MagnifyingGlassIcon, ChartBarSquareIcon, CameraIcon, ChatBubbleLeftRightIcon,
  UserCircleIcon, LifebuoyIcon, Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolid, BuildingOffice2Icon as BuildingSolid, ArchiveBoxIcon as ArchiveSolid,
  ClipboardDocumentListIcon as TasksSolid, MagnifyingGlassIcon as SearchSolid,
  ChartBarSquareIcon as ChartSolid, CameraIcon as CameraSolid,
  ChatBubbleLeftRightIcon as ChatSolid, UserCircleIcon as UserSolid,
  LifebuoyIcon as LifebuoySolid, Cog6ToothIcon as CogSolid,
} from '@heroicons/react/24/solid';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavData } from '@/lib/nav-data-context';

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',  icon: HomeIcon,                   iconActive: HomeSolid },
  { href: '/warehouses', label: 'Warehouses', icon: BuildingOffice2Icon,        iconActive: BuildingSolid },
  { href: '/storage',    label: 'Storage',    icon: ArchiveBoxIcon,             iconActive: ArchiveSolid },
  { href: '/tasks',      label: 'Tasks',      icon: ClipboardDocumentListIcon,  iconActive: TasksSolid },
  { href: '/search',     label: 'Search',     icon: MagnifyingGlassIcon,        iconActive: SearchSolid },
  { href: '/stats',      label: 'Statistics', icon: ChartBarSquareIcon,         iconActive: ChartSolid },
  { href: '/snapshots',  label: 'Snapshots',  icon: CameraIcon,                 iconActive: CameraSolid },
  { href: '/chat',       label: 'Chat',       icon: ChatBubbleLeftRightIcon,    iconActive: ChatSolid },
  { href: '/profile',    label: 'Profile',    icon: UserCircleIcon,             iconActive: UserSolid },
  { href: '/support',    label: 'Support',    icon: LifebuoyIcon,               iconActive: LifebuoySolid },
  { href: '/settings',   label: 'Settings',   icon: Cog6ToothIcon,              iconActive: CogSolid },
];

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { unreadChat, pendingTasks } = useNavData();

  return (
    <div className="hidden md:flex w-64 bg-white border-r border-gray-100 h-screen flex-col shadow-sm fixed left-0 top-0 z-40">
      {/* Logo — aligned with TopBar height (h-16) */}
      <div className="h-16 px-6 border-b border-gray-100 flex items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-950 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-[10px] italic leading-none">WM</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">Warehouse Manager</p>
            <p className="text-xs text-gray-400 truncate max-w-[140px]">{user?.company_name || 'Manager'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = active ? item.iconActive : item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                  active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Icon className="w-5 h-5" />
                  {item.href === '/chat' && unreadChat > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {unreadChat > 9 ? '9+' : unreadChat}
                    </span>
                  )}
                  {item.href === '/tasks' && pendingTasks > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {pendingTasks > 9 ? '9+' : pendingTasks}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium">{item.label}</span>
                {active && (
                  <motion.div layoutId="activeIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
