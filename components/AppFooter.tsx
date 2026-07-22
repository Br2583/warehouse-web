'use client';

import Link from 'next/link';
import { EnvelopeIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline';

const SERVICES = [
  'Real-Time Vault Tracking',
  'Work Order Management',
  'Team Chat & Collaboration',
  'Analytics & Reports',
  'Daily Inventory Snapshots',
  'Multi-Warehouse Control',
];

const LINKS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Warehouses', href: '/warehouses' },
  { label: 'Production', href: '/production' },
  { label: 'Support', href: '/support' },
  { label: 'Terms & Conditions', href: '/terms' },
];

export default function AppFooter() {
  return (
    <footer style={{ background: '#0f0f0f' }} className="text-white">
      {/* Main grid */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 pt-14 pb-10 grid grid-cols-1 md:grid-cols-3 gap-10">

        {/* Brand + contact */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-white/10 border border-white/15 rounded-[10px] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-xs italic leading-none">WM</span>
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">Warehouse Manager</p>
              <p className="text-white/35 text-[11px] mt-0.5">by PixelCore</p>
            </div>
          </div>
          <p className="text-[13px] text-white/45 leading-[1.7] mb-6">
            Inventory management, vault tracking, and team coordination — built for restoration, moving, and storage companies.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <MapPinIcon className="w-4 h-4 text-white/25 flex-shrink-0" />
              <span className="text-[13px] text-white/55">Los Angeles, California</span>
            </div>
            <a
              href="mailto:noreplywarehousemanager@gmail.com"
              className="flex items-center gap-2.5 group"
            >
              <EnvelopeIcon className="w-4 h-4 text-white/25 flex-shrink-0" />
              <span className="text-[13px] text-white/55 group-hover:text-white transition-colors">
                noreplywarehousemanager@gmail.com
              </span>
            </a>
            <a
              href="tel:+17142178029"
              className="flex items-center gap-2.5 group"
            >
              <PhoneIcon className="w-4 h-4 text-white/25 flex-shrink-0" />
              <span className="text-[13px] text-white/55 group-hover:text-white transition-colors">
                +1 (714) 217-8029
              </span>
            </a>
          </div>
        </div>

        {/* Services */}
        <div>
          <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-5">Services</h4>
          <ul className="space-y-3">
            {SERVICES.map(s => (
              <li key={s} className="flex items-center gap-2.5">
                <span className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-[13px] text-white/50">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Navigation */}
        <div>
          <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-5">Navigation</h4>
          <ul className="space-y-3">
            {LINKS.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-[13px] text-white/50 hover:text-white transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.06] px-6 md:px-12 py-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[12px] text-white/25">
            &copy; {new Date().getFullYear()} PixelCore &mdash; Warehouse Manager. All rights reserved.
          </p>
          <Link href="/terms" className="text-[12px] text-white/25 hover:text-white/55 transition-colors">
            Terms &amp; Conditions
          </Link>
        </div>
      </div>
    </footer>
  );
}
