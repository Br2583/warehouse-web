'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { pb } from '@/lib/pb';
import AppFooter from '@/components/AppFooter';
import LandingHero from '@/components/LandingHero';
import {
  BuildingOffice2Icon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
} from '@/components/icons';

const FEATURES = [
  {
    icon: BuildingOffice2Icon,
    bg: '#eff6ff',
    color: '#2563eb',
    title: 'Multi-Warehouse',
    desc: 'Manage multiple warehouse locations from one centralized dashboard in real time.',
  },
  {
    icon: ChartBarSquareIcon,
    bg: '#fff7ed',
    color: '#ea580c',
    title: 'Live Analytics',
    desc: 'Track inventory, production and delivery status with live charts and reports.',
  },
  {
    icon: ChatBubbleLeftRightIcon,
    bg: '#f0fdf4',
    color: '#16a34a',
    title: 'Team Chat',
    desc: 'Built-in messaging to keep your entire team aligned and moving fast.',
  },
  {
    icon: UsersIcon,
    bg: '#faf5ff',
    color: '#7c3aed',
    title: 'Role-Based Access',
    desc: 'Invite your team with owner and worker permission levels built in.',
  },
];

const SIDEBAR_ITEMS = ['Dashboard', 'Warehouses', 'Storage', 'Tasks', 'Stats', 'Chat'];
const KPI = [
  { label: 'Total Vaults', val: '24', bg: '#eff6ff', dot: '#2563eb' },
  { label: 'Work Orders', val: '8',  bg: '#fff7ed', dot: '#ea580c' },
  { label: 'Ready',       val: '12', bg: '#f0fdf4', dot: '#16a34a' },
  { label: 'Delivered',   val: '4',  bg: '#faf5ff', dot: '#7c3aed' },
];
const BAR_HEIGHTS = [40, 65, 35, 80, 55, 90, 70];

export default function Home() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'windows' | 'other'>('other');
  const [iosModal, setIosModal] = useState(false);

  useEffect(() => {
    // Synchronous checks first — no async needed for these
    if (pb.authStore.isValid) { router.replace('/dashboard'); return; }
    // Capacitor injects window.Capacitor synchronously in the native WebView
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any)?.Capacitor?.isNativePlatform?.()) { router.replace('/native-welcome'); return; }
    // Confirmed: web visitor, not logged in — show landing page
    setShow(true);
    fetch('/api/ping').catch(() => {});

    // Platform detection for install section
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    const isWindows = /Windows/.test(ua);
    if (isIOS) setPlatform('ios');
    else if (isAndroid) setPlatform('android');
    else if (isWindows) setPlatform('windows');

    // Capture PWA install prompt (works on Chrome Android + Chrome/Edge Windows)
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [router]);

  if (!show) return <div style={{ minHeight: '100vh', background: '#fff' }} />;

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── Hero (new Manifesto design) ── */}
      <LandingHero />

      {/* ── Platform preview ── */}
      <section className="px-6 md:px-16 py-16 md:py-20" style={{ background: '#f8fafc' }}>
        <div className="max-w-5xl mx-auto">
          {/* Row: title + stats */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12">
            <div>
              <div className="text-[11px] font-semibold text-blue-600 tracking-[1.5px] uppercase mb-2.5">Platform</div>
              <h2 className="font-extrabold text-gray-900 leading-[1.15]" style={{ fontSize: 'clamp(28px,3vw,44px)', letterSpacing: '-1px' }}>
                Your warehouse,<br />at a glance
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-5 md:flex md:divide-x md:divide-gray-200 md:gap-0">
              {[{ num: '10K+', lbl: 'Active Users' }, { num: '99%', lbl: 'Uptime SLA' }, { num: '50+', lbl: 'Countries' }, { num: '500+', lbl: 'Warehouses' }].map(s => (
                <div key={s.lbl} className="text-center md:px-5 md:first:pl-0 md:last:pr-0 cursor-default group">
                  <div className="text-3xl md:text-[40px] font-black tracking-[-2px] leading-none text-gray-900 group-hover:text-blue-600 transition-colors">{s.num}</div>
                  <div className="text-[11px] text-slate-400 mt-1.5 font-medium tracking-[.3px]">{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard mockup */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,.09)] hover:-translate-y-1.5 hover:shadow-[0_32px_100px_rgba(0,0,0,.13)] transition-all duration-300 cursor-default">
            {/* Browser bar */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-b border-gray-200">
              <div className="w-3 h-3 rounded-full bg-red-400 hover:scale-125 transition-transform cursor-pointer" />
              <div className="w-3 h-3 rounded-full bg-amber-400 hover:scale-125 transition-transform cursor-pointer" />
              <div className="w-3 h-3 rounded-full bg-green-500 hover:scale-125 transition-transform cursor-pointer" />
              <div className="flex-1 bg-white border border-gray-200 rounded-md px-3 py-1 text-[12px] text-slate-400 text-center mx-12">
                managerwarehouse.cc/dashboard
              </div>
            </div>

            {/* Body */}
            <div className="grid md:grid-cols-[190px_1fr] min-h-[280px] md:min-h-[340px]">
              {/* Sidebar */}
              <div className="hidden md:flex flex-col bg-white border-r border-gray-100 p-3 gap-0.5">
                <div className="flex items-center gap-1.5 px-2 pb-3 mb-2 border-b border-gray-100">
                  <span className="font-black italic text-gray-950 select-none" style={{ fontSize: '16px', letterSpacing: '-0.5px', lineHeight: 1 }}>WM</span>
                  <span className="text-xs font-bold text-gray-900">Warehouse</span>
                </div>
                {SIDEBAR_ITEMS.map((item, i) => (
                  <div
                    key={item}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] cursor-default transition-colors ${i === 0 ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-400 hover:bg-gray-50 hover:text-slate-600'}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                    {item}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="p-4 md:p-5 flex flex-col gap-3" style={{ background: '#f8fafc' }}>
                <div>
                  <div className="text-[12px] text-slate-400">Good morning,</div>
                  <div className="text-[20px] font-extrabold text-gray-900 tracking-tight leading-tight">Alex</div>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {KPI.map(k => (
                    <div key={k.label} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-blue-100 transition-all cursor-default">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2.5" style={{ background: k.bg }}>
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: k.dot }} />
                      </div>
                      <div className="text-[20px] font-extrabold text-gray-900 leading-none">{k.val}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{k.label}</div>
                    </div>
                  ))}
                </div>

                {/* Charts row */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm">
                    <div className="text-[11px] font-bold text-gray-800 mb-3">Inventory Status</div>
                    <div className="flex items-end gap-1 h-14">
                      {BAR_HEIGHTS.map((h, i) => (
                        <div key={i} className={`flex-1 rounded-t-sm ${i === 3 || i === 5 ? 'bg-blue-500' : 'bg-blue-200'}`} style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm">
                    <div className="text-[11px] font-bold text-gray-800 mb-3">Production</div>
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-slate-400">In Progress <strong className="text-gray-700">3</strong></div>
                      <div className="text-[11px] text-slate-400">Completed <strong className="text-green-600">5</strong></div>
                      <div className="text-[11px] text-slate-400">Pending <strong className="text-gray-700">2</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="px-6 md:px-16 pb-16 md:pb-20" style={{ background: '#f8fafc' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-[11px] font-semibold text-blue-600 tracking-[1.5px] uppercase mb-2.5">Features</div>
          <h2 className="font-extrabold text-gray-900 mb-8" style={{ fontSize: 'clamp(28px,3vw,44px)', letterSpacing: '-1px' }}>
            Everything your warehouse needs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {FEATURES.map(({ icon: Icon, bg, color, title, desc }) => (
              <div
                key={title}
                className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,.09),0_20px_40px_rgba(0,0,0,.07)] hover:-translate-y-1 hover:border-blue-100 transition-all cursor-default"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 hover:scale-110 hover:-rotate-6 transition-transform" style={{ background: bg, color }}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-[13px] text-slate-500 leading-[1.65]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── iOS install guide modal ── */}
      {iosModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setIosModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-7 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <span className="text-[17px] font-black text-gray-900">Add to iPhone</span>
              <button onClick={() => setIosModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">✕</button>
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
            <div className="mt-6 text-center text-[12px] text-slate-400">
              The app will appear on your home screen like a native app
            </div>
          </div>
        </div>
      )}

      {/* ── Get the App ── */}
      <section id="download" className="px-6 md:px-16 py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-[11px] font-semibold text-blue-600 tracking-[1.5px] uppercase mb-2.5">Download</div>
          <h2 className="font-extrabold text-gray-900 mb-2" style={{ fontSize: 'clamp(28px,3vw,44px)', letterSpacing: '-1px' }}>
            Available on every device
          </h2>
          <p className="text-slate-500 text-[15px] mb-10">Install the app on Android, iPhone or Windows — no App Store needed.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Android */}
            <div className={`border rounded-2xl p-6 flex flex-col gap-4 transition-all ${platform === 'android' ? 'border-blue-200 bg-blue-50/40 shadow-sm' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#e8f5e9] flex items-center justify-center flex-shrink-0">
                  {/* Android robot icon */}
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#2e7d32">
                    <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C14.15 1.23 13.1 1 12 1c-1.1 0-2.15.23-3.12.63L7.4.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.01 3.07 4.96 4.99 4.96 7h14.07c0-2.01-1.04-3.93-2.5-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/>
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-[15px]">Android</div>
                  {platform === 'android' && <div className="text-[11px] text-blue-600 font-semibold">Your device detected</div>}
                </div>
              </div>
              <p className="text-[13px] text-slate-500 leading-relaxed flex-1">
                Install the full native app with camera, push notifications and offline support.
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href="/downloads/warehouse-manager.apk"
                  download="WarehouseManager.apk"
                  className="flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl px-4 py-2.5 text-[13px] font-bold hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  Download APK v2.6
                </a>
                {installPrompt && platform === 'android' && (
                  <button
                    onClick={async () => { installPrompt.prompt(); const r = await installPrompt.userChoice; if (r.outcome === 'accepted') setInstallPrompt(null); }}
                    className="flex items-center justify-center gap-2 border border-blue-600 text-blue-600 rounded-xl px-4 py-2.5 text-[13px] font-bold hover:bg-blue-50 transition-colors"
                  >
                    Install PWA (no download)
                  </button>
                )}
              </div>
            </div>

            {/* iPhone */}
            <div className={`border rounded-2xl p-6 flex flex-col gap-4 transition-all ${platform === 'ios' ? 'border-blue-200 bg-blue-50/40 shadow-sm' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {/* Apple icon */}
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1c1c1e">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-[15px]">iPhone / iPad</div>
                  {platform === 'ios' && <div className="text-[11px] text-blue-600 font-semibold">Your device detected</div>}
                </div>
              </div>
              <p className="text-[13px] text-slate-500 leading-relaxed flex-1">
                Add to your home screen from Safari. Works like a native app — no App Store required.
              </p>
              <button
                onClick={() => setIosModal(true)}
                className="flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl px-4 py-2.5 text-[13px] font-bold hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0-12l-3 3m3-3l3 3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1"/></svg>
                How to Add to iPhone
              </button>
            </div>

            {/* Windows / Desktop */}
            <div className={`border rounded-2xl p-6 flex flex-col gap-4 transition-all ${platform === 'windows' ? 'border-blue-200 bg-blue-50/40 shadow-sm' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#e3f2fd] flex items-center justify-center flex-shrink-0">
                  {/* Windows logo */}
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0078d4">
                    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-[15px]">Windows / Desktop</div>
                  {platform === 'windows' && <div className="text-[11px] text-blue-600 font-semibold">Your device detected</div>}
                </div>
              </div>
              <p className="text-[13px] text-slate-500 leading-relaxed flex-1">
                Install as a desktop app via Chrome or Edge — runs in its own window with no browser UI.
              </p>
              {installPrompt ? (
                <button
                  onClick={async () => { installPrompt.prompt(); const r = await installPrompt.userChoice; if (r.outcome === 'accepted') setInstallPrompt(null); }}
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2.5 text-[13px] font-bold hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Install on this PC
                </button>
              ) : (
                <div className="text-[12px] text-slate-400 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed">
                  Open this page in <strong className="text-gray-600">Chrome</strong> or <strong className="text-gray-600">Edge</strong> on Windows, then look for the install icon (⊕) in the address bar.
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        id="about"
        className="relative px-6 md:px-16 py-20 text-white text-center overflow-hidden"
        style={{
          background: '#0a0a0a',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='90'%3E%3Ctext x='70' y='62' font-family='Impact' font-size='44' font-weight='900' fill='rgba(255%2C255%2C255%2C0.055)' text-anchor='middle' font-style='italic'%3EWM%3C/text%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '140px 90px'
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <span className="font-black italic" style={{ fontSize: '320px', letterSpacing: '-16px', lineHeight: 1, color: 'rgba(255,255,255,0.03)' }}>WM</span>
        </div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="font-black mb-3" style={{ fontSize: 'clamp(28px,3.5vw,42px)', letterSpacing: '-1px' }}>
            Ready to take control of your inventory?
          </h2>
          <p className="text-white/70 text-[17px] mb-9 leading-relaxed">Join thousands of teams already using Warehouse Manager.</p>
          <button
            onClick={() => router.push('/login')}
            className="inline-flex items-center gap-2 bg-white text-gray-950 px-8 py-3.5 rounded-full text-[15px] font-bold hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_4px_20px_rgba(0,0,0,.3)] hover:shadow-[0_8px_28px_rgba(0,0,0,.4)]"
          >
            Get Access
          </button>
        </div>
      </section>

      <div id="contact">
        <AppFooter />
      </div>

    </div>
  );
}
