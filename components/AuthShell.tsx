'use client';

import AppFooter from './AppFooter';

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        {children}
      </div>
      <AppFooter />
    </div>
  );
}
