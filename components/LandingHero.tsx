'use client';

import { useRouter } from 'next/navigation';
import './landing-hero.css';

export default function LandingHero() {
  const router = useRouter();

  return (
    <>
      {/* Shared SVG defs — mask used by all WM marks on this page */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <mask id="pt-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="300" height="200">
            <rect x="0" y="0" width="300" height="200" fill="#fff" />
            <polygon points="150,18 168,18 134,166 116,166" fill="#000" />
          </mask>
        </defs>
      </svg>

      {/* ── NAV ── */}
      <nav className="wm-nav">
        <div className="wm-nav-inner">
          <a href="#top" className="wm-logo">
            <span className="wm-logo-box">
              <svg viewBox="20 13 238 159" style={{ width: 17, color: '#fff' }} aria-hidden="true">
                <g transform="translate(28,0) skewX(-8)" mask="url(#pt-cut)">
                  <polyline points="30,28 56,156 84,62 112,156 140,28" fill="none" stroke="currentColor" strokeWidth="30" strokeLinejoin="miter" />
                  <polyline points="140,156 140,28 176,98 212,28 212,156" fill="none" stroke="currentColor" strokeWidth="30" strokeLinejoin="miter" />
                </g>
              </svg>
            </span>
            <span className="wm-wordmark">Warehouse Manager</span>
          </a>

          <div className="wm-nav-right">
            <span className="wm-nav-links">
              <a href="#whats-inside" className="wm-nav-link">What's inside</a>
              <a href="#download" className="wm-nav-link">Download</a>
              <a href="#help" className="wm-nav-link">Help</a>
            </span>
            <button className="wm-btn-primary wm-signin" onClick={() => router.push('/login')}>
              Sign in
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div id="top" className="wm-hero">
        <div className="wm-hero-row">
          <div className="wm-hero-copy">
            <h1 className="wm-h1">Your warehouse, right where you left it</h1>
            <p className="wm-hero-p">
              Every vault, job and conversation synced across your team. Sign in to pick up where you were, or install the app on this device.
            </p>
            <div className="wm-cta-row">
              <button className="wm-btn-primary wm-btn-hero-primary" onClick={() => router.push('/login')}>
                Sign in
              </button>
              <a href="#download" className="wm-btn-secondary">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M5 21h14" />
                </svg>
                Download the app
              </a>
            </div>
          </div>

          <div className="wm-status-pill">
            <span className="wm-status-dot" aria-hidden="true" />
            <div>
              <div className="wm-status-title">All systems operational</div>
              <div className="wm-status-sub">Latest release v2.6</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
