'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { pb } from '@/lib/pb';

function localKey(email: string, pageKey: string) {
  return `tutorial_seen_${email}_${pageKey}`;
}

async function fetchServerSeen(): Promise<string> {
  try {
    const token = pb.authStore.token;
    if (!token) return '';
    const res = await fetch('/api/user/tutorial', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.tutorial_seen || '';
  } catch { return ''; }
}

async function pushServerSeen(seen: string) {
  try {
    const token = pb.authStore.token;
    if (!token) return;
    await fetch('/api/user/tutorial', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tutorial_seen: seen }),
    });
  } catch {}
}

export function useTutorial(pageKey: string) {
  const { user } = useAuth();
  const [seen, setSeen] = useState(true); // default true = don't flash on load
  const synced = useRef(false);

  useEffect(() => {
    if (!user) return;
    const email = user.email;

    // 1. Check localStorage immediately (fast path)
    if (localStorage.getItem(localKey(email, pageKey))) {
      setSeen(true);
      return;
    }

    // 2. Sync with server once per session
    if (synced.current) {
      setSeen(false);
      return;
    }
    synced.current = true;

    fetchServerSeen().then(serverVal => {
      const pages = serverVal ? serverVal.split(',') : [];
      // Hydrate localStorage from server data
      for (const p of pages) {
        if (p) localStorage.setItem(localKey(email, p), '1');
      }
      if (pages.includes(pageKey)) {
        setSeen(true);
      } else {
        setSeen(false);
      }
    });
  }, [user, pageKey]);

  const markSeen = () => {
    if (!user) return;
    const email = user.email;
    localStorage.setItem(localKey(email, pageKey), '1');
    setSeen(true);

    // Build full seen list from localStorage and push to server
    const all = Object.keys(localStorage)
      .filter(k => k.startsWith(`tutorial_seen_${email}_`))
      .map(k => k.replace(`tutorial_seen_${email}_`, ''))
      .join(',');
    pushServerSeen(all);
  };

  const reset = () => {
    if (!user) return;
    localStorage.removeItem(localKey(user.email, pageKey));
    setSeen(false);
    // Update server
    const all = Object.keys(localStorage)
      .filter(k => k.startsWith(`tutorial_seen_${user.email}_`))
      .map(k => k.replace(`tutorial_seen_${user.email}_`, ''))
      .join(',');
    pushServerSeen(all);
  };

  return { seen, markSeen, reset };
}
