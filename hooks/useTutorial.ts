'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

export function useTutorial(pageKey: string) {
  const { user } = useAuth();
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    if (!user) return;
    const key = `tutorial_seen_${user.email}_${pageKey}`;
    if (!localStorage.getItem(key)) setSeen(false);
  }, [user, pageKey]);

  const markSeen = () => {
    if (!user) return;
    localStorage.setItem(`tutorial_seen_${user.email}_${pageKey}`, '1');
    setSeen(true);
  };

  const reset = () => {
    if (!user) return;
    localStorage.removeItem(`tutorial_seen_${user.email}_${pageKey}`);
    setSeen(false);
  };

  return { seen, markSeen, reset };
}
