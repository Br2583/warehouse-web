'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { getChatLastSeen } from './unread-chat';
import { getToken } from './api';

export interface ChatUnreadData {
  count: number;
  preview: string | null;
  senderName: string | null;
}

export function useUnreadChat(): ChatUnreadData {
  const [data, setData] = useState<ChatUnreadData>({ count: 0, preview: null, senderName: null });
  const pathname = usePathname();

  const check = useCallback(async () => {
    // Skip polling when user is already on the chat page — it manages its own messages
    if (pathname === '/chat') return;
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/chat/messages?perPage=5&sort=-sent_at', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const msgs: { timestamp: string; text?: string; sender_name?: string }[] = await res.json();
      if (!msgs.length) { setData({ count: 0, preview: null, senderName: null }); return; }

      const lastSeen = getChatLastSeen();
      const toMs = (ts: string) => {
        const iso = ts.includes('T') ? ts : ts.replace(' ', 'T');
        return new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z').getTime();
      };

      const unread = msgs.filter(m => toMs(m.timestamp) > lastSeen);
      const newest = msgs[0];

      setData({
        count: unread.length,
        preview: unread.length > 0 ? (newest.text?.slice(0, 80) || null) : null,
        senderName: unread.length > 0 ? (newest.sender_name || null) : null,
      });
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 15_000);
    return () => clearInterval(id);
  }, [check, pathname]);

  return data;
}
