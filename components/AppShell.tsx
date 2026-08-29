'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { prefetchPhotoToken } from '@/lib/photo-url';
import MobileNav from './MobileNav';
import TopBar from './TopBar';
import Tutorial from './Tutorial';
import CapacitorBackHandler from './CapacitorBackHandler';
import NativeBottomNav from './NativeBottomNav';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { useTutorial } from '@/lib/use-tutorial';
import { useUnreadChat } from '@/lib/use-unread-chat';
import { usePendingTasks } from '@/lib/use-pending-tasks';
import { NavDataContext } from '@/lib/nav-data-context';
import { PROTECTED_ROUTES } from '@/lib/protected-routes';

const AUTH_ROUTES = [...PROTECTED_ROUTES, '/push-debug'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, sessionExpired } = useAuth();

  // Ask for the photo access token the moment the session is up, so opening a
  // vault does not spend a round trip before it can request the first image.
  useEffect(() => { if (user) prefetchPhotoToken(); }, [user]);

  const { show: showTutorial, dismiss: dismissTutorial } = useTutorial(user?.id);
  const isProtected = AUTH_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
  const showNav = isProtected && pathname !== '/onboarding' && pathname !== '/scan' && !pathname.endsWith('/print');
  const { count: unreadChat, preview: chatPreview, senderName: chatSender } = useUnreadChat();
  const { count: pendingTasks, firstTitle: firstTaskTitle } = usePendingTasks();
  const [navOpen, setNavOpen] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    import('@capacitor/core').then(({ Capacitor }) => {
      if (!Capacitor.isNativePlatform()) return;
      setIsNative(true);
      // Hide bottom nav when keyboard opens to reclaim space
      import('@capacitor/keyboard').then(({ Keyboard }) => {
        Keyboard.addListener('keyboardWillShow', () => {
          document.documentElement.classList.add('keyboard-open');
        });
        Keyboard.addListener('keyboardWillHide', () => {
          document.documentElement.classList.remove('keyboard-open');
        });
      }).catch(() => {});
    });
  }, []);

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

  // While auth is resolving, or just after resolving with no user, show blank to prevent
  // a single-frame flash of protected content before the redirect fires.
  if (isProtected && (loading || !user)) return <div style={{ minHeight: '100vh', background: '#fff' }} />;

  return (
    <NavDataContext.Provider value={{ unreadChat, pendingTasks, chatPreview, chatSender, firstTaskTitle }}>
      <CapacitorBackHandler />
      {showTutorial && isProtected && !loading && <Tutorial onDismiss={dismissTutorial} />}
      {showNav && <TopBar onOpenNav={() => setNavOpen(true)} />}
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={isNative && showNav ? 'native-bottom-pad' : undefined}
      >
        {children}
      </motion.div>
      {showNav && <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />}
      {showNav && isNative && <NativeBottomNav />}
    </NavDataContext.Provider>
  );
}
