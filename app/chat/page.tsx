'use client';

import { useEffect, useState, useRef, useCallback, useMemo, Fragment } from 'react';
import { motion } from 'framer-motion';
import { PaperAirplaneIcon, TrashIcon } from '@/components/icons';
import Sidebar from '@/components/Sidebar';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/lib/auth-context';
import { api, getToken } from '@/lib/api';
import { notify, requestNotificationPermission } from '@/lib/notifications';
import { markChatSeen } from '@/lib/unread-chat';

interface Message {
  id: string;
  sender_name: string;
  sender_id: string;
  sender_photo?: string;
  text: string;
  timestamp: string;
  type?: 'text' | 'image' | 'system';
  mentions?: string[];
}

// PocketBase returns "2024-01-15 14:30:00.000Z" — parse it as UTC.
function msgDate(ts: string): Date | null {
  if (!ts) return null;
  const iso = ts.includes('T') ? ts : ts.replace(' ', 'T');
  const withZ = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z';
  const d = new Date(withZ);
  return isNaN(d.getTime()) ? null : d;
}

function formatTime(ts: string): string {
  const d = msgDate(ts);
  return d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
}

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function sameDay(a: string, b: string): boolean {
  const da = msgDate(a), db = msgDate(b);
  return !!da && !!db && dayStart(da) === dayStart(db);
}

// Day divider label: "Today" / "Yesterday" / "Mon, Mar 3" (year only if not this one).
function formatDay(ts: string): string {
  const d = msgDate(ts);
  if (!d) return '';
  const diff = Math.round((dayStart(new Date()) - dayStart(d)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString([], {
    weekday: 'short', month: 'short', day: 'numeric',
    year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

export default function ChatPage() {
  const { user, canManage, isOwner } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers]   = useState<{ user_id: string; name: string; picture?: string; role?: string }[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const lastCountRef = useRef(-1);
  const lastIdRef    = useRef('');
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const fetchingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // @mention autocomplete
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(0);
  const [mentionIdx, setMentionIdx] = useState(0);

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
    if (fetchingRef.current) return Promise.resolve();
    if (!user?.company_id) { setLoading(false); return Promise.resolve(); }
    fetchingRef.current = true;
    const token = getToken();
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 15_000);
    return fetch('/api/chat/messages', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: ctrl.signal,
    })
      .then(r => r.json())
      .then((msgs: Message[]) => {
        if (!Array.isArray(msgs)) throw new Error((msgs as any)?.error || 'Failed to load messages');
        const newest  = msgs[msgs.length - 1];
        const hadNew  = lastCountRef.current >= 0 && !!newest && newest.id !== lastIdRef.current;
        if (hadNew) {
          if (newest && newest.sender_id !== user?.id) {
            notify(newest.type === 'system' ? 'Task update' : `${newest.sender_name}`, newest.text);
          }
          markChatSeen();
        } else if (lastCountRef.current < 0) {
          markChatSeen(); // first load
        }
        lastCountRef.current = msgs.length;
        if (newest) lastIdRef.current = newest.id;
        setMessages(msgs);
        setSendError('');
      }).catch((err: any) => {
        const msg = err?.name === 'AbortError' ? 'Connection timed out — retrying…' : (err?.message || 'Could not load messages');
        setSendError(msg);
      }).finally(() => { clearTimeout(tid); fetchingRef.current = false; setLoading(false); });
  }, [user?.company_id, user?.id]);

  useEffect(() => {
    requestNotificationPermission();
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (!user?.company_id) return;
    api.get('/api/company/members')
      .then((m: any) => setMembers(Array.isArray(m) ? m : []))
      .catch(() => {});
  }, [user?.company_id]);

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
      const token = getToken();
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text: text.trim(), mentions: extractMentions(text) }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || 'Failed to send message');
      }
      setText('');
      setMentionOpen(false);
      isAtBottomRef.current = true;
      scrollToBottom();
      fetchMessages(); // fire-and-forget; polling picks it up within 5s
    } catch (err: any) {
      setSendError(err?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    setClearing(true);
    try {
      const token = getToken();
      const res = await fetch('/api/chat/messages/all', {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSendError((err as any)?.error || 'Failed to clear chat');
        return;
      }
      setMessages([]);
      lastCountRef.current = 0;
    } catch {
      setSendError('Failed to clear chat');
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  };

  const deleteMsg = async (id: string) => {
    const token = getToken();
    try {
      const res = await fetch(`/api/chat/messages?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || 'Failed to delete message');
      }
      await fetchMessages();
    } catch (err: any) {
      setSendError(err?.message || 'Could not delete message');
    }
  };

  // Matches @<member name> in message text — names sorted longest-first so a
  // multi-word name wins over a shorter one that prefixes it.
  const mentionRegex = useMemo(() => {
    const names = members.map(m => m.name).filter(Boolean) as string[];
    if (!names.length) return null;
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const alt = [...names].sort((a, b) => b.length - a.length).map(esc).join('|');
    return new RegExp(`@(${alt})`, 'g');
  }, [members]);

  const renderText = useCallback((value: string, isMe: boolean): React.ReactNode => {
    if (!mentionRegex || !value) return value;
    const myName = (user?.name || '').toLowerCase();
    const out: React.ReactNode[] = [];
    let last = 0, key = 0;
    mentionRegex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = mentionRegex.exec(value)) !== null) {
      if (m.index > last) out.push(value.slice(last, m.index));
      const name = m[1];
      const me = !!myName && name.toLowerCase() === myName;
      out.push(
        <span key={`m${key++}`} className={
          me
            ? (isMe ? 'font-semibold bg-white/25 rounded px-1' : 'font-semibold text-blue-700 bg-blue-100 rounded px-1')
            : (isMe ? 'font-semibold text-white underline decoration-white/40' : 'font-semibold text-blue-600')
        }>@{name}</span>
      );
      last = m.index + m[0].length;
    }
    if (last < value.length) out.push(value.slice(last));
    return out;
  }, [mentionRegex, user?.name]);

  const extractMentions = useCallback((value: string): string[] => {
    if (!mentionRegex) return [];
    const ids = new Set<string>();
    mentionRegex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = mentionRegex.exec(value)) !== null) {
      const mem = members.find(x => (x.name || '').toLowerCase() === m![1].toLowerCase());
      if (mem && mem.user_id !== user?.id) ids.add(mem.user_id);
    }
    return [...ids];
  }, [mentionRegex, members, user?.id]);

  const mentionCandidates = useMemo(() => {
    if (!mentionOpen) return [];
    const q = mentionQuery.toLowerCase();
    return members
      .filter(m => m.user_id !== user?.id && (m.name || '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionOpen, mentionQuery, members, user?.id]);

  const insertMention = useCallback((name: string) => {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, mentionStart);
    const after = text.slice(caret);
    const inserted = `@${name} `;
    setText(before + inserted + after);
    setMentionOpen(false);
    setMentionQuery('');
    requestAnimationFrame(() => {
      if (el) {
        const pos = (before + inserted).length;
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  }, [text, mentionStart]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);
    if (sendError) setSendError('');
    const caret = e.target.selectionStart ?? val.length;
    const before = val.slice(0, caret);
    const m = before.match(/(?:^|\s)@([^\s@]*)$/);
    if (m) {
      setMentionOpen(true);
      setMentionQuery(m[1]);
      setMentionStart(caret - m[1].length - 1); // index of the '@'
      setMentionIdx(0);
    } else {
      setMentionOpen(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!mentionOpen || mentionCandidates.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => (i + 1) % mentionCandidates.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx(i => (i - 1 + mentionCandidates.length) % mentionCandidates.length); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention((mentionCandidates[mentionIdx] || mentionCandidates[0]).name); }
    else if (e.key === 'Escape') { e.preventDefault(); setMentionOpen(false); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="native-chat-main md:ml-64 flex-1 min-w-0 flex flex-col" style={{ height: '100dvh' }}>
        <div className="px-4 md:px-8 py-4 md:py-6 pb-4 border-b border-gray-100 bg-white flex-shrink-0 topbar-offset">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Chat</h1>
            </div>
            {isOwner && messages.length > 0 && (
              <button
                onClick={() => setConfirmClear(true)}
                title="Clear all messages"
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div ref={containerRef} onScroll={onScroll} className="flex-1 overflow-y-auto overscroll-y-contain p-4 md:p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No messages yet. Start the conversation!</div>
          ) : (
            messages.map((msg, i) => {
              const prev = messages[i - 1];
              const daySep = (!prev || !sameDay(prev.timestamp, msg.timestamp)) ? (
                <div className="flex justify-center my-3">
                  <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 rounded-full px-3 py-1">{formatDay(msg.timestamp)}</span>
                </div>
              ) : null;

              let node: React.ReactNode;
              // System notes (e.g. a completed task) render centered, not as a bubble
              if (msg.type === 'system') {
                node = (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                    <div className="text-[11px] text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-3 py-1 max-w-[85%] text-center">
                      {msg.text} · {formatTime(msg.timestamp)}
                    </div>
                  </motion.div>
                );
              } else {
                const isMe = msg.sender_id === user?.id;
                const senderPicture = members.find(m => m.user_id === msg.sender_id)?.picture;
                node = (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.015, 0.3) }}
                    className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : ''}`}
                  >
                    <UserAvatar picture={senderPicture} name={msg.sender_name} size={32} className="mt-1" />
                    <div className={`max-w-[75%] md:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      <span className="text-xs text-gray-400 mb-1">{isMe ? 'You' : msg.sender_name}</span>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm break-words whitespace-pre-wrap ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'}`}>
                        {renderText(msg.text, isMe)}
                      </div>
                      <span className="text-xs text-gray-300 mt-1">{formatTime(msg.timestamp)}</span>
                    </div>
                    {isMe && (
                      confirmDeleteId === msg.id ? (
                        <div className="flex flex-col gap-1 mt-2 flex-shrink-0">
                          <button onClick={() => { deleteMsg(msg.id); setConfirmDeleteId(null); }} className="text-xs text-red-500 hover:text-red-700 font-semibold py-1.5 px-2 rounded-lg hover:bg-red-50 transition-colors">Delete</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:text-gray-600 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(msg.id)} className="text-gray-300 hover:text-red-400 transition-colors mt-2 flex-shrink-0">
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </motion.div>
                );
              }
              return <Fragment key={msg.id}>{daySep}{node}</Fragment>;
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
          <form onSubmit={send} className="p-4 pb-6 md:pb-4 flex gap-3 items-end">
            <div className="relative flex-1">
              {mentionOpen && mentionCandidates.length > 0 && (
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10 max-h-56 overflow-y-auto">
                  {mentionCandidates.map((mem, idx) => (
                    <button
                      type="button"
                      key={mem.user_id}
                      onMouseDown={e => { e.preventDefault(); insertMention(mem.name); }}
                      onMouseEnter={() => setMentionIdx(idx)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm ${idx === mentionIdx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      <UserAvatar picture={mem.picture} name={mem.name} size={24} />
                      <span className="truncate text-gray-800">{mem.name}</span>
                      {mem.role && <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-400">{mem.role}</span>}
                    </button>
                  ))}
                </div>
              )}
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a message…  @ to mention"
                value={text}
                maxLength={2000}
                disabled={sending}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="px-4 py-2.5 bg-gray-950 text-white rounded-full hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center flex-shrink-0"
            >
              {sending
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <PaperAirplaneIcon className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </main>

      {/* Clear chat confirm */}
      {confirmClear && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-gray-900 mb-2">Clear all messages?</h3>
            <p className="text-sm text-gray-500 mb-5">This will permanently delete all {messages.length} messages for everyone in the company. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmClear(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={clearChat} disabled={clearing}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50">
                {clearing ? 'Clearing…' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
