'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { pb } from '@/lib/pb';
import AppFooter from '@/components/AppFooter';
import LandingHero from '@/components/LandingHero';
import {
  BuildingOffice2Icon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

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
  { label: 'Total Vaults', val: '24', bg: '#eff6ff', dot: '#2563eb' },
  { label: 'Work Orders', val: '8',  bg: '#fff7ed', dot: '#ea580c' },
  { label: 'Ready',       val: '12', bg: '#f0fdf4', dot: '#16a34a' },
  { label: 'Delivered',   val: '4',  bg: '#faf5ff', dot: '#7c3aed' },
];
const BAR_HEIGHTS = [40, 65, 35, 80, 55, 90, 70];

export default function Home() {
  const router = useRouter();

  // Redirect if already logged in + pre-warm PocketBase
  useEffect(() => {
    if (pb.authStore.isValid) { router.replace('/dashboard'); return; }
    fetch('/api/ping').catch(() => {});
  }, [router]);

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
