'use client';

import AppFooter from './AppFooter';

const ROW_1 = 'Vault Tracking · Warehouse Management · Real-Time Inventory · Secure Storage · Multi-Warehouse · ';
const ROW_2 = 'Work Orders · Team Collaboration · Analytics & Reports · Daily Snapshots · Production Tracking · ';

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @keyframes wm-left  { from { transform: translateX(0);    } to { transform: translateX(-50%); } }
        @keyframes wm-right { from { transform: translateX(-50%); } to { transform: translateX(0);    } }
      `}</style>
      <div style={{ background: '#080808' }} className="min-h-screen flex flex-col">

        {/* ── Marquee ── */}
        <div className="overflow-hidden pt-12 pb-10 select-none">
          {/* Row 1 — scrolls left */}
          <div className="overflow-hidden mb-3">
            <div style={{ animation: 'wm-left 30s linear infinite', display: 'inline-flex' }}>
              <span style={{ whiteSpace: 'nowrap' }} className="text-[clamp(40px,5.8vw,80px)] font-black text-white tracking-[-3px] leading-none pr-20">{ROW_1}</span>
              <span style={{ whiteSpace: 'nowrap' }} className="text-[clamp(40px,5.8vw,80px)] font-black text-white tracking-[-3px] leading-none pr-20">{ROW_1}</span>
            </div>
          </div>
          {/* Row 2 — scrolls right */}
          <div className="overflow-hidden">
            <div style={{ animation: 'wm-right 38s linear infinite', display: 'inline-flex' }}>
              <span style={{ whiteSpace: 'nowrap' }} className="text-[clamp(40px,5.8vw,80px)] font-black text-white/20 tracking-[-3px] leading-none pr-20">{ROW_2}</span>
              <span style={{ whiteSpace: 'nowrap' }} className="text-[clamp(40px,5.8vw,80px)] font-black text-white/20 tracking-[-3px] leading-none pr-20">{ROW_2}</span>
            </div>
          </div>
        </div>

        {/* ── Form slot ── */}
        <div className="flex-1 flex items-start justify-center px-4 pb-16">
          {children}
        </div>

        <AppFooter />
      </div>
    </>
  );
}
