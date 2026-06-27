'use client';

import { useState, useEffect } from 'react';

export function useTutorial(pageKey: string) {
  const storageKey = `tutorial_seen_${pageKey}`;
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) setSeen(false);
  }, [storageKey]);

  const markSeen = () => {
    localStorage.setItem(storageKey, '1');
    setSeen(true);
  };

  const reset = () => {
    localStorage.removeItem(storageKey);
    setSeen(false);
  };

  return { seen, markSeen, reset };
}
