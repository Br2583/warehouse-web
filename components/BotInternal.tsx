'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { api, getToken } from '@/lib/api';
import { useUnreadChat } from '@/lib/use-unread-chat';
import { getGreeting } from '@/lib/bot-phrases';
import Link from 'next/link';

/* ─────────────────────────────────────────────
   Shared SVG character — viewBox 0 0 60 92
   eyeNormX / eyeNormY: -1..1
───────────────────────────────────────────── */
function BotCharacter({
  w = 40, h = 60,
  eyeNormX = 0, eyeNormY = 0,
  blinking = false,
}: {
  w?: number; h?: number;
  eyeNormX?: number; eyeNormY?: number;
  blinking?: boolean;
}) {
  const maxEyeShift = 2.6;
  const ox = eyeNormX * maxEyeShift;
  const oy = eyeNormY * maxEyeShift;

  return (
    <svg width={w} height={h} viewBox="0 0 60 92" fill="none">
      <defs>
        <linearGradient id="int-head" x1="0" y1="0" x2="60" y2="51" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60a5fa" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="int-body" x1="0" y1="58" x2="60" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
      </defs>

      {/* CAP */}
      <rect x="17" y="3" width="26" height="14" rx="5" fill="#1d4ed8" />
      <rect x="9" y="16" width="42" height="5" rx="2.5" fill="#1e40af" />
      <rect x="17" y="12" width="26" height="2.5" rx="1" fill="rgba(255,255,255,0.18)" />
      <circle cx="30" cy="4.5" r="2.5" fill="#93c5fd" />

      {/* HEAD */}
      <rect x="11" y="20" width="38" height="31" rx="10" fill="url(#int-head)" />
      <rect x="15" y="23" width="14" height="7" rx="3.5" fill="rgba(255,255,255,0.13)" />

      {/* Eyes */}
      <circle cx="22" cy="34" r="6.5" fill="white" opacity={blinking ? 0.08 : 1} />
      <circle cx="38" cy="34" r="6.5" fill="white" opacity={blinking ? 0.08 : 1} />
      {!blinking && <circle cx={22 + ox} cy={34 + oy} r="3.5" fill="#0f172a" />}
      {!blinking && <circle cx={38 + ox} cy={34 + oy} r="3.5" fill="#0f172a" />}

      {/* Mouth */}
      <path d="M 21 44 Q 30 50.5 39 44" stroke="white" strokeWidth="2.4" strokeLinecap="round" />

      {/* NECK */}
      <rect x="24" y="51" width="12" height="8" rx="3" fill="#1e40af" />

      {/* TORSO */}
      <rect x="13" y="58" width="34" height="24" rx="8" fill="url(#int-body)" />
      <rect x="20" y="64" width="20" height="12" rx="3.5" fill="rgba(255,255,255,0.18)" />
      <text x="30" y="73.5" textAnchor="middle" fill="white" fontSize="6.5" fontWeight="900" fontStyle="italic" fontFamily="sans-serif">WM</text>

      {/* LEFT ARM + HAND */}
      <rect x="3" y="60" width="9" height="18" rx="4.5" fill="#1d4ed8" />
      <circle cx="7.5" cy="80" r="5.5" fill="#2563eb" />

      {/* RIGHT ARM + HAND */}
      <rect x="48" y="60" width="9" height="18" rx="4.5" fill="#1d4ed8" />
      <circle cx="52.5" cy="80" r="5.5" fill="#2563eb" />
    </svg>
  );
}

/* ── Data types ── */
interface BotData {
  totalVaults: number;
  readyVaults: number;
  pendingOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  unreadMessages: number;
}

/* ── Quick action button ── */
function QuickBtn({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value?: string | number; color: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] border ${color}`}>
      <span className="text-base leading-none">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-gray-800 leading-tight">{label}</div>
      </div>
      {value !== undefined && (
        <span className="text-[13px] font-bold text-gray-900 flex-shrink-0">{value}</span>
      )}
    </div>
  );
}

/* ── Main component ── */
export default function BotInternal() {
  const { user } = useAuth();
  const unread = useUnreadChat();
  const [open, setOpen] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const [eyeNorm, setEyeNorm] = useState({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);
  const [data, setData] = useState<BotData | null>(null);
  const [loading, setLoading] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  const peekShown = useRef(false);

  // Fetch bot data once
  const fetchData = useCallback(async () => {
    if (data) return;
    setLoading(true);
    try {
      const token = getToken();
      const [statsRes, ordersRes, chatRes] = await Promise.allSettled([
        api.get('/api/stats/global'),
        api.get('/api/work-orders'),
        token
          ? fetch('/api/chat/messages', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : [])
          : Promise.resolve([]),
      ]);

      const stats  = statsRes.status === 'fulfilled' ? statsRes.value : null;
      const orders = ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value) ? ordersRes.value : [];
      const msgs: any[] = chatRes.status === 'fulfilled' ? (chatRes.value ?? []) : [];

      const lastSeen   = parseInt(localStorage.getItem('chat_last_seen') || '0', 10);
      const unreadCount = msgs.filter((m: any) => {
        const ts = m.timestamp ? new Date(m.timestamp.replace(' ', 'T')).getTime() : 0;
        return ts > lastSeen;
      }).length;

      setData({
        totalVaults:      stats?.total_boxes ?? 0,
        readyVaults:      stats?.statuses?.READY ?? 0,
        pendingOrders:    orders.filter((o: any) => o.status === 'pending').length,
        inProgressOrders: orders.filter((o: any) => o.status === 'in_progress').length,
        completedOrders:  orders.filter((o: any) => ['completed', 'done'].includes(o.status)).length,
        unreadMessages:   unreadCount,
      });
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [data]);

  // Auto-peek on mount
  useEffect(() => {
    if (peekShown.current || !user) return;
    peekShown.current = true;
    const t1 = setTimeout(() => { fetchData(); setPeeked(true); }, 1500);
    const t2 = setTimeout(() => setPeeked(false), 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [user, fetchData]);

  // Fetch when panel opens
  useEffect(() => { if (open) fetchData(); }, [open, fetchData]);

  // Re-peek on new unread messages
  const prevUnread = useRef(unread);
  useEffect(() => {
    if (unread > prevUnread.current && !open) {
      setPeeked(true);
      const t = setTimeout(() => setPeeked(false), 5000);
      prevUnread.current = unread;
      return () => clearTimeout(t);
    }
    prevUnread.current = unread;
  }, [unread, open]);

  // Blink
  useEffect(() => {
    const schedule = (): ReturnType<typeof setTimeout> =>
      setTimeout(() => { setBlinking(true); setTimeout(() => setBlinking(false), 110); schedule(); }, 2800 + Math.random() * 3500);
    const t = schedule();
    return () => clearTimeout(t);
  }, []);

  // Mouse tracking
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const el = fabRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const norm = Math.min(dist, 280) / 280;
      setEyeNorm({ x: (dx / dist) * norm, y: (dy / dist) * norm });
    };
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  if (!user) return null;

  const greeting   = getGreeting();
  const firstName  = user.name?.split(' ')[0] || 'there';

  const peekMessage = (() => {
    if (!data) return `${greeting}, ${firstName}! Loading summary…`;
    if (unread > 0) return `Hey ${firstName}! ${unread} unread message${unread > 1 ? 's' : ''} 💬`;
    if (data.pendingOrders > 0) return `${greeting}! ${data.pendingOrders} work order${data.pendingOrders > 1 ? 's' : ''} pending 📋`;
    if (data.readyVaults > 0) return `${data.readyVaults} vault${data.readyVaults > 1 ? 's' : ''} ready to deliver ✅`;
    return `${greeting}, ${firstName}! Everything looks good 👍`;
  })();

  return (
    <>
      <style>{`@keyframes botPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>

      <div className="fixed z-40 select-none" style={{ bottom: '80px', right: '16px' }}>
        <AnimatePresence>
          {/* Full panel */}
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="absolute bottom-[68px] right-0 w-[300px] bg-white border border-gray-200 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.14)] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)' }}>
                <BotCharacter w={28} h={42} eyeNormX={eyeNorm.x} eyeNormY={eyeNorm.y} blinking={blinking} />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-[13px] leading-tight">WM Assistant</p>
                  <p className="text-white/70 text-[11px] leading-tight">{greeting}, {firstName}!</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors text-xs"
                >
                  ×
                </button>
              </div>

              {/* Body */}
              <div className="p-3 space-y-1.5 max-h-[360px] overflow-y-auto">
                {loading && (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  </div>
                )}

                {!loading && data && (
                  <>
                    {/* KPI mini cards */}
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      <div className="bg-blue-50 rounded-xl p-2.5 text-center border border-blue-100">
                        <div className="text-[20px] font-black text-blue-700">{data.totalVaults}</div>
                        <div className="text-[10px] text-blue-500 font-medium">Total Vaults</div>
                      </div>
                      <div className="bg-green-50 rounded-xl p-2.5 text-center border border-green-100">
                        <div className="text-[20px] font-black text-green-700">{data.readyVaults}</div>
                        <div className="text-[10px] text-green-500 font-medium">Ready to Deliver</div>
                      </div>
                    </div>

                    <p className="text-[11px] font-semibold text-gray-400 px-1 uppercase tracking-wider pt-1">Quick Actions</p>

                    <Link href="/production" onClick={() => setOpen(false)}>
                      <QuickBtn icon="📋" label="Pending orders"     value={data.pendingOrders}    color="bg-amber-50 border-amber-100 hover:bg-amber-100" />
                    </Link>
                    <Link href="/production" onClick={() => setOpen(false)}>
                      <QuickBtn icon="⚙️" label="In progress"        value={data.inProgressOrders} color="bg-blue-50 border-blue-100 hover:bg-blue-100" />
                    </Link>
                    <Link href="/chat" onClick={() => setOpen(false)}>
                      <QuickBtn
                        icon="💬" label="Unread messages"
                        value={unread > 0 ? unread : '—'}
                        color={unread > 0 ? 'bg-purple-50 border-purple-100 hover:bg-purple-100' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}
                      />
                    </Link>
                    <Link href="/search?status=READY" onClick={() => setOpen(false)}>
                      <QuickBtn icon="✅" label="Ready for delivery"  value={data.readyVaults}      color="bg-green-50 border-green-100 hover:bg-green-100" />
                    </Link>
                    <Link href="/warehouses" onClick={() => setOpen(false)}>
                      <QuickBtn icon="🏭" label="View warehouses"      color="bg-gray-50 border-gray-100 hover:bg-gray-100" />
                    </Link>
                    <Link href="/search" onClick={() => setOpen(false)}>
                      <QuickBtn icon="🔍" label="Search a vault"       color="bg-gray-50 border-gray-100 hover:bg-gray-100" />
                    </Link>
                  </>
                )}

                {!loading && !data && (
                  <p className="text-[13px] text-slate-400 text-center py-4">Couldn't load data right now.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Peek bubble */}
        <AnimatePresence>
          {peeked && !open && (
            <motion.div
              initial={{ opacity: 0, x: 12, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 8, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
              className="absolute bottom-[68px] right-[50px] bg-white border border-gray-200 rounded-2xl rounded-br-sm px-3.5 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.12)] w-max max-w-[220px] cursor-pointer"
              onClick={() => { setPeeked(false); setOpen(true); }}
            >
              <p className="text-[12px] text-gray-800 leading-snug font-medium">{peekMessage}</p>
              <p className="text-[10px] text-blue-500 mt-0.5 font-semibold">Tap to see more →</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB */}
        <motion.div
          ref={fabRef}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          onClick={() => { setOpen(v => !v); setPeeked(false); }}
          className="cursor-pointer drop-shadow-xl relative"
          style={!open && !peeked ? { animation: 'botPulse 2.8s ease-in-out infinite' } : {}}
        >
          <BotCharacter w={40} h={60} eyeNormX={eyeNorm.x} eyeNormY={eyeNorm.y} blinking={blinking} />

          {/* Unread badge */}
          {unread > 0 && !open && (
            <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1">
              <span className="text-white text-[9px] font-bold leading-none">{unread > 9 ? '9+' : unread}</span>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
