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
      const res = await fetch('/api/chat/messages?perPage=1&sort=-sent_at', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const msgs: { timestamp: string; text?: string; sender_name?: string }[] = await res.json();
      if (!msgs.length) { setData({ count: 0, preview: null, senderName: null }); return; }

      const lastSeen = getChatLastSeen();
      const newest = msgs[0];
      const iso = newest.timestamp.includes('T') ? newest.timestamp : newest.timestamp.replace(' ', 'T');
      const ts = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z').getTime();
      const isUnread = ts > lastSeen;

      setData({
        count: isUnread ? 1 : 0,
        preview: isUnread ? (newest.text?.slice(0, 80) || null) : null,
        senderName: isUnread ? (newest.sender_name || null) : null,
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
