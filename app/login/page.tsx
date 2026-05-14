'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Building2, Ticket, ArrowLeft, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';

const BACKEND_URL = 'https://storagemap-3.emergent.host';

type Screen = 'main' | 'create' | 'join';

export default function LoginPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('main');
  const [companyName, setCompanyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    const sessionId = params.get('session_id');

    if (sessionId) {
      window.history.replaceState({}, document.title, window.location.pathname);
      handleGoogleCallback(sessionId);
      return;
    }

    const token = localStorage.getItem('session_token');
    if (token) {
      fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
              }).then((res) => {
        if (res.ok) router.replace('/dashboard');
        else {
          localStorage.removeItem('session_token');
          setLoading(false);
        }
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleGoogleCallback = async (sessionId: string) => {
    setAuthLoading(true);
    const action = localStorage.getItem('pending_auth_action');
    const savedCompany = localStorage.getItem('pending_company_name');
    const savedCode = localStorage.getItem('pending_invitation_code');
    localStorage.removeItem('pending_auth_action');
    localStorage.removeItem('pending_company_name');
    localStorage.removeItem('pending_invitation_code');

    let endpoint = '/api/auth/login';
    let body: any = { session_id: sessionId };

    if (action === 'create' && savedCompany) {
      endpoint = '/api/auth/create-company';
      body = { company_name: savedCompany, google_session_id: sessionId };
    } else if (action === 'join' && savedCode) {
      endpoint = '/api/auth/join-company';
      body = { invitation_code: savedCode, google_session_id: sessionId };
    }

    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.session_token) {
        localStorage.setItem('session_token', data.session_token);
        localStorage.setItem('pin_verified', 'true');
        router.replace('/dashboard');
      } else {
        setError(data.detail || 'Authentication failed');
        setAuthLoading(false);
        setLoading(false);
      }
    } catch {
      setError('Connection error. Please try again.');
      setAuthLoading(false);
      setLoading(false);
    }
  };

  const startGoogleAuth = (action: 'login' | 'create' | 'join') => {
    if (action === 'create' && !companyName.trim()) {
      setError('Enter a company name');
      return;
    }
    if (action === 'join' && inviteCode.length < 6) {
      setError('Enter a valid invitation code');
      return;
    }
    localStorage.setItem('pending_auth_action', action);
    if (action === 'create') localStorage.setItem('pending_company_name', companyName);
    if (action === 'join') localStorage.setItem('pending_invitation_code', inviteCode.toUpperCase());
    const redirect = encodeURIComponent(window.location.origin + '/login');
    window.location.href = `https://auth.emergentagent.com/?redirect=${redirect}`;
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">{authLoading ? 'Authenticating...' : 'Loading...'}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200"
          >
            <Package className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Manager</h1>
          <p className="text-gray-500 text-sm mt-1">
            {screen === 'main' && 'Access your account'}
            {screen === 'create' && 'Create a new company'}
            {screen === 'join' && 'Join with invitation code'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {error && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
              <span>⚠</span> {error}
              <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
            </motion.div>
          )}

          {/* MAIN */}
          {screen === 'main' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <button onClick={() => { setError(''); setScreen('create'); }}
                className="w-full flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3.5 px-5 rounded-xl transition-colors">
                <Building2 className="w-5 h-5" />
                Create New Company
              </button>

              <button onClick={() => startGoogleAuth('login')}
                className="w-full flex items-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3.5 px-5 rounded-xl border border-gray-200 transition-colors">
                <LogIn className="w-5 h-5 text-blue-500" />
                Sign In (Existing Account)
              </button>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <button onClick={() => { setError(''); setScreen('join'); }}
                className="w-full flex items-center gap-3 bg-orange-50 hover:bg-orange-100 text-orange-600 font-medium py-3.5 px-5 rounded-xl border border-orange-200 transition-colors">
                <Ticket className="w-5 h-5" />
                Join with Invitation Code
              </button>

              <p className="text-xs text-gray-400 text-center pt-3">
                Created by Brayan Romero Alvarez
              </p>
            </motion.div>
          )}

          {/* CREATE COMPANY */}
          {screen === 'create' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <button onClick={() => { setScreen('main'); setError(''); }}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="text-center py-2">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-7 h-7 text-blue-600" />
                </div>
                <p className="text-sm text-gray-500">You'll be the owner — invite up to 4 members</p>
              </div>

              <input
                type="text"
                placeholder="Company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />

              <button
                onClick={() => startGoogleAuth('create')}
                disabled={!companyName.trim()}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3.5 rounded-xl transition-colors"
              >
                Continue with Google
              </button>
            </motion.div>
          )}

          {/* JOIN COMPANY */}
          {screen === 'join' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <button onClick={() => { setScreen('main'); setError(''); }}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="text-center py-2">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Ticket className="w-7 h-7 text-orange-500" />
                </div>
                <p className="text-sm text-gray-500">Your admin shared a single-use code with you</p>
              </div>

              <input
                type="text"
                placeholder="XXXXXXXX"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-xl tracking-widest font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />

              <button
                onClick={() => startGoogleAuth('join')}
                disabled={inviteCode.length < 6}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3.5 rounded-xl transition-colors"
              >
                Verify with Google & Join
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
