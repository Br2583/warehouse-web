'use client';

import { useState, useEffect } from 'react';
import { pb } from './pb';

// Only show tutorial to users created on or after this date (existing users are excluded)
const TUTORIAL_LAUNCH = new Date('2026-07-04T00:00:00Z');

export function useTutorial(userId: string | undefined) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const model = pb.authStore.model;
    if (!model) return;

    const alreadySeen = !!model.tutorial_seen;
    const created = new Date(model.created || 0);
    const isNewUser = created >= TUTORIAL_LAUNCH;

    if (!alreadySeen && isNewUser) {
      setDismissed(false);
    }
  }, [userId]);

  const dismiss = () => {
    setDismissed(true);
    if (userId) {
      pb.collection('users').update(userId, { tutorial_seen: '1' }).catch(() => {});
    }
  };

  return { show: !dismissed, dismiss };
}
