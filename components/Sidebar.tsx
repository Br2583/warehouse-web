'use client';

import { useAuth } from '@/lib/auth-context';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Package, Search, BarChart3,
  Camera, MessageSquare, Wrench, Trash2, User, LogOut, Building2
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/warehouses', label: 'Warehouses', icon: Building2 },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/production', label: 'Production', icon: Wrench },
  { href: '/stats', label: 'Statistics', icon: BarChart3 },
  { href: '/snapshots', label: 'Snapshots', icon: Camera },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/deleted', label: 'Deleted', icon: Trash2 },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="hidden md:flex w-64 bg-white border-r border-gray-100 h-screen flex-col shadow-sm fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">Warehouse</p>
            <p className="text-xs text-gray-400">{user?.company_name || 'Manager'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                  active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
                {active && (
                  <motion.div layoutId="activeIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          {user?.picture ? (
            <img src={user.picture} alt={user.name} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 text-xs font-bold">{user?.name?.[0]}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
