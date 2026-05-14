'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, Search, Wrench, User } from 'lucide-react';

const items = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/warehouses', label: 'Warehouses', icon: Building2 },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/production', label: 'Production', icon: Wrench },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-lg">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-0.5 px-3 py-1 flex-1">
              <Icon
                size={20}
                className={active ? 'text-blue-600' : 'text-gray-400'}
              />
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
