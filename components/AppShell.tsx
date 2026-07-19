'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import MobileNav from './MobileNav';
import TopBar from './TopBar';
import Tutorial from './Tutorial';
import CapacitorBackHandler from './CapacitorBackHandler';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { useTutorial } from '@/lib/use-tutorial';
import { useUnreadChat } from '@/lib/use-unread-chat';
import { usePendingTasks } from '@/lib/use-pending-tasks';
import { NavDataContext } from '@/lib/nav-data-context';

const AUTH_ROUTES = ['/dashboard', '/warehouses', '/search', '/tasks', '/production', '/stats', '/snapshots', '/chat', '/profile', '/storage', '/onboarding', '/deleted', '/scan', '/vault', '/settings', '/support'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, sessionExpired } = useAuth();
  const { show: showTutorial, dismiss: dismissTutorial } = useTutorial(user?.id);
  const isProtected = AUTH_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
  const showNav = isProtected && pathname !== '/onboarding' && pathname !== '/scan';
  const { count: unreadChat, preview: chatPreview, senderName: chatSender } = useUnreadChat();
  const { count: pendingTasks, firstTitle: firstTaskTitle } = usePendingTasks();

  useEffect(() => {
    if (loading) return;
    if (!user && isProtected) {
      if (sessionExpired) {
        router.replace('/login?session=expired');
      } else {
        router.replace('/login?returnTo=' + encodeURIComponent(pathname));
      }
      return;
    }
    // Redirect based on company approval state (skip /onboarding — it's the post-approval destination)
    if (user && isProtected && user.company_id && pathname !== '/onboarding') {
      if (user.company_suspended === true) { router.replace('/suspended'); return; }
      if (user.company_rejected === true)  { router.replace('/rejected');  return; }
      if (user.company_approved === false) { router.replace('/pending');   return; }
    }
  }, [loading, user, isProtected, router, pathname]);

  return (
    <NavDataContext.Provider value={{ unreadChat, pendingTasks, chatPreview, chatSender, firstTaskTitle }}>
      <CapacitorBackHandler />
      {showTutorial && isProtected && !loading && <Tutorial onDismiss={dismissTutorial} />}
      {showNav && <TopBar />}
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
      {showNav && <MobileNav />}
    </NavDataContext.Provider>
  );
}
