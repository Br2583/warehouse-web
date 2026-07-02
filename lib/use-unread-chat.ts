'use client';

import { useEffect, useState, useCallback } from 'react';
import { getChatLastSeen } from './unread-chat';
import { getToken } from './api';

export function useUnreadChat(): number {
  const [count, setCount] = useState(0);

  const check = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/chat/messages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const msgs: { timestamp: string }[] = await res.json();
      const lastSeen = getChatLastSeen();
      const unread = msgs.filter(m => {
        const iso = m.timestamp.includes('T') ? m.timestamp : m.timestamp.replace(' ', 'T');
        const ts = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z').getTime();
        return ts > lastSeen;
      }).length;
      setCount(unread);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [check]);

  return count;
}
