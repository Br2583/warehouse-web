'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { pb } from '@/lib/pb';
import AppFooter from '@/components/AppFooter';
import LandingHero from '@/components/LandingHero';
import { APP_VERSION } from '@/lib/constants';

const MARKS = Array.from({ length: 28 }, (_, i) => i);

function WmMark({ size, color }: { size: number; color: string }) {
  return (
    <svg
      viewBox="20 13 238 159"
      style={{ width: size, flexShrink: 0, color }}
      aria-hidden="true"
    >
      <g transform="translate(28,0) skewX(-8)" mask="url(#pt-cut)">
        <polyline points="30,28 56,156 84,62 112,156 140,28" fill="none" stroke="currentColor" strokeWidth="30" strokeLinejoin="miter" />
        <polyline points="140,156 140,28 176,98 212,28 212,156" fill="none" stroke="currentColor" strokeWidth="30" strokeLinejoin="miter" />
      </g>
    </svg>
  );
}

function DlBtn({ children, href, onClick, blue }: { children: React.ReactNode; href?: string; onClick?: () => void; blue?: boolean }) {
  const s: React.CSSProperties = {
    marginTop: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    fontSize: 14.5,
    fontWeight: 600,
    padding: '12px 0',
    borderRadius: 10,
    width: '100%',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textDecoration: 'none',
    ...(blue
      ? { background: '#2563eb', color: '#fff', border: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.14)' }
      : { background: '#0a0a0a', color: '#fff', border: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.14)' }),
  };
  if (href) return <a href={href} style={s} download={href.endsWith('.apk') ? 'WarehouseManager.apk' : undefined}>{children}</a>;
  return <button onClick={onClick} style={s}>{children}</button>;
}

function DlOutlineBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontSize: 14.5, fontWeight: 600, padding: '12px 0', borderRadius: 10, width: '100%', cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #d8d8d6', background: '#fff', color: '#0a0a0a' }}
    >
      {children}
    </button>
  );
}

export default function Home() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<Event & { prompt(): void; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'windows' | 'other'>('other');
  const [iosModal, setIosModal] = useState(false);

  useEffect(() => {
    if (pb.authStore.isValid) { router.replace('/dashboard'); return; }
    import('@capacitor/core').then(({ Capacitor }) => {
      if (Capacitor.isNativePlatform()) { router.replace('/native-welcome'); return; }
    }).catch(() => {});
    setShow(true);
    fetch('/api/ping').catch(() => {});

    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua) && !(window as unknown as Record<string, unknown>).MSStream) setPlatform('ios');
    else if (/Android/.test(ua)) setPlatform('android');
    else if (/Windows/.test(ua)) setPlatform('windows');

    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e as typeof installPrompt); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [router]);

  useEffect(() => {
    if (!iosModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIosModal(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [iosModal]);

  if (!show) return <div style={{ minHeight: '100vh', background: '#fff' }} />;

  const isAndroid = platform === 'android';
  const isIOS = platform === 'ios';
  // Only badge the desktop card when the UA really is Windows — a Mac or Linux
  // visitor must not be told "Windows" is their device.
  const isWindows = platform === 'windows';

  const DownArrow = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M5 21h14" />
    </svg>
  );

  return (
    <div style={{ fontFamily: "var(--font-archivo,'Archivo',sans-serif)", color: '#0a0a0a', background: '#ffffff', minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>

      <LandingHero />

      {/* ── BRAND BAND ── */}
      <div style={{ marginTop: 72, position: 'relative', background: '#0a0a0a', color: '#fff', overflow: 'hidden' }}>
        {/* Marquee watermark */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', opacity: 0.07, pointerEvents: 'none', overflow: 'hidden' }}>
          <div
            className="wm-drift-track"
            style={{ display: 'flex', alignItems: 'center', width: 'max-content', gap: 26, animation: 'wm-drift 46s linear infinite' }}
          >
            {[...MARKS, ...MARKS].map((_, i) => (
              <WmMark key={i} size={112} color="#fff" />
            ))}
          </div>
        </div>

        <div
          className="wm-brand-band-inner wm-page-section"
          style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', padding: '44px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap' }}
        >
          <div style={{ fontSize: 'clamp(20px,2.4vw,27px)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.25, maxWidth: '22ch', textWrap: 'balance' }}>
            Fire. Water. Mold. Moving. Storage.
          </div>
          <div style={{ display: 'flex', gap: 34, flexWrap: 'wrap' }}>
            {[['3', 'Warehouses'], ['479', 'Vaults'], ['24/7', 'Live sync']].map(([val, lbl]) => (
              <div key={lbl}>
                <div style={{ fontSize: 27, fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{val}</div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8a8a88', marginTop: 4 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── WHAT'S INSIDE ── */}
      <div id="whats-inside" className="wm-page-section" style={{ maxWidth: 1180, margin: '0 auto', padding: '64px 32px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8a8a88' }}>What's inside</div>
        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14 }}>
          {[
            {
              bg: '#eef3fe', stroke: '#2563eb',
              icon: <><path d="M3 9l9-5 9 5" /><path d="M5 9v11h14V9" /><path d="M10 20v-6h4v6" /></>,
              title: 'Multi-warehouse',
              desc: 'Every location on one dashboard, updating in real time.',
            },
            {
              bg: '#fef6e9', stroke: '#d97706',
              icon: <><path d="M4 20V11" /><path d="M10 20V5" /><path d="M16 20v-6" /></>,
              title: 'Live analytics',
              desc: 'Inventory, production and delivery status as it happens.',
            },
            {
              bg: '#effaf3', stroke: '#16a34a',
              icon: <path d="M4 5h16v11H9l-5 4z" />,
              title: 'Team chat',
              desc: 'Messaging tied to each job, so context stays with the work.',
            },
            {
              bg: '#f4f0fd', stroke: '#7c3aed',
              icon: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19.5c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" /><path d="M16 5.6a3.2 3.2 0 010 4.8" /></>,
              title: 'Role-based access',
              desc: 'Owner and worker permission levels, built in.',
            },
          ].map(({ bg, stroke, icon, title, desc }) => (
            <div key={title} className="wm-feature-card">
              <span style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
              </span>
              <div style={{ marginTop: 16, fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em' }}>{title}</div>
              <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.55, color: '#6a6a68' }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DOWNLOAD ── */}
      <div id="download" className="wm-page-section" style={{ maxWidth: 1180, margin: '0 auto', padding: '64px 32px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8a8a88' }}>Download</div>
            <h2 style={{ margin: '12px 0 0', fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em' }}>Install on your device</h2>
          </div>
          <div style={{ fontSize: 14, color: '#7a7a78' }}>No App Store required · Version {APP_VERSION}</div>
        </div>

        <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: 14 }}>
          {/* Android */}
          <div style={{ position: 'relative', border: isAndroid ? '1.5px solid #16a34a' : '1px solid #e6e6e4', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', background: isAndroid ? '#f7fdf9' : '#fff' }}>
            {isAndroid && <div style={{ position: 'absolute', top: -9, right: 20, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#16a34a', color: '#fff', padding: '3px 10px', borderRadius: 999 }}>Your device</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: '#effaf3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="6" y="8" width="12" height="12" rx="2" /><path d="M8.5 8L7 5" /><path d="M15.5 8L17 5" /><path d="M10 13h.01" /><path d="M14 13h.01" />
                </svg>
              </span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em' }}>Android</div>
                <div style={{ fontSize: 12.5, color: '#8a8a88' }}>Native app · APK</div>
              </div>
            </div>
            <div style={{ marginTop: 16, fontSize: 14, lineHeight: 1.6, color: '#6a6a68', flex: 1 }}>Camera scanning, push notifications and full offline support.</div>
            <DlBtn href="/downloads/warehouse-manager.apk">
              <DownArrow />
              Download APK v{APP_VERSION}
            </DlBtn>
          </div>

          {/* iPhone / iPad */}
          <div style={{ position: 'relative', border: isIOS ? '1.5px solid #0a0a0a' : '1px solid #e6e6e4', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', background: '#fff' }}>
            {isIOS && <div style={{ position: 'absolute', top: -9, right: 20, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#0a0a0a', color: '#fff', padding: '3px 10px', borderRadius: 999 }}>Your device</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: '#f2f2f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="7" y="3" width="10" height="18" rx="2.4" /><path d="M11 18h2" />
                </svg>
              </span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em' }}>iPhone / iPad</div>
                <div style={{ fontSize: 12.5, color: '#8a8a88' }}>Home screen app</div>
              </div>
            </div>
            <div style={{ marginTop: 16, fontSize: 14, lineHeight: 1.6, color: '#6a6a68', flex: 1 }}>Add from Safari. Works like a native app — no App Store required.</div>
            <DlOutlineBtn onClick={() => setIosModal(true)}>
              How to add to iPhone
            </DlOutlineBtn>
          </div>

          {/* Windows / Desktop */}
          <div style={{ position: 'relative', border: isWindows ? '1.5px solid #2563eb' : '1px solid #e6e6e4', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', background: isWindows ? '#fafbff' : '#fff' }}>
            {isWindows && <div style={{ position: 'absolute', top: -9, right: 20, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#2563eb', color: '#fff', padding: '3px 10px', borderRadius: 999 }}>Your device</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: '#e6edfd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="12" rx="1.6" /><path d="M8 21h8" /><path d="M12 17v4" />
                </svg>
              </span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em' }}>Windows / Desktop</div>
                <div style={{ fontSize: 12.5, color: '#7a7a78' }}>Runs in its own window</div>
              </div>
            </div>
            <div style={{ marginTop: 16, fontSize: 14, lineHeight: 1.6, color: '#5a5a58', flex: 1 }}>Install via Chrome or Edge — no browser UI, launches like any desktop app.</div>
            {installPrompt ? (
              <DlBtn blue onClick={async () => {
                installPrompt.prompt();
                const r = await installPrompt.userChoice;
                if (r.outcome === 'accepted') setInstallPrompt(null);
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" />
                </svg>
                Install on this PC
              </DlBtn>
            ) : (
              <div style={{ marginTop: 22, fontSize: 13, color: '#7a7a78', lineHeight: 1.6 }}>
                Open in <strong style={{ color: '#0a0a0a' }}>Chrome</strong> or <strong style={{ color: '#0a0a0a' }}>Edge</strong>, then tap the install icon (⊕) in the address bar.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── HELP ── */}
      <div id="help" className="wm-page-section" style={{ maxWidth: 1180, margin: '0 auto', padding: '64px 32px 88px' }}>
        <div className="wm-help-row" style={{ border: '1px solid #e6e6e4', borderRadius: 16, padding: '26px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 28, flexWrap: 'wrap', background: '#fbfbfa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 42, height: 42, borderRadius: 11, background: '#fff', border: '1px solid #e6e6e4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" /><path d="M9.6 9.4a2.5 2.5 0 114 2.2c-.9.6-1.6 1-1.6 2" /><path d="M12 17.2h.01" />
              </svg>
            </span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em' }}>Trouble installing or signing in?</div>
              <div style={{ fontSize: 14, color: '#6a6a68', marginTop: 3 }}>Setup guides, printable vault labels and direct support for your team.</div>
            </div>
          </div>
          <div className="wm-help-btns" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="#download" style={{ fontSize: 14, fontWeight: 600, padding: '11px 18px', borderRadius: 10, border: '1px solid #d8d8d6', background: '#fff', textDecoration: 'none', color: '#0a0a0a', display: 'inline-flex', alignItems: 'center' }}>
              Install guide
            </a>
            <a href="mailto:support@managerwarehouse.cc" style={{ fontSize: 14, fontWeight: 600, padding: '11px 18px', borderRadius: 10, background: '#0a0a0a', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.14)' }}>
              Contact support
            </a>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <AppFooter />

      {/* ── iOS MODAL ── */}
      {iosModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setIosModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Add to iPhone instructions"
        >
          <div
            className="bg-white rounded-2xl p-7 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <span className="text-[17px] font-black text-gray-900">Add to iPhone</span>
              <button onClick={() => setIosModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none" aria-label="Close">✕</button>
            </div>
            <ol className="space-y-4">
              {[
                { n: 1, text: 'Open this page in ', bold: 'Safari', after: ' (not Chrome)' },
                { n: 2, text: 'Tap the ', bold: 'Share', after: ' button at the bottom of Safari' },
                { n: 3, text: 'Scroll down and tap ', bold: '"Add to Home Screen"' },
                { n: 4, text: 'Tap ', bold: '"Add"', after: ' — done!' },
              ].map(({ n, text, bold, after }) => (
                <li key={n} className="flex items-start gap-3.5">
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-[13px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</span>
                  <span className="text-[14px] text-gray-600 leading-relaxed">{text}<span className="font-bold text-gray-900">{bold}</span>{after || ''}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 text-center text-[12px] text-slate-400">The app will appear on your home screen like a native app</div>
          </div>
        </div>
      )}

    </div>
  );
}
