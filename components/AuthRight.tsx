'use client';

const STATS = [
  { n: '500K+', l: 'Vaults tracked' },
  { n: '3.2K',  l: 'Active teams'   },
  { n: '99.9%', l: 'Uptime'         },
];

const WM_DARK_TILE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='90'%3E%3Ctext x='70' y='62' font-family='Impact' font-size='44' font-weight='900' fill='rgba(255%2C255%2C255%2C0.055)' text-anchor='middle' font-style='italic'%3EWM%3C/text%3E%3C/svg%3E")`;

export default function AuthRight({
  title,
  subtitle,
  quote,
  quoteBy = 'Warehouse Director, LogiCorp',
  stats = STATS,
}: {
  title: React.ReactNode;
  subtitle: string;
  quote: string;
  quoteBy?: string;
  stats?: { n: string; l: string }[];
}) {
  return (
    <div
      className="hidden md:flex flex-col justify-between p-12 relative overflow-hidden text-white"
      style={{ background: '#0a0a0a', backgroundImage: WM_DARK_TILE, backgroundRepeat: 'repeat', backgroundSize: '140px 90px' }}
    >
      {/* Ghost WM centered */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="font-black italic" style={{ fontSize: '220px', letterSpacing: '-12px', lineHeight: 1, color: 'rgba(255,255,255,0.035)' }}>WM</span>
      </div>

      {/* Top logo */}
      <div className="flex items-center gap-3 relative z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/wm-icon-fg.png" alt="WM" style={{ width: 44, height: 44, objectFit: 'contain', mixBlendMode: 'screen' }} draggable={false} />
        <span className="font-semibold text-[14px] text-white/60">Warehouse Manager</span>
      </div>

      {/* Mid content */}
      <div className="relative z-10 space-y-5">
        <h2 className="font-black leading-[1.15] tracking-tight" style={{ fontSize: 'clamp(28px,2.5vw,38px)', letterSpacing: '-1px' }}>
          {title}
        </h2>
        <p className="text-sm text-white/60 leading-[1.65]">{subtitle}</p>
        <div className="flex gap-7">
          {stats.map(s => (
            <div key={s.l}>
              <div className="text-[22px] font-extrabold leading-tight">{s.n}</div>
              <div className="text-[11px] text-white/50 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quote */}
      <div className="bg-white/[0.06] border border-white/[0.1] rounded-2xl px-5 py-4 text-[13px] text-white/70 leading-[1.65] relative z-10 hover:bg-white/[0.1] transition-colors cursor-default">
        <strong className="text-white/90">&ldquo;{quote}&rdquo;</strong>
        <br />— {quoteBy}
      </div>
    </div>
  );
}
