'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Trash2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { notify, requestNotificationPermission } from '@/lib/notifications';
import TutorialOverlay from '@/components/TutorialOverlay';
import { useTutorial } from '@/hooks/useTutorial';

interface Message {
  id: string;
  sender_name: string;
  sender_email: string;
  sender_photo?: string;
  text: string;
  image?: string;
  timestamp: string;
}

const TUTORIAL_STEPS = [
  { target: 'chat-header', title: 'Team Chat', text: 'Stay in sync with your team. Messages refresh automatically every 10 seconds — no need to reload.', position: 'bottom' as const },
  { target: 'chat-messages', title: 'Conversation', text: 'Your messages appear on the right in blue. Team messages appear on the left. Hover to delete your own messages.', position: 'top' as const },
  { target: 'chat-input', title: 'Send a Message', text: 'Type here and hit Enter or the send button. Keep communication clear and on-topic for faster operations.', position: 'top' as const },
];

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(-1);
  const { seen, markSeen } = useTutorial('chat');

  const fetchMessages = () =>
    api.get('/api/chat/messages').then((msgs: Message[]) => {
      if (lastCountRef.current >= 0 && msgs.length > lastCountRef.current) {
        const newest = msgs[msgs.length - 1];
        if (newest && newest.sender_email !== user?.email) {
          notify(`${newest.sender_name}`, newest.text);
        }
      }
      lastCountRef.current = msgs.length;
      setMessages(msgs);
    }).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => {
    requestNotificationPermission();
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setSendError('');
    try {
      await api.post('/api/chat/messages', {
        sender_email: user?.email,
        sender_name: user?.name,
        sender_photo: user?.picture || null,
        text: text.trim(),
      });
      setText('');
      fetchMessages();
    } catch (err: any) {
      setSendError(err?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const deleteMsg = async (id: string) => {
    try {
      await api.delete(`/api/chat/messages/${id}`);
      fetchMessages();
    } catch {
      // deletion failed, list stays unchanged
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {!seen && <TutorialOverlay steps={TUTORIAL_STEPS} onDone={markSeen} />}
      <Sidebar />
      <main className="md:ml-64 flex-1 flex flex-col" style={{ height: '100dvh' }}>
        <div data-tutorial="chat-header" className="p-8 pb-4 border-b border-gray-100 bg-white">
          <h1 className="text-2xl font-bold text-gray-900">Team Chat</h1>
          <p className="text-gray-500 text-sm mt-1">Internal company communication</p>
        </div>

        <div data-tutorial="chat-messages" className="flex-1 overflow-y-auto p-6 space-y-4">
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  {msg.sender_photo ? (
                    <img src={msg.sender_photo} alt={msg.sender_name} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full flex-shrink-0 mt-1" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-blue-600 text-xs font-bold">{msg.sender_name?.[0]}</span>
                    </div>
                  )}
                  <div className={`max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    <span className="text-xs text-gray-400 mb-1">{isMe ? 'You' : msg.sender_name}</span>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'}`}>
                      {msg.text}
                    </div>
                    <span className="text-xs text-gray-300 mt-1">{new Date(msg.timestamp?.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {isMe && (
                    <button onClick={() => deleteMsg(msg.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all mt-2">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </motion.div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div data-tutorial="chat-input" className="bg-white border-t border-gray-100">
          {sendError && (
            <div className="px-4 pt-3 text-xs text-red-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              {sendError}
            </div>
          )}
          <form onSubmit={send} className="p-4 pb-20 md:pb-4 flex gap-3">
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
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
            >
              {sending
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

