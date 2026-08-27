'use client';

import Link from 'next/link';
import { EnvelopeIcon, PhoneIcon, MapPinIcon } from '@/components/icons';

const SERVICES = [
  'Real-Time Vault Tracking',
  'Work Order Management',
  'Team Chat & Collaboration',
  'Analytics & Reports',
  'Daily Inventory Snapshots',
  'Multi-Warehouse Control',
];

// Public routes only — this footer also renders for signed-out visitors on the
// landing and login pages, where app routes would bounce them to /login.
const LINKS = [
  { label: 'Download the app', href: '/#download' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
];

export default function AppFooter() {
  return (
    <footer style={{ background: '#0f0f0f' }} className="text-white">
      {/* Main grid */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 pt-14 pb-10 grid grid-cols-1 md:grid-cols-3 gap-10">

        {/* Brand + contact */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wm-icon-fg.png" alt="WM" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 10, flexShrink: 0, mixBlendMode: 'screen' }} draggable={false} />
            <div>
              <p className="font-bold text-white text-sm leading-tight">Warehouse Manager</p>
              <p className="text-white/35 text-[11px] mt-0.5">by PixelCore</p>
            </div>
          </div>
          <p className="text-[13px] text-white/45 leading-[1.7] mb-6">
            Inventory management, vault tracking, and team coordination — built for restoration, moving, and storage companies.
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 py-2">
              <MapPinIcon className="w-4 h-4 text-white/25 flex-shrink-0" />
              <span className="text-[13px] text-white/55">Los Angeles, California</span>
            </div>
            <a
              href="mailto:support@managerwarehouse.cc"
              className="flex items-center gap-2.5 group py-2"
            >
              <EnvelopeIcon className="w-4 h-4 text-white/25 flex-shrink-0" />
              <span className="text-[13px] text-white/55 group-hover:text-white transition-colors">
                support@managerwarehouse.cc
              </span>
            </a>
            <a
              href="tel:+17142178029"
              className="flex items-center gap-2.5 group py-2"
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
          <ul className="space-y-1">
            {LINKS.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-[13px] text-white/50 hover:text-white transition-colors py-2 block"
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
          <div className="flex items-center gap-5">
            <Link href="/terms" className="text-[12px] text-white/25 hover:text-white/55 transition-colors py-2 px-1">
              Terms &amp; Conditions
            </Link>
            <Link href="/privacy" className="text-[12px] text-white/25 hover:text-white/55 transition-colors py-2 px-1">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
