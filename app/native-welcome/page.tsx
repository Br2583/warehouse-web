'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { pb } from '@/lib/pb';

export default function NativeWelcome() {
  const router = useRouter();

  useEffect(() => {
    if (pb.authStore.isValid) { router.replace('/dashboard'); }
  }, [router]);

  return (
    <div style={{
      position: 'relative',
      height: '100dvh',
      width: '100%',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* ── Photo collage ── */}
      <div
        className="ob-collage-top"
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: '15.4dvh 15.4dvh 13dvh',
          gap: 6,
          padding: '6px 6px 0',
          flexShrink: 0,
        }}
      >
        {/* col 1, row 1 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/onboarding/wh-1.jpg" alt="Warehouse" draggable={false}
          style={{ gridColumn: '1/2', gridRow: '1/2', width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />

        {/* col 2, rows 1–2 (tall) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/onboarding/wh-2.jpg" alt="Warehouse" draggable={false}
          style={{ gridColumn: '2/3', gridRow: '1/3', width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />

        {/* col 3, row 1 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/onboarding/wh-3.jpg" alt="Warehouse" draggable={false}
          style={{ gridColumn: '3/4', gridRow: '1/2', width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />

        {/* col 1, rows 2–3 (tall) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/onboarding/wh-4.jpg" alt="Warehouse" draggable={false}
          style={{ gridColumn: '1/2', gridRow: '2/4', width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />

        {/* col 3, rows 2–3 (tall) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/onboarding/wh-5.jpg" alt="Warehouse" draggable={false}
          style={{ gridColumn: '3/4', gridRow: '2/4', width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />

        {/* col 2, row 3 (wh-1 reused) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/onboarding/wh-1.jpg" alt="Warehouse" draggable={false}
          style={{ gridColumn: '2/3', gridRow: '3/4', width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />

        {/* Fade-to-white at bottom of collage */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          height: 70,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, #ffffff 92%)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* ── White content panel ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 26px',
        background: '#ffffff',
      }}>

        {/* WM monogram — floats vertically centered in available space */}
        <svg
          viewBox="20 13 238 159"
          style={{ width: 74, color: '#0a0a0a', marginTop: 'auto', flexShrink: 0 }}
          aria-hidden="true"
        >
          <defs>
            <mask id="wm-ob-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="300" height="200">
              <rect x="0" y="0" width="300" height="200" fill="#fff" />
              <polygon points="150,18 168,18 134,166 116,166" fill="#000" />
            </mask>
          </defs>
          <g transform="translate(28,0) skewX(-8)" mask="url(#wm-ob-cut)">
            <polyline points="30,28 56,156 84,62 112,156 140,28" fill="none" stroke="currentColor" strokeWidth="30" strokeLinejoin="miter" />
            <polyline points="140,156 140,28 176,98 212,28 212,156" fill="none" stroke="currentColor" strokeWidth="30" strokeLinejoin="miter" />
          </g>
        </svg>

        {/* Bottom block — headline + buttons + legal */}
        <div
          className="ob-bottom-pad"
          style={{
            width: '100%',
            marginTop: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <h1
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              margin: '0 0 4px',
              fontWeight: 600,
              fontSize: 18,
              letterSpacing: 0,
              color: '#0a0a0a',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            Welcome to Warehouse Manager
          </h1>

          <button
            onClick={() => router.push('/signup')}
            style={{
              width: '100%', padding: 15,
              background: '#0a0a0a', color: '#fff',
              borderRadius: 12, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 15, letterSpacing: '0.02em',
              textAlign: 'center',
            }}
          >
            Sign up
          </button>

          <button
            onClick={() => router.push('/login')}
            style={{
              width: '100%', padding: 15,
              background: '#f0f0f0', color: '#0a0a0a',
              borderRadius: 12, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 15, letterSpacing: '0.02em',
              textAlign: 'center',
            }}
          >
            Log in
          </button>

          <p style={{ margin: '6px 0 0', fontSize: 11, lineHeight: 1.5, color: '#8a8a8a', textAlign: 'center' }}>
            By continuing, you agree to our{' '}
            <Link href="/terms" style={{ color: '#4a4a4a', fontWeight: 600, textDecoration: 'none' }}>
              Terms of Service
            </Link>
            {' '}and acknowledge you&apos;ve read our{' '}
            <Link href="/privacy" style={{ color: '#4a4a4a', fontWeight: 600, textDecoration: 'none' }}>
              Privacy Policy
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
