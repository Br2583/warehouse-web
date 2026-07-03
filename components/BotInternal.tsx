'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { api, getToken } from '@/lib/api';
import { useUnreadChat } from '@/lib/use-unread-chat';
import { getGreeting } from '@/lib/bot-phrases';
import Link from 'next/link';

/* ─────────────────────────────────────────────
   Shared SVG character — viewBox 0 0 60 88
───────────────────────────────────────────── */
function BotCharacter({
  w = 40, h = 58,
  eyeNormX = 0, eyeNormY = 0,
  blinking = false,
}: {
  w?: number; h?: number;
  eyeNormX?: number; eyeNormY?: number;
  blinking?: boolean;
}) {
  const maxShift = 2.2;
  const ox = eyeNormX * maxShift;
  const oy = eyeNormY * maxShift;

  return (
    <svg width={w} height={h} viewBox="0 0 60 88" fill="none">
      {/* ANTENNA */}
      <line x1="30" y1="8" x2="30" y2="15" stroke="#1d4ed8" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="30" cy="5.5" r="3.5" fill="#60a5fa" />

      {/* EARS */}
      <circle cx="8"  cy="30" r="7.5" fill="#1d4ed8" />
      <circle cx="52" cy="30" r="7.5" fill="#1d4ed8" />

      {/* HEAD */}
      <circle cx="30" cy="30" r="21" fill="#1d4ed8" />
      <ellipse cx="23" cy="21" rx="8" ry="5" fill="rgba(255,255,255,0.12)" transform="rotate(-20 23 21)" />

      {/* VISOR */}
      <rect x="11" y="23" width="38" height="15" rx="7.5" fill="white" />

      {/* EYES */}
      {!blinking ? (
        <>
          <circle cx={22 + ox} cy={30.5 + oy} r="5"   fill="#0f172a" />
          <circle cx={38 + ox} cy={30.5 + oy} r="5"   fill="#0f172a" />
        </>
      ) : (
        <>
          <rect x={17 + ox} y="29" width="10" height="3.5" rx="1.75" fill="#0f172a" />
          <rect x={33 + ox} y="29" width="10" height="3.5" rx="1.75" fill="#0f172a" />
        </>
      )}

      {/* BODY */}
      <path d="M 18 53 L 42 53 C 48 63 41 79 30 84 C 19 79 12 63 18 53 Z" fill="#1d4ed8" />
      <ellipse cx="30" cy="58" rx="9" ry="3.5" fill="rgba(255,255,255,0.1)" />

      {/* WM */}
      <text x="30" y="72" textAnchor="middle" fill="white" fontSize="9.5" fontWeight="900" fontStyle="italic" fontFamily="system-ui, sans-serif">WM</text>
    </svg>
  );
}

/* ── Data ── */
interface BotData {
  totalVaults: number;
  readyVaults: number;
  pendingOrders: number;
  inProgressOrders: number;
  unreadMessages: number;
}

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

/* ── Main ── */
export default function BotInternal() {
  const { user }   = useAuth();
  const unread     = useUnreadChat();
  const [open, setOpen]       = useState(false);
  const [peeked, setPeeked]   = useState(false);
  const [eyeNorm, setEyeNorm] = useState({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);
  const [data, setData]       = useState<BotData | null>(null);
  const [loading, setLoading] = useState(false);
  const fabRef    = useRef<HTMLDivElement>(null);
  const peekShown = useRef(false);

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
      const stats  = statsRes.status  === 'fulfilled' ? statsRes.value  : null;
      const orders = ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value) ? ordersRes.value : [];
      const msgs: any[] = chatRes.status === 'fulfilled' ? (chatRes.value ?? []) : [];
      const lastSeen = parseInt(localStorage.getItem('chat_last_seen') || '0', 10);
      const unreadCount = msgs.filter((m: any) => {
        const ts = m.timestamp ? new Date(m.timestamp.replace(' ', 'T')).getTime() : 0;
        return ts > lastSeen;
      }).length;
      setData({
        totalVaults:      stats?.total_boxes ?? 0,
        readyVaults:      stats?.statuses?.READY ?? 0,
        pendingOrders:    orders.filter((o: any) => o.status === 'pending').length,
        inProgressOrders: orders.filter((o: any) => o.status === 'in_progress').length,
        unreadMessages:   unreadCount,
      });
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [data]);

  useEffect(() => {
    if (peekShown.current || !user) return;
    peekShown.current = true;
    const t1 = setTimeout(() => { fetchData(); setPeeked(true); }, 1500);
    const t2 = setTimeout(() => setPeeked(false), 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [user, fetchData]);

  useEffect(() => { if (open) fetchData(); }, [open, fetchData]);

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

  useEffect(() => {
    const schedule = (): ReturnType<typeof setTimeout> =>
      setTimeout(() => { setBlinking(true); setTimeout(() => setBlinking(false), 130); schedule(); }, 2800 + Math.random() * 3500);
    const t = schedule();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const el = fabRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = e.clientX - cx;
      const dy   = e.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const norm = Math.min(dist, 280) / 280;
      setEyeNorm({ x: (dx / dist) * norm, y: (dy / dist) * norm });
    };
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  if (!user) return null;

  const greeting  = getGreeting();
  const firstName = user.name?.split(' ')[0] || 'there';

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
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="absolute bottom-[66px] right-0 w-[300px] bg-white border border-gray-200 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.14)] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)' }}>
                <BotCharacter w={26} h={38} eyeNormX={eyeNorm.x} eyeNormY={eyeNorm.y} blinking={blinking} />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-[13px] leading-tight">WM Assistant</p>
                  <p className="text-white/70 text-[11px] leading-tight">{greeting}, {firstName}!</p>
                </div>
                <button onClick={() => setOpen(false)} className="w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors text-xs">×</button>
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
                      <QuickBtn icon="📋" label="Pending orders"    value={data.pendingOrders}    color="bg-amber-50 border-amber-100 hover:bg-amber-100" />
                    </Link>
                    <Link href="/production" onClick={() => setOpen(false)}>
                      <QuickBtn icon="⚙️" label="In progress"       value={data.inProgressOrders} color="bg-blue-50 border-blue-100 hover:bg-blue-100" />
                    </Link>
                    <Link href="/chat" onClick={() => setOpen(false)}>
                      <QuickBtn
                        icon="💬" label="Unread messages"
                        value={unread > 0 ? unread : '—'}
                        color={unread > 0 ? 'bg-purple-50 border-purple-100 hover:bg-purple-100' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}
                      />
                    </Link>
                    <Link href="/search?status=READY" onClick={() => setOpen(false)}>
                      <QuickBtn icon="✅" label="Ready for delivery" value={data.readyVaults}     color="bg-green-50 border-green-100 hover:bg-green-100" />
                    </Link>
                    <Link href="/warehouses" onClick={() => setOpen(false)}>
                      <QuickBtn icon="🏭" label="View warehouses"    color="bg-gray-50 border-gray-100 hover:bg-gray-100" />
                    </Link>
                    <Link href="/search" onClick={() => setOpen(false)}>
                      <QuickBtn icon="🔍" label="Search a vault"     color="bg-gray-50 border-gray-100 hover:bg-gray-100" />
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
              className="absolute bottom-[66px] right-[50px] bg-white border border-gray-200 rounded-2xl rounded-br-sm px-3.5 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.12)] w-max max-w-[220px] cursor-pointer"
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
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => { setOpen(v => !v); setPeeked(false); }}
          className="cursor-pointer drop-shadow-xl relative"
          style={!open && !peeked ? { animation: 'botPulse 2.8s ease-in-out infinite' } : {}}
        >
          <BotCharacter w={42} h={61} eyeNormX={eyeNorm.x} eyeNormY={eyeNorm.y} blinking={blinking} />

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
