'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { pb } from '@/lib/pb';
import { ArrowRight, LogIn, Building2, BarChart3, MessageSquare, Users } from 'lucide-react';

const PHRASES = [
  'Inventory & Records Management.',
  'Secure Warehouse Storage.',
  'Real-Time Vault Tracking.',
  'Trusted Warehouse Services.',
];

const FEATURES = [
  { icon: Building2,     title: 'Multi-Warehouse',    desc: 'Manage multiple warehouse locations from one centralized dashboard.' },
  { icon: BarChart3,     title: 'Live Analytics',      desc: 'Track inventory, production and delivery status in real time.' },
  { icon: MessageSquare, title: 'Team Chat',           desc: 'Built-in messaging to keep your team aligned and connected.' },
  { icon: Users,         title: 'Role-Based Access',   desc: 'Invite your team with owner and worker permission levels.' },
];

export default function Home() {
  const router = useRouter();
  const [displayed, setDisplayed] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    if (pb.authStore.isValid) {
      router.replace('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    const phrase = PHRASES[phraseIndex];
    let timeout: ReturnType<typeof setTimeout>;
    if (typing) {
      if (displayed.length < phrase.length) {
        timeout = setTimeout(() => setDisplayed(phrase.slice(0, displayed.length + 1)), 55);
      } else {
        timeout = setTimeout(() => setTyping(false), 2400);
      }
    } else {
      if (displayed.length > 0) {
        timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 28);
      } else {
        setPhraseIndex(i => (i + 1) % PHRASES.length);
        setTyping(true);
      }
    }
    return () => clearTimeout(timeout);
  }, [displayed, typing, phraseIndex]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-sm">Warehouse Manager</span>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Warehouse Management Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-none tracking-tight mb-2">
            Warehouse
          </h1>
          <h1
            className="text-5xl md:text-7xl font-black leading-none tracking-tight mb-8"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Manager
          </h1>

          <div className="h-6 flex items-center justify-center gap-1 mb-10">
            <span className="text-gray-400 text-sm">{displayed}</span>
            <span className="inline-block w-0.5 h-4 bg-blue-400 animate-pulse" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push('/login')}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-2xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            <button
              onClick={() => router.push('/login')}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-gray-700 border border-gray-200 rounded-2xl text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 border-t border-gray-100 bg-white">
        <p className="text-xs text-gray-400">
          Built by <span className="font-semibold text-gray-600">PixelCore</span>
        </p>
      </footer>
    </div>
  );
}
