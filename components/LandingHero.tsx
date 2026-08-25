'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import './landing-hero.css';

type Cell = { s: 'e' | 'p' | 'r' | 'd'; c?: string };

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const COLS = [1, 2, 3, 4, 5, 6, 7, 8];

const GRID: Cell[][] = [
  [{ s:'d',c:'Martinez' },{ s:'d',c:'Chen' },{ s:'e' },{ s:'p',c:'Smith' },{ s:'r',c:'Lopez' },{ s:'d',c:'Torres' },{ s:'e' },{ s:'r',c:'Kim' }],
  [{ s:'p',c:'Brown' },{ s:'r',c:'Flores' },{ s:'d',c:'Rivera' },{ s:'r' },{ s:'e' },{ s:'p',c:'Davis' },{ s:'r',c:'Hall' },{ s:'d',c:'Clark' }],
  [{ s:'r',c:'Lewis' },{ s:'e' },{ s:'d',c:'Young' },{ s:'p',c:'Allen' },{ s:'r' },{ s:'e' },{ s:'d',c:'Scott' },{ s:'p',c:'King' }],
  [{ s:'d',c:'Hill' },{ s:'r',c:'Adams' },{ s:'e' },{ s:'r',c:'Baker' },{ s:'p' },{ s:'d',c:'Nelson' },{ s:'r' },{ s:'e' }],
  [{ s:'e' },{ s:'p',c:'Mitchell' },{ s:'r',c:'Roberts' },{ s:'d',c:'Turner' },{ s:'r',c:'Phillips' },{ s:'e' },{ s:'p',c:'Evans' },{ s:'r' }],
  [{ s:'r',c:'Stewart' },{ s:'d',c:'Morris' },{ s:'p' },{ s:'e' },{ s:'d',c:'Reed' },{ s:'r',c:'Cook' },{ s:'d' },{ s:'e' }],
  [{ s:'d' },{ s:'e' },{ s:'r',c:'Carter' },{ s:'p',c:'Green' },{ s:'d',c:'Wilson' },{ s:'r' },{ s:'e' },{ s:'d',c:'Moore' }],
  [{ s:'p',c:'Taylor' },{ s:'r' },{ s:'d',c:'Anderson' },{ s:'r',c:'Thomas' },{ s:'e' },{ s:'p' },{ s:'d',c:'Jackson' },{ s:'r' }],
];

const STATUS_CLS: Record<Cell['s'], string> = {
  e: 'empty', p: 'pending', r: 'ready', d: 'delivered',
};

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
          <p className="h-eyebrow">Vault Tracking · Job Management · Team Chat</p>
          <div className="h-hrow">
            <span className="h-num">05</span>
            <h1 className="h-h1">SMARTER.<br /><em>FASTER.</em></h1>
          </div>
          <div className="h-rule" />
          <p className="h-sub">Track every vault, client, and job across all your warehouses — from mobile or desktop.</p>
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

        {/* RIGHT — warehouse map mockup */}
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
                managerwarehouse.cc/warehouses/main
                <div className="url-live"><div className="url-live-dot" />LIVE</div>
              </div>
            </div>

            {/* App shell */}
            <div className="app-main">

              {/* Top bar */}
              <div className="app-topbar">
                <div>
                  <div className="app-title">Main Warehouse</div>
                  <div className="app-subtitle">Floor 1 · 50 of 64 vaults occupied</div>
                </div>
                <div className="app-topbar-r">
                  <div className="view-toggle">
                    <span className="vt-btn on">Map</span>
                    <span className="vt-btn">List</span>
                  </div>
                  <div className="tb-add">+ Vault</div>
                </div>
              </div>

              {/* Level + legend */}
              <div className="level-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="level-lbl">Level</span>
                  <div className="level-toggle">
                    <span className="lv-btn on">1</span>
                    <span className="lv-btn">2</span>
                  </div>
                </div>
                <div className="legend">
                  <div className="leg-item"><div className="leg-dot" style={{ background: '#3b82f6' }} /><span className="leg-lbl">Delivered</span></div>
                  <div className="leg-item"><div className="leg-dot" style={{ background: '#22c55e' }} /><span className="leg-lbl">Ready</span></div>
                  <div className="leg-item"><div className="leg-dot" style={{ background: '#fbbf24' }} /><span className="leg-lbl">Pending</span></div>
                </div>
              </div>

              {/* Stats chips */}
              <div className="stats-strip">
                <div className="ss-chip"><div className="ss-dot" style={{ background: '#3b82f6' }} />18 Delivered</div>
                <div className="ss-chip"><div className="ss-dot" style={{ background: '#22c55e' }} />20 Ready</div>
                <div className="ss-chip"><div className="ss-dot" style={{ background: '#fbbf24' }} />12 Pending</div>
                <div className="ss-chip"><div className="ss-dot" style={{ background: '#d1d5db' }} />14 Empty</div>
              </div>

              {/* Warehouse grid */}
              <div className="wh-grid-wrap">
                {/* Column headers */}
                <div className="wh-row">
                  <div className="wh-row-lbl" />
                  {COLS.map(n => <div key={n} className="wh-col-lbl">{n}</div>)}
                </div>
                {/* Grid rows */}
                {GRID.map((row, ri) => (
                  <div key={ri} className="wh-row">
                    <div className="wh-row-lbl">{ROWS[ri]}</div>
                    {row.map((cell, ci) => (
                      <div key={ci} className={`wh-cell ${STATUS_CLS[cell.s]}`}>
                        {cell.c && <div className="cell-client">{cell.c.slice(0, 7)}</div>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

            </div>
          </div>
          <div className="mob-scroll-glass" />
        </div>

      </div>
    </section>
  );
}
