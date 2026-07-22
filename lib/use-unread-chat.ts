'use client';

import { useEffect, useState, useCallback } from 'react';
import { getChatLastSeen } from './unread-chat';
import { getToken } from './api';

export interface ChatUnreadData {
  count: number;
  preview: string | null;
  senderName: string | null;
}

export function useUnreadChat(): ChatUnreadData {
  const [data, setData] = useState<ChatUnreadData>({ count: 0, preview: null, senderName: null });

  const check = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/chat/messages?perPage=50&sort=-sent_at', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const msgs: { timestamp: string; text?: string; sender_name?: string }[] = await res.json();
      if (!msgs.length) { setData({ count: 0, preview: null, senderName: null }); return; }

      const lastSeen = getChatLastSeen();
      const unread = msgs.filter(m => {
        const iso = m.timestamp.includes('T') ? m.timestamp : m.timestamp.replace(' ', 'T');
        const ts = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z').getTime();
        return ts > lastSeen;
      });

      const newest = unread[0];
      setData({
        count: unread.length,
        preview: newest ? (newest.text?.slice(0, 80) || null) : null,
        senderName: newest ? (newest.sender_name || null) : null,
      });
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 15_000);
    return () => clearInterval(id);
  }, [check]);

  return data;
}
