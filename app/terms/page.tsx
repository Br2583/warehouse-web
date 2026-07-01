'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-8"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gray-950 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-sm italic leading-none">WM</span>
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-sm">Warehouse Manager</h1>
            <p className="text-xs text-slate-400">Terms &amp; Conditions</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm space-y-6 text-sm">
          <div>
            <p className="text-xs text-slate-400 mb-1">Last updated: June 2025</p>
            <h2 className="text-xl font-bold text-gray-900">Terms &amp; Conditions</h2>
          </div>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">1. Acceptance of Terms</h3>
            <p className="text-slate-600 leading-relaxed">
              By creating an account and using Warehouse Manager (&quot;the Service&quot;), you agree to be bound by these Terms &amp; Conditions. If you do not agree, do not use the Service.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">2. No Warranty &amp; Limitation of Liability</h3>
            <p className="text-slate-600 leading-relaxed">
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied. Brayan Jesus Romero and PixelCore shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to data loss, business interruption, or loss of profits, arising from your use or inability to use the Service. Your use of this platform is entirely at your own risk.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">3. User Responsibility</h3>
            <p className="text-slate-600 leading-relaxed">
              You are solely responsible for all activity that occurs under your account and within your organization. You agree to keep your login credentials secure, notify us immediately of any unauthorized use, and use the Service only for lawful business purposes. You are responsible for all data entered into the platform by you and your team members.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">4. Your Data</h3>
            <p className="text-slate-600 leading-relaxed">
              You retain ownership of all data you enter into the Service. We store your data solely to provide and improve the Service. We will not sell or share your data with third parties except as required by applicable law or as necessary to operate the Service (e.g., hosting providers).
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">5. Account Approval</h3>
            <p className="text-slate-600 leading-relaxed">
              Company accounts are subject to manual review and approval. We reserve the right to reject, suspend, or terminate any account at our sole discretion, including accounts that violate these Terms or are used for any unlawful purpose.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">6. Service Changes &amp; Termination</h3>
            <p className="text-slate-600 leading-relaxed">
              We reserve the right to modify, suspend, or discontinue the Service at any time without prior notice. We may update these Terms at any time; continued use of the Service after changes constitutes your acceptance of the updated Terms.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">7. Indemnification</h3>
            <p className="text-slate-600 leading-relaxed">
              You agree to indemnify, defend, and hold harmless Brayan Jesus Romero and PixelCore from any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys&apos; fees) arising from your use of the Service, your violation of these Terms, or your violation of any rights of a third party.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">8. Governing Law</h3>
            <p className="text-slate-600 leading-relaxed">
              These Terms shall be governed by and construed in accordance with applicable law. Any disputes shall be resolved in the appropriate courts of competent jurisdiction.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">9. Contact</h3>
            <p className="text-slate-600 leading-relaxed">
              For questions or concerns about these Terms, contact us at:{' '}
              <a href="mailto:noreplywarehousemanager@gmail.com" className="text-blue-600 hover:underline font-medium">
                noreplywarehousemanager@gmail.com
              </a>
            </p>
          </section>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} PixelCore &mdash; Warehouse Manager. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
