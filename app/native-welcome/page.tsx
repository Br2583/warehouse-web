'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { pb } from '@/lib/pb';

export default function NativeWelcome() {
  const router = useRouter();
  const [showInvite, setShowInvite] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (pb.authStore.isValid) { router.replace('/dashboard'); }
  }, [router]);

  const handleInvite = () => {
    if (!code.trim()) return;
    router.push('/login?mode=join&code=' + encodeURIComponent(code.trim()));
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0f0f0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        paddingTop: 'max(env(safe-area-inset-top, 0px), 48px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 32px)',
      }}
    >
      {/* Logo area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wm-icon-fg.png"
          alt="WM"
          style={{ width: 140, height: 140, objectFit: 'contain' }}
          draggable={false}
        />
        <p style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '3px',
          textTransform: 'uppercase',
          marginTop: 12,
        }}>
          Warehouse Manager
        </p>
      </div>

      {/* Bottom section */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Main buttons */}
        <button
          onClick={() => router.push('/login')}
          style={{
            width: '100%', padding: '16px 0',
            background: '#2563eb', color: '#fff',
            fontSize: 16, fontWeight: 700,
            borderRadius: 16, border: 'none', cursor: 'pointer',
          }}
        >
          Welcome Back
        </button>

        <button
          onClick={() => router.push('/signup')}
          style={{
            width: '100%', padding: '16px 0',
            background: 'rgba(255,255,255,0.07)', color: '#fff',
            fontSize: 16, fontWeight: 600,
            borderRadius: 16, border: '1.5px solid rgba(255,255,255,0.1)', cursor: 'pointer',
          }}
        >
          Create Account
        </button>

        {/* Invite code toggle */}
        <button
          onClick={() => setShowInvite(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 500,
            padding: '6px 0', marginTop: 2,
          }}
        >
          {showInvite ? 'Cancel' : 'Have an invite code?'}
        </button>

        {/* Invite code form */}
        {showInvite && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="Enter invite code"
              maxLength={12}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              style={{
                flex: 1, padding: '14px 16px',
                background: 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.15)',
                borderRadius: 14, color: '#fff', fontSize: 15,
                outline: 'none', letterSpacing: '1px',
              }}
            />
            <button
              onClick={handleInvite}
              style={{
                padding: '14px 20px',
                background: '#2563eb', color: '#fff',
                fontSize: 14, fontWeight: 700,
                borderRadius: 14, border: 'none', cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Join
            </button>
          </div>
        )}

        {/* Legal */}
        <p style={{
          textAlign: 'center', fontSize: 11,
          color: 'rgba(255,255,255,0.22)', lineHeight: 1.7,
          marginTop: 8,
        }}>
          By continuing you agree to our{' '}
          <Link href="/terms" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
