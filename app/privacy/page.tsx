'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function PrivacyPage() {
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
            <p className="text-xs text-slate-400">Privacy Policy</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm space-y-6 text-sm">
          <div>
            <p className="text-xs text-slate-400 mb-1">Last updated: July 2026</p>
            <h2 className="text-xl font-bold text-gray-900">Privacy Policy</h2>
          </div>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">1. Overview</h3>
            <p className="text-slate-600 leading-relaxed">
              This Privacy Policy explains what information Warehouse Manager (&quot;the Service&quot;) collects, how it is used, and the choices you have. By using the Service, you agree to the collection and use of information as described here.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">2. Information We Collect</h3>
            <p className="text-slate-600 leading-relaxed">
              <span className="font-medium text-gray-800">Account information:</span> name, email address, and profile picture provided through Google Sign-In.
              <br /><br />
              <span className="font-medium text-gray-800">Organization information:</span> company name, invite codes, team member list, and roles (owner/worker).
              <br /><br />
              <span className="font-medium text-gray-800">Operational data:</span> inventory records, warehouse and storage unit data, photos attached to inventory items, work orders, tasks, snapshots, and team chat messages &mdash; all entered by you or your team.
              <br /><br />
              <span className="font-medium text-gray-800">Technical data:</span> session cookies used to keep you signed in and to enforce portal access controls, along with basic usage logs (e.g. timestamps, error reports) used to keep the Service running reliably.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">3. How We Use Your Information</h3>
            <p className="text-slate-600 leading-relaxed">
              We use the information above solely to operate, maintain, and improve the Service: authenticating your account, displaying your organization&apos;s data back to your team, sending operational notifications (task assignments, status updates, snapshot reports you request), and diagnosing technical issues. We do not use your data for advertising, and we do not sell your data to anyone.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">4. Who Can See Your Data</h3>
            <p className="text-slate-600 leading-relaxed">
              Operational data (inventory, photos, chat, tasks) is only visible to members of your own company account. It is not shared across organizations. We rely on trusted third-party providers to run the Service &mdash; including our hosting/database provider, Google (for sign-in), and our email delivery provider (for notifications and snapshot reports) &mdash; and these providers process data only as needed to perform their function, under their own applicable terms.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">5. Photos &amp; Third-Party Content You Upload</h3>
            <p className="text-slate-600 leading-relaxed">
              Warehouse Manager is a tool that stores whatever content your organization chooses to upload &mdash; including photos and client names entered by you or your team. Your organization is responsible for having the right to collect and store that information (for example, any necessary consent from your own clients or employees) before entering it into the Service. We act only as the platform that stores and displays this content on your organization&apos;s behalf.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">6. Data Retention &amp; Deletion</h3>
            <p className="text-slate-600 leading-relaxed">
              Deleted inventory items are moved to a recoverable &quot;Deleted&quot; area before permanent removal, so accidental deletions can be undone by an account owner. You may request permanent deletion of your account and associated data at any time from your Profile page, or by contacting us directly. We retain data only for as long as reasonably necessary to provide the Service or as required by law.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">7. Security</h3>
            <p className="text-slate-600 leading-relaxed">
              We apply reasonable technical and organizational measures to protect your information, including access controls, session expiry, and rate limiting on sensitive actions. However, no method of electronic storage or transmission is completely secure, and we cannot guarantee absolute security. You are responsible for keeping your own login credentials and portal codes confidential.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">8. Your Rights</h3>
            <p className="text-slate-600 leading-relaxed">
              You may access, correct, export, or delete your personal information at any time through your Profile page, or by reaching out to us using the contact details below. Company owners may also manage or remove team members and their access.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">9. Children&apos;s Privacy</h3>
            <p className="text-slate-600 leading-relaxed">
              The Service is intended for business use by adults and is not directed at children. We do not knowingly collect information from anyone under the age of 16.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">10. Changes to This Policy</h3>
            <p className="text-slate-600 leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in the Service or applicable law. We will update the &quot;Last updated&quot; date above whenever we do. Continued use of the Service after changes take effect constitutes acceptance of the revised policy.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900">11. Contact</h3>
            <p className="text-slate-600 leading-relaxed">
              For questions or requests regarding your data, contact us at:{' '}
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
