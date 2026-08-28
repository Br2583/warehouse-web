'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Activity Log and Deleted Vaults are one section for the user: what happened,
// and what was removed. They stay separate routes so each is deep-linkable, but
// share this bar so neither is reachable only by typing the URL.
const TABS = [
  { href: '/activity', label: 'Activity Log' },
  { href: '/deleted',  label: 'Deleted Vaults' },
];

export default function HistoryTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="History views" className="inline-flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6">
      {TABS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'px-3.5 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white transition-colors'
                : 'px-3.5 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors'
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
