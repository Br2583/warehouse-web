'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavData } from '@/lib/nav-data-context';
import { useAuth } from '@/lib/auth-context';
import {
  HomeIcon,
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  ArchiveBoxIcon,
  MagnifyingGlassIcon,
  ChartBarSquareIcon,
  CameraIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  Squares2X2Icon,
  QrCodeIcon,
} from '@/components/icons';

const TABS = [
  { href: '/dashboard',  label: 'Home',       icon: HomeIcon },
  { href: '/warehouses', label: 'Warehouses', icon: BuildingOffice2Icon },
  { href: '/tasks',      label: 'Tasks',      icon: ClipboardDocumentListIcon },
  { href: '/chat',       label: 'Chat',       icon: ChatBubbleLeftRightIcon },
] as const;

const GRID_ITEMS = [
  { href: '/storage',   label: 'Storage',   icon: ArchiveBoxIcon,             managerOnly: false },
  { href: '/search',    label: 'Search',    icon: MagnifyingGlassIcon,        managerOnly: false },
  { href: '/stats',     label: 'Stats',     icon: ChartBarSquareIcon,         managerOnly: false },
  { href: '/scan',      label: 'Scan QR',   icon: QrCodeIcon,                 managerOnly: false },
  { href: '/snapshots', label: 'Snapshots', icon: CameraIcon,                 managerOnly: false },
  { href: '/activity',  label: 'Activity',  icon: ClipboardDocumentCheckIcon, managerOnly: true },
  { href: '/settings',  label: 'Settings',  icon: Cog6ToothIcon,              managerOnly: false },
];

export default function NativeBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { unreadChat, pendingTasks } = useNavData();
  const { canManage } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const visibleGrid = GRID_ITEMS.filter(item => !item.managerOnly || canManage);
  const isMoreActive = visibleGrid.some(item => pathname === item.href || pathname.startsWith(item.href + '/'));

  return (
    <nav
      className="native-bottom-nav fixed z-[45]"
      style={{
        left: 14,
        right: 14,
        bottom: `calc(10px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      {/* Backdrop — closes grid when tapping outside */}
      {moreOpen && (
        <div
          className="fixed inset-0"
          style={{ zIndex: -1 }}
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* Grid sheet */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute"
            style={{
              left: 0,
              right: 0,
              bottom: 'calc(100% + 8px)',
              background: '#ffffff',
              borderRadius: 20,
              padding: 12,
              boxShadow: '0 -4px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {visibleGrid.map(item => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <button
                    key={item.href}
                    onClick={() => { router.push(item.href); setMoreOpen(false); }}
                    className="active:scale-95 transition-transform"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 5,
                      padding: '10px 4px',
                      borderRadius: 14,
                      background: active ? '#eff6ff' : '#F9FAFB',
                      border: 'none',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    <Icon className={`w-6 h-6 ${active ? 'text-blue-600' : 'text-gray-600'}`} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: active ? '#2563eb' : '#374151' }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pill */}
      <div
        className="flex items-center px-3"
        style={{
          height: 64,
          background: '#ffffff',
          borderRadius: 40,
          boxShadow: '0 6px 28px rgba(0,0,0,0.13), 0 1px 6px rgba(0,0,0,0.07)',
        }}
      >
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          const badge = href === '/tasks' ? pendingTasks : href === '/chat' ? unreadChat : 0;

          return (
            <Link
              key={href}
              href={href}
              onClick={() => moreOpen && setMoreOpen(false)}
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
                <Icon className={`w-[22px] h-[22px] ${isActive ? 'text-white' : 'text-gray-400'}`} />
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

        {/* More button */}
        <button
          onClick={() => setMoreOpen(v => !v)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full active:scale-95 transition-transform"
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: 44,
              height: 34,
              borderRadius: 17,
              background: moreOpen || isMoreActive ? '#2563eb' : 'transparent',
              transition: 'background 0.18s ease',
            }}
          >
            <Squares2X2Icon className={`w-[22px] h-[22px] ${moreOpen || isMoreActive ? 'text-white' : 'text-gray-400'}`} />
          </div>
          <span className={`text-[10px] font-semibold leading-none ${moreOpen || isMoreActive ? 'text-blue-600' : 'text-gray-400'}`}>
            More
          </span>
        </button>
      </div>
    </nav>
  );
}
