'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PaperAirplaneIcon, TrashIcon } from '@heroicons/react/24/outline';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/lib/auth-context';
import { notify, requestNotificationPermission } from '@/lib/notifications';

interface Message {
  id: string;
  sender_name: string;
  sender_email: string;
  sender_photo?: string;
  text: string;
  timestamp: string;
}

function formatTime(ts: string): string {
  if (!ts) return '';
  // PocketBase returns "2024-01-15 14:30:00.000Z" — ensure it's parsed as UTC
  const iso = ts.includes('T') ? ts : ts.replace(' ', 'T');
  const withZ = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z';
  const d = new Date(withZ);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const lastCountRef = useRef(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const scrollToBottom = useCallback((instant = false) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    if (!instant) {
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
  }, []);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  const fetchMessages = useCallback(() => {
    if (!user?.company_id) { setLoading(false); return Promise.resolve(); }
    return fetch(`/api/chat/messages?company_id=${encodeURIComponent(user.company_id)}`)
      .then(r => r.json())
      .then((msgs: Message[]) => {
        if (!Array.isArray(msgs)) throw new Error((msgs as any)?.error || 'Failed to load messages');
        if (lastCountRef.current >= 0 && msgs.length > lastCountRef.current) {
          const newest = msgs[msgs.length - 1];
          if (newest && newest.sender_email !== user?.email) {
            notify(`${newest.sender_name}`, newest.text);
          }
        }
        lastCountRef.current = msgs.length;
        setMessages(msgs);
      }).catch((err: any) => {
        setSendError(err?.message || 'Could not load messages');
      }).finally(() => setLoading(false));
  }, [user?.company_id, user?.email]);

  useEffect(() => {
    requestNotificationPermission();
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (loading || isAtBottomRef.current) {
      scrollToBottom(loading);
    }
  }, [messages, loading, scrollToBottom]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setSendError('');
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id:  user?.company_id,
          author_id:   user?.email,
          author_name: user?.name,
          text:        text.trim(),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || 'Failed to send message');
      }
      setText('');
      isAtBottomRef.current = true;
      await fetchMessages();
      scrollToBottom();
    } catch (err: any) {
      setSendError(err?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const deleteMsg = async (id: string) => {
    try {
      await fetch(`/api/chat/messages?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      fetchMessages();
    } catch {
      // deletion failed, list stays unchanged
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 flex flex-col" style={{ height: '100dvh' }}>
        <div className="p-6 md:p-8 pb-4 border-b border-gray-100 bg-white flex-shrink-0">
          <h1 className="text-2xl font-bold text-gray-900">Team Chat</h1>
          <p className="text-gray-500 text-sm mt-1">Internal company communication</p>
        </div>

        <div ref={containerRef} onScroll={onScroll} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No messages yet. Start the conversation!</div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.sender_email === user?.email;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.015, 0.3) }}
                  className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  {msg.sender_photo ? (
                    <img src={msg.sender_photo} alt={msg.sender_name} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full flex-shrink-0 mt-1" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-blue-600 text-xs font-bold">{msg.sender_name?.[0]}</span>
                    </div>
                  )}
                  <div className={`max-w-[75%] md:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    <span className="text-xs text-gray-400 mb-1">{isMe ? 'You' : msg.sender_name}</span>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm break-words ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'}`}>
                      {msg.text}
                    </div>
                    <span className="text-xs text-gray-300 mt-1">{formatTime(msg.timestamp)}</span>
                  </div>
                  {isMe && (
                    <button onClick={() => deleteMsg(msg.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all mt-2 flex-shrink-0">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </motion.div>
              );
            })
          )}
          <div />
        </div>

        <div className="bg-white border-t border-gray-100 flex-shrink-0">
          {sendError && (
            <div className="px-4 pt-3 text-xs text-red-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              {sendError}
            </div>
          )}
          <form onSubmit={send} className="p-4 pb-24 md:pb-4 flex gap-3">
            <input
              type="text"
              placeholder="Type a message..."
              value={text}
              onChange={e => { setText(e.target.value); if (sendError) setSendError(''); }}
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center flex-shrink-0"
            >
              {sending
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <PaperAirplaneIcon className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
