'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import './landing-hero.css';

const GRID: { row: string; cells: string[] }[] = [
  { row: 'A', cells: ['pending','empty','ready','ready','empty','delivered','pending','empty'] },
  { row: 'B', cells: ['ready','pending','empty','ready','ready','empty','pending','delivered'] },
  { row: 'C', cells: ['delivered','ready','ready','empty','pending','ready','empty','ready'] },
  { row: 'D', cells: ['empty','delivered','pending','ready','empty','ready','ready','pending'] },
  { row: 'E', cells: ['ready','empty','ready','pending','delivered','empty','ready','empty'] },
];
const LABELS = ['MA', 'JO', 'SM', 'DA', 'WI', 'TA'];
const TASKS = [
  { type: 'Fire',   bg: '#fff7ed', fg: '#c2410c', client: 'Martinez', st: 'ts-progress', stl: 'In Progress' },
  { type: 'Water',  bg: '#eff6ff', fg: '#1d4ed8', client: 'Johnson',  st: 'ts-pending',  stl: 'Pending' },
  { type: 'Moving', bg: '#f5f3ff', fg: '#7c3aed', client: 'Smith',    st: 'ts-done',     stl: 'Done' },
];
const CHAT = [
  { name: 'Maria',  msg: 'Vault B4 is ready 🟢',  me: false, color: '#16a34a' },
  { name: 'You',    msg: 'Moving job updated',     me: true,  color: '#2563eb' },
  { name: 'Carlos', msg: 'Fire job assigned',      me: false, color: '#ea580c' },
];

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

            {/* Browser chrome */}
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

            {/* App body */}
            <div className="app-body">

              {/* Sidebar */}
              <div className="app-sidebar">
                <div className="sb-header">
                  <div className="sb-logo-box"><span className="sb-logo-txt">WM</span></div>
                </div>
                <div className="sb-nav">
                  {[true, false, false, false, false, false].map((active, i) => (
                    <div key={i} className={`sb-item${active ? ' active' : ''}`}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: active ? '#2563eb' : '#e5e7eb' }} />
                      {i === 3 && <div className="sb-badge">3</div>}
                      {i === 5 && <div className="sb-badge">2</div>}
                    </div>
                  ))}
                </div>
                <div className="sb-footer">
                  <div className="sb-avatar">A</div>
                </div>
              </div>

              {/* Main content */}
              <div className="app-main">

                {/* Topbar */}
                <div className="app-topbar">
                  <div>
                    <div className="app-title">Good morning, Alex</div>
                    <div className="app-subtitle">Warehouse A · 54 active vaults</div>
                  </div>
                  <div className="app-topbar-r">
                    <div className="tb-add">
                      <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                      Add Vault
                    </div>
                  </div>
                </div>

                {/* Stats chips */}
                <div className="stats-strip">
                  {[
                    { color: '#2563eb', label: '24 Total' },
                    { color: '#fbbf24', label: '8 Pending' },
                    { color: '#22c55e', label: '12 Ready' },
                    { color: '#3b82f6', label: '4 Delivered' },
                  ].map(({ color, label }) => (
                    <div key={label} className="ss-chip">
                      <div className="ss-dot" style={{ background: color }} />{label}
                    </div>
                  ))}
                </div>

                {/* Level bar */}
                <div className="level-bar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="level-lbl">LEVEL</span>
                    <div className="level-toggle">
                      <div className="lv-btn on">Lower</div>
                      <div className="lv-btn">Upper</div>
                    </div>
                  </div>
                  <div className="legend">
                    {[
                      { color: '#fbbf24', label: 'Pending' },
                      { color: '#22c55e', label: 'Ready' },
                      { color: '#3b82f6', label: 'Delivered' },
                    ].map(({ color, label }) => (
                      <div key={label} className="leg-item">
                        <div className="leg-dot" style={{ background: color }} />
                        <div className="leg-lbl">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warehouse grid */}
                <div className="wh-grid-wrap">
                  <div className="wh-row">
                    <div className="wh-row-lbl" />
                    {[1,2,3,4,5,6,7,8].map(c => <div key={c} className="wh-col-lbl">{c}</div>)}
                  </div>
                  {GRID.map(({ row, cells }) => (
                    <div key={row} className="wh-row">
                      <div className="wh-row-lbl">{row}</div>
                      {cells.map((st, i) => (
                        <div key={i} className={`wh-cell ${st}`}>
                          {st !== 'empty' && <div className="cell-client">{LABELS[i % LABELS.length]}</div>}
                          {st === 'empty'  && <div className="cell-plus">+</div>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Tasks + Chat split */}
                <div className="app-split">
                  <div className="split-col">
                    <div className="split-hd">Tasks</div>
                    <div className="task-items">
                      {TASKS.map(({ type, bg, fg, client, st, stl }) => (
                        <div key={client} className="task-row">
                          <div className="task-type-pill" style={{ background: bg, color: fg }}>{type}</div>
                          <div className="task-detail"><div className="task-client">{client}</div></div>
                          <div className={`task-st ${st}`}>{stl}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="split-col">
                    <div className="split-hd">Team Chat</div>
                    <div className="chat-items">
                      {CHAT.map(({ name, msg, me, color }) => (
                        <div key={name} className={`chat-msg${me ? ' me' : ''}`}>
                          <div className="chat-av" style={{ background: color }}>{name[0]}</div>
                          <div className="chat-bw">
                            <div className="chat-name">{name}</div>
                            <div className="chat-bubble">{msg}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
          {/* Touch pass-through on mobile so page still scrolls over the frame */}
          <div className="mob-scroll-glass" />
        </div>

      </div>
    </section>
  );
}
