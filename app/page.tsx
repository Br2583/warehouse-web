'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { pb } from '@/lib/pb';
import {
  BuildingOffice2Icon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  ArrowRightIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const PHRASES = [
  'Inventory & Records Management.',
  'Secure Warehouse Storage.',
  'Real-Time Vault Tracking.',
  'Trusted Warehouse Services.',
];

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

const SIDEBAR_ITEMS = ['Dashboard', 'Warehouses', 'Storage', 'Production', 'Statistics', 'Chat'];
const KPI = [
  { label: 'Total Volts', val: '24', bg: '#eff6ff', dot: '#2563eb' },
  { label: 'Work Orders', val: '8',  bg: '#fff7ed', dot: '#ea580c' },
  { label: 'Ready',       val: '12', bg: '#f0fdf4', dot: '#16a34a' },
  { label: 'Delivered',   val: '4',  bg: '#faf5ff', dot: '#7c3aed' },
];
const BAR_HEIGHTS = [40, 65, 35, 80, 55, 90, 70];

export default function Home() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cursorX, setCursorX] = useState(-500);
  const [cursorY, setCursorY] = useState(-500);
  const [displayed, setDisplayed] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [typing, setTyping] = useState(true);

  // Redirect if logged in + pre-warm PocketBase for faster login
  useEffect(() => {
    if (pb.authStore.isValid) { router.replace('/dashboard'); return; }
    fetch('/api/ping').catch(() => {});
  }, [router]);

  // Typewriter
  useEffect(() => {
    const phrase = PHRASES[phraseIdx];
    let t: ReturnType<typeof setTimeout>;
    if (typing) {
      if (displayed.length < phrase.length) {
        t = setTimeout(() => setDisplayed(phrase.slice(0, displayed.length + 1)), 55);
      } else {
        t = setTimeout(() => setTyping(false), 2400);
      }
    } else {
      if (displayed.length > 0) {
        t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 28);
      } else {
        setPhraseIdx(i => (i + 1) % PHRASES.length);
        setTyping(true);
      }
    }
    return () => clearTimeout(t);
  }, [displayed, typing, phraseIdx]);

  // Scroll shadow
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  // Cursor glow
  useEffect(() => {
    const h = (e: MouseEvent) => { setCursorX(e.clientX); setCursorY(e.clientY); };
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      if (!(e.target as Element).closest('#wm-nav-wrap')) setMenuOpen(false);
    };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, [menuOpen]);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const pts = Array.from({ length: 48 }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.4 + 0.4,
    }));
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach((p, i) => {
        pts.slice(i + 1).forEach(q => {
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 140) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(59,130,246,${0.07 * (1 - d / 140)})`;
            ctx.lineWidth = 0.65; ctx.stroke();
          }
        });
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(59,130,246,0.1)'; ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
      });
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-30" />

      {/* Cursor glow */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: `radial-gradient(480px circle at ${cursorX}px ${cursorY}px, rgba(59,130,246,0.07), transparent 70%)` }}
      />

      {/* ── Navbar ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-16 h-[68px] transition-shadow duration-300 ${scrolled ? 'shadow-[0_4px_24px_rgba(0,0,0,0.07)]' : ''}`}
        style={{ background: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(24px)', borderBottom: '1px solid #e2e8f0' }}
      >
        <a href="#" className="flex items-center gap-2.5 group no-underline">
          <div className="w-9 h-9 bg-gray-950 rounded-[10px] flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:-rotate-6 shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
            <span className="text-white font-black text-[10px] italic leading-none tracking-tight">WM</span>
          </div>
          <span className="font-bold text-gray-900 text-[15px]">Warehouse Manager</span>
        </a>

        <div className="relative" id="wm-nav-wrap">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className={`w-11 h-11 rounded-[10px] flex items-center justify-center transition-all duration-200 border ${menuOpen ? 'bg-gray-50 border-blue-500' : 'border-gray-300 hover:bg-gray-50 hover:border-blue-400'}`}
          >
            {menuOpen
              ? <XMarkIcon className="w-[18px] h-[18px] text-gray-700" />
              : <Bars3Icon className="w-[18px] h-[18px] text-gray-700" />}
          </button>

          <div
            className={`absolute top-[calc(100%+10px)] right-0 bg-white border border-gray-200 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] p-2 min-w-[200px] transition-all duration-200 origin-top-right ${menuOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
          >
            <button
              onClick={() => { setMenuOpen(false); router.push('/login'); }}
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-[9px] text-sm font-medium text-slate-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Sign In
            </button>
            <div className="h-px bg-gray-100 my-1" />
            <button
              onClick={() => { setMenuOpen(false); router.push('/signup'); }}
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-[9px] text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors mt-1"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              Create Account
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6 md:px-12 pt-[68px] overflow-hidden"
        style={{ minHeight: '100svh', background: 'linear-gradient(180deg,#fff 0%,#f8fafc 100%)' }}
      >
        {/* Orbs */}
        <div className="absolute rounded-full pointer-events-none" style={{ width: 700, height: 700, top: -220, left: 'calc(50% - 350px)', background: 'radial-gradient(circle,rgba(59,130,246,.07),transparent 70%)', animation: 'orbFloat 9s ease-in-out infinite' }} />
        <div className="absolute rounded-full pointer-events-none" style={{ width: 360, height: 360, bottom: -80, left: -80, background: 'radial-gradient(circle,rgba(99,102,241,.05),transparent 70%)', animation: 'orbFloat2 11s ease-in-out infinite reverse' }} />
        <div className="absolute rounded-full pointer-events-none" style={{ width: 280, height: 280, bottom: 0, right: -60, background: 'radial-gradient(circle,rgba(59,130,246,.04),transparent 70%)', animation: 'orbFloat2 13s ease-in-out infinite' }} />

        <div className="relative z-10 max-w-3xl mx-auto py-16 md:py-24">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-600 px-3.5 py-[5px] rounded-full text-xs font-semibold mb-5 cursor-default hover:shadow-[0_4px_16px_rgba(59,130,246,.2)] hover:scale-[1.03] transition-all"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" style={{ animation: 'bdotPulse 2s ease-in-out infinite' }} />
            Warehouse Management Platform
          </div>

          {/* Title */}
          <h1 className="font-black leading-[1.02] mb-4" style={{ fontSize: 'clamp(44px,6vw,80px)', letterSpacing: '-3px' }}>
            Smarter inventory,<br />
            <span style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              faster results.
            </span>
          </h1>

          {/* Typewriter */}
          <div className="h-7 flex items-center justify-center gap-1 mb-4">
            <span className="text-slate-500 text-base md:text-lg">{displayed}</span>
            <span className="inline-block w-0.5 h-5 bg-blue-400 animate-pulse" />
          </div>

          <p className="text-slate-500 text-[17px] leading-[1.7] max-w-xl mx-auto mb-9">
            Real-time inventory tracking, team collaboration and live analytics — all in one platform built for modern warehouses.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push('/signup')}
              className="flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 text-white rounded-[11px] text-[15px] font-bold hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_4px_20px_rgba(59,130,246,.35)] hover:shadow-[0_8px_28px_rgba(59,130,246,.45)]"
            >
              Get Started Free <ArrowRightIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push('/login')}
              className="flex items-center justify-center gap-2 px-7 py-3.5 bg-white border-[1.5px] border-gray-300 text-gray-800 rounded-[11px] text-[15px] font-semibold hover:bg-gray-50 hover:border-blue-400 hover:text-blue-600 hover:-translate-y-px transition-all shadow-sm"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

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
            <div className="flex divide-x divide-gray-200">
              {[{ num: '10K+', lbl: 'Active Users' }, { num: '99%', lbl: 'Uptime SLA' }, { num: '50+', lbl: 'Countries' }, { num: '500+', lbl: 'Warehouses' }].map(s => (
                <div key={s.lbl} className="text-center px-5 first:pl-0 last:pr-0 cursor-default group">
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
                <div className="flex items-center gap-2 px-2 pb-3 mb-2 border-b border-gray-100">
                  <div className="w-7 h-7 bg-gray-950 rounded-[7px] flex items-center justify-center">
                    <span className="text-white font-black text-[7px] italic leading-none">WM</span>
                  </div>
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
                  <div className="text-[20px] font-extrabold text-gray-900 tracking-tight leading-tight">Brayan</div>
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
      <section className="px-6 md:px-16 pb-16 md:pb-20" style={{ background: '#f8fafc' }}>
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

      {/* ── CTA ── */}
      <section
        className="relative px-6 md:px-16 py-20 text-white text-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#1e3a8a,#3b82f6 55%,#6366f1)' }}
      >
        <div className="absolute rounded-full pointer-events-none" style={{ width: 400, height: 400, top: -150, right: -100, background: 'rgba(255,255,255,.06)' }} />
        <div className="absolute rounded-full pointer-events-none" style={{ width: 300, height: 300, bottom: -100, left: -80, background: 'rgba(255,255,255,.05)' }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="font-black mb-3" style={{ fontSize: 'clamp(28px,3.5vw,42px)', letterSpacing: '-1px' }}>
            Ready to take control of your inventory?
          </h2>
          <p className="text-white/80 text-[17px] mb-9 leading-relaxed">Join thousands of teams already using Warehouse Manager.</p>
          <button
            onClick={() => router.push('/signup')}
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-3.5 rounded-[11px] text-[15px] font-bold hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_4px_20px_rgba(0,0,0,.15)] hover:shadow-[0_8px_28px_rgba(0,0,0,.2)]"
          >
            Start for Free <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="text-center py-7 border-t border-gray-100 bg-white text-[13px] text-slate-400">
        Built by <span className="text-blue-600 font-semibold">PixelCore</span> &middot; Warehouse Manager &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
