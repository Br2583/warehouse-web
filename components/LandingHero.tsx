'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import './landing-hero.css';

const KPI = [
  { label: 'Total Vaults', val: '24', bg: '#eff6ff', dot: '#2563eb' },
  { label: 'Work Orders',  val: '8',  bg: '#fff7ed', dot: '#ea580c' },
  { label: 'Ready',        val: '12', bg: '#f0fdf4', dot: '#16a34a' },
  { label: 'Delivered',    val: '4',  bg: '#faf5ff', dot: '#7c3aed' },
];
const BAR = [40, 65, 35, 80, 55, 90, 70];
const NAV = ['Dashboard', 'Warehouses', 'Storage', 'Tasks', 'Stats', 'Chat'];

export default function LandingHero() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!t.closest('#lh-nav') && !t.closest('.mob-dd')) setMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);

  return (
    <section className="hero" id="home">

      {/* NAV */}
      <nav className="lh-nav" id="lh-nav">
        <div className="nav-l">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="lh-logo">
            <img src="/wm-logo.png" alt="WM" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 8 }} draggable={false} />
            <span className="logo-name">Warehouse Manager</span>
          </div>
          <ul className="nav-links">
            <li className="nl"><a href="#home">Home</a></li>
            <li className="nl"><a href="#features">Features</a></li>
            <li className="nl"><a href="#about">About</a></li>
            <li className="nl"><a href="#contact">Contact</a></li>
          </ul>
        </div>
        <div className="nav-r">
          <button className="lh-btn-ghost" onClick={() => router.push('/login')}>Sign in</button>
          <button className="lh-btn-black" onClick={() => router.push('/login')}>Get access →</button>
          <button className="lh-hbg" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
            <svg fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </div>
      </nav>

      {/* MOBILE DROPDOWN */}
      {menuOpen && (
        <div className="mob-dd open">
          <a className="mob-lnk" href="#home"     onClick={() => setMenuOpen(false)}>Home</a>
          <a className="mob-lnk" href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a className="mob-lnk" href="#about"    onClick={() => setMenuOpen(false)}>About</a>
          <a className="mob-lnk" href="#contact"  onClick={() => setMenuOpen(false)}>Contact</a>
        </div>
      )}

      {/* HERO BODY */}
      <div className="hbody">

        {/* LEFT — copy */}
        <div className="h-copy">
          <p className="h-eyebrow">Futuristic · Warehouse Management</p>
          <div className="h-hrow">
            <span className="h-num">05</span>
            <h1 className="h-h1">SMARTER.<br /><em>FASTER.</em></h1>
          </div>
          <div className="h-rule" />
          <div className="h-ctas">
            <button className="lh-btn-black" onClick={() => router.push('/login')}>Get access →</button>
            <button className="lh-btn-ghost" onClick={() => router.push('/login')}>Sign in</button>
            <a
              href="#download"
              className="lh-btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
            >
              <svg fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Get the App
            </a>
          </div>
          <div className="h-trust">
            <div className="jbadge jb-fire">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
              Fire Damage
            </div>
            <div className="jbadge jb-water">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
              Water Damage
            </div>
            <div className="jbadge jb-moving">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              Moving
            </div>
            <div className="jbadge jb-storage">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Storage
            </div>
          </div>
        </div>

        {/* RIGHT — dashboard mockup */}
        <div className="app-wrap">
          <div className="app-glow" />
          <div className="app-frame">

            {/* Browser bar */}
            <div className="browser-bar">
              <div className="btr">
                <div className="bt bt-r" /><div className="bt bt-y" /><div className="bt bt-g" />
              </div>
              <div className="url-bar">
                <svg className="url-lock" width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1C8.676 1 6 3.676 6 7v1H4v15h16V8h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v1H8V7c0-2.276 1.724-4 4-4zm0 9c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/>
                </svg>
                managerwarehouse.cc/dashboard
                <div className="url-live"><div className="url-live-dot" />LIVE</div>
              </div>
            </div>

            {/* Dashboard body */}
            <div className="dash-body">

              {/* Sidebar — visible only on desktop */}
              <div className="dash-sidebar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px 10px', marginBottom: 6, borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "Impact,'Arial Black',sans-serif", fontStyle: 'italic', fontSize: 9, color: '#fff', letterSpacing: '-0.5px' }}>WM</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>Warehouse</span>
                </div>
                {NAV.map((item, i) => (
                  <div key={item} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 6,
                    fontSize: 11, cursor: 'default',
                    background: i === 0 ? '#eff6ff' : 'transparent',
                    color: i === 0 ? '#2563eb' : '#9ca3af',
                    fontWeight: i === 0 ? 600 : 400,
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', opacity: 0.7 }} />
                    {item}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div style={{ flex: 1, background: '#f8fafc', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', minWidth: 0 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Good morning,</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px', lineHeight: 1.2 }}>Alex</div>
                </div>

                {/* KPI cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {KPI.map(k => (
                    <div key={k.label} style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 10, padding: '10px 8px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: k.dot }} />
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px', lineHeight: 1 }}>{k.val}</div>
                      <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>{k.label}</div>
                    </div>
                  ))}
                </div>

                {/* Charts */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 10, padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Inventory Status</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
                      {BAR.map((h, i) => (
                        <div key={i} style={{ flex: 1, borderRadius: '2px 2px 0 0', height: `${h}%`, background: i === 3 || i === 5 ? '#3b82f6' : '#bfdbfe' }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 10, padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Production</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>In Progress <strong style={{ color: '#374151' }}>3</strong></div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>Completed <strong style={{ color: '#16a34a' }}>5</strong></div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>Pending <strong style={{ color: '#374151' }}>2</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
          <div className="mob-scroll-glass" />
        </div>

      </div>
    </section>
  );
}
