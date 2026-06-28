'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import BottomNav from './BottomNav';
import { useAuth } from '@/lib/auth-context';

const AUTH_ROUTES = ['/dashboard', '/warehouses', '/search', '/production', '/stats', '/snapshots', '/chat', '/deleted', '/profile', '/storage', '/onboarding'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isProtected = AUTH_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
  const showNav = isProtected;

  useEffect(() => {
    if (loading) return;
    if (!user && isProtected) {
      router.replace('/login');
      return;
    }
    // Redirect based on company approval state (only on protected routes)
    if (user && isProtected && user.company_id) {
      if (user.company_suspended) { router.replace('/suspended'); return; }
      if (user.company_approved === false && !user.company_rejected) { router.replace('/pending'); return; }
    }
  }, [loading, user, isProtected, router]);

  return (
    <>
      {children}
      {showNav && <BottomNav />}
    </>
  );
}
