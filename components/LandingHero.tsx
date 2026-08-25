'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import './landing-hero.css';

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
          <div className="lh-logo"><img src="/wm-logo.png" alt="WM" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 8 }} draggable={false} /><span className="logo-name">Warehouse Manager</span></div>
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
          <a className="mob-lnk" href="#home" onClick={() => setMenuOpen(false)}>Home</a>
          <a className="mob-lnk" href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a className="mob-lnk" href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a className="mob-lnk" href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </div>
      )}

      {/* HERO BODY — text only, no animated mockup */}
      <div className="hbody">
        <div className="h-copy" style={{ maxWidth: '640px' }}>
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
      </div>
    </section>
  );
}
