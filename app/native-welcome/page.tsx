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
    router.push('/signup?mode=join&code=' + encodeURIComponent(code.trim()));
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        paddingTop: 'max(env(safe-area-inset-top, 0px), 60px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 36px)',
      }}
    >
      {/* Logo area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wm-logo.png"
          alt="WM"
          style={{ width: 88, height: 88, objectFit: 'contain', borderRadius: 20 }}
          draggable={false}
        />
        <p style={{
          color: '#111827',
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: '-0.5px',
          marginTop: 18,
          lineHeight: 1,
        }}>
          Warehouse Manager
        </p>
        <p style={{
          color: '#9ca3af',
          fontSize: 14,
          fontWeight: 400,
          marginTop: 8,
        }}>
          Manage your team &amp; inventory
        </p>
      </div>

      {/* Bottom section */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Main buttons */}
        <button
          onClick={() => router.push('/login')}
          style={{
            width: '100%', padding: '16px 0',
            background: '#0a0a0a', color: '#fff',
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
            background: '#f8fafc', color: '#111827',
            fontSize: 16, fontWeight: 600,
            borderRadius: 16, border: '1.5px solid #e2e8f0', cursor: 'pointer',
          }}
        >
          Create Account
        </button>

        {/* Invite code toggle */}
        <button
          onClick={() => setShowInvite(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9ca3af', fontSize: 13, fontWeight: 500,
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
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: 14, color: '#111827', fontSize: 15,
                outline: 'none', letterSpacing: '1px',
              }}
            />
            <button
              onClick={handleInvite}
              style={{
                padding: '14px 20px',
                background: '#0a0a0a', color: '#fff',
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
          color: '#9ca3af', lineHeight: 1.7,
          marginTop: 8,
        }}>
          By continuing you agree to our{' '}
          <Link href="/terms" style={{ color: '#6b7280', textDecoration: 'underline', textUnderlineOffset: 2 }}>
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link href="/privacy" style={{ color: '#6b7280', textDecoration: 'underline', textUnderlineOffset: 2 }}>
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
