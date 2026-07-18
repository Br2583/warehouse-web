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
      const res = await fetch('/api/chat/messages?perPage=1&sort=-sent_at', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const msgs: { timestamp: string }[] = await res.json();
      if (!msgs.length) { setCount(0); return; }
      const iso = msgs[0].timestamp.includes('T') ? msgs[0].timestamp : msgs[0].timestamp.replace(' ', 'T');
      const ts = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z').getTime();
      setCount(ts > getChatLastSeen() ? 1 : 0);
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
