'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import MobileNav from './MobileNav';
import { useAuth } from '@/lib/auth-context';

const AUTH_ROUTES = ['/dashboard', '/warehouses', '/search', '/production', '/stats', '/snapshots', '/chat', '/profile', '/storage', '/onboarding'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isProtected = AUTH_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
  const showNav = isProtected && pathname !== '/onboarding';

  useEffect(() => {
    if (loading) return;
    if (!user && isProtected) {
      router.replace('/login');
      return;
    }
    // Redirect based on company approval state (skip /onboarding — it's the post-approval destination)
    if (user && isProtected && user.company_id && pathname !== '/onboarding') {
      if (user.company_suspended === true) { router.replace('/suspended'); return; }
      if (user.company_approved === false && user.company_rejected !== true) { router.replace('/pending'); return; }
    }
  }, [loading, user, isProtected, router]);

  return (
    <>
      {children}
      {showNav && <MobileNav />}
    </>
  );
}
