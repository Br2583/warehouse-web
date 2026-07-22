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
      <div className="min-h-screen bg-slate-50 flex flex-col">

        {/* ── Marquee strip (dark, compact) ── */}
        <div style={{ background: '#0d0d0d' }} className="overflow-hidden py-6 select-none shrink-0">
          <div className="overflow-hidden mb-2">
            <div style={{ animation: 'wm-left 30s linear infinite', display: 'inline-flex' }}>
              <span style={{ whiteSpace: 'nowrap' }} className="text-[clamp(32px,4.5vw,62px)] font-black text-white tracking-[-2px] leading-none pr-16">{ROW_1}</span>
              <span style={{ whiteSpace: 'nowrap' }} className="text-[clamp(32px,4.5vw,62px)] font-black text-white tracking-[-2px] leading-none pr-16">{ROW_1}</span>
            </div>
          </div>
          <div className="overflow-hidden">
            <div style={{ animation: 'wm-right 38s linear infinite', display: 'inline-flex' }}>
              <span style={{ whiteSpace: 'nowrap' }} className="text-[clamp(32px,4.5vw,62px)] font-black text-white/25 tracking-[-2px] leading-none pr-16">{ROW_2}</span>
              <span style={{ whiteSpace: 'nowrap' }} className="text-[clamp(32px,4.5vw,62px)] font-black text-white/25 tracking-[-2px] leading-none pr-16">{ROW_2}</span>
            </div>
          </div>
        </div>

        {/* ── Content slot ── */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
          {children}
        </div>

        <AppFooter />
      </div>
    </>
  );
}
