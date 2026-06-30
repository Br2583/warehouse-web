'use client';

import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import {
  PhoneIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';

export default function SupportPage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 px-4 md:px-8 pb-28 md:pb-8 pt-6 md:pt-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Support</h1>
          <p className="text-slate-500 text-sm mb-8">Need help or want to learn more about the app?</p>

          {/* App info card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-4">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-gray-950 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-white font-black text-base italic leading-none">WM</span>
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-base">Warehouse Manager</h2>
                <p className="text-xs text-slate-400 mt-0.5">Version 1.0 &middot; Multi-company warehouse platform</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Warehouse Manager is a platform built to help restoration, moving, and storage companies manage their inventory with ease. It provides real-time vault tracking, team collaboration, work order management, daily snapshots, and analytics &mdash; all in one place.
            </p>
          </div>

          {/* Creator card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-4">
            <div className="flex items-center gap-2 mb-4">
              <CodeBracketIcon className="w-4 h-4 text-slate-400" />
              <h3 className="font-semibold text-gray-900 text-sm">About the Creator</h3>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-lg">B</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Brayan Jesus Romero</p>
                <p className="text-xs text-slate-400 mb-3">Independent Software Developer &middot; PixelCore</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Warehouse Manager was designed and developed by Brayan Jesus Romero, an independent developer focused on creating practical software solutions for real business needs. This platform is actively maintained and improved based on user feedback.
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
              <HeartIcon className="w-3.5 h-3.5 text-red-400" />
              <span>Built with care for restoration &amp; moving companies</span>
            </div>
          </div>

          {/* Contact card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Get in Touch</h3>
            <div className="space-y-2">
              <a
                href="mailto:noreplywarehousemanager@gmail.com"
                className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                  <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Email Support</p>
                  <p className="text-sm font-medium text-gray-900">noreplywarehousemanager@gmail.com</p>
                </div>
              </a>

              <a
                href="tel:+17142178029"
                className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-green-100 transition-colors">
                  <PhoneIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Phone</p>
                  <p className="text-sm font-medium text-gray-900">+1 (714) 217-8029</p>
                </div>
              </a>
            </div>

            <p className="text-xs text-slate-400 mt-4 px-1">
              We typically respond to emails within 24&ndash;48 hours on business days.
            </p>
          </div>

          {/* Legal card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Legal</h3>
            <Link
              href="/terms"
              className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-slate-100 transition-colors">
                <DocumentTextIcon className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Terms &amp; Conditions</p>
                <p className="text-xs text-slate-400">View our terms of service</p>
              </div>
            </Link>

            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs text-slate-400">
                &copy; {new Date().getFullYear()} PixelCore &mdash; Warehouse Manager. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
