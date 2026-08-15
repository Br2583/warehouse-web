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
    <div
      style={{
        minHeight: '100dvh',
        background: '#0f0f0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        paddingTop: 'max(env(safe-area-inset-top, 0px), 60px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 36px)',
      }}
    >
      {/* Logo area — centered */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wm-logo.png"
          alt="WM"
          style={{ width: 150, height: 150, objectFit: 'contain', marginBottom: 8 }}
          draggable={false}
        />
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase' }}>
          Warehouse Manager
        </p>
      </div>

      {/* Buttons */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        <button
          onClick={() => router.push('/login')}
          style={{
            width: '100%',
            padding: '17px 0',
            background: '#2563eb',
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            borderRadius: 14,
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '-0.2px',
          }}
        >
          Welcome Back
        </button>

        <button
          onClick={() => router.push('/signup')}
          style={{
            width: '100%',
            padding: '17px 0',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
            borderRadius: 14,
            border: '1.5px solid rgba(255,255,255,0.12)',
            cursor: 'pointer',
            letterSpacing: '-0.2px',
          }}
        >
          Create Account
        </button>
      </div>

      {/* Legal links */}
      <p style={{ textAlign: 'center', fontSize: 11.5, color: 'rgba(255,255,255,0.28)', lineHeight: 1.7 }}>
        By continuing you agree to our{' '}
        <Link href="/terms" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
          Terms of Service
        </Link>
        {' '}and{' '}
        <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
