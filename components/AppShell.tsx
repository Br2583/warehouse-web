'use client';

import { usePathname } from 'next/navigation';
import BottomNav from './BottomNav';

const AUTH_ROUTES = ['/dashboard', '/warehouses', '/search', '/production', '/stats', '/snapshots', '/chat', '/deleted', '/profile'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = AUTH_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));

  return (
    <>
      {children}
      {showNav && <BottomNav />}
    </>
  );
}
