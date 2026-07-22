'use client';

import AppFooter from './AppFooter';

const WM_TILE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='90'%3E%3Ctext x='70' y='62' font-family='Impact' font-size='44' font-weight='900' fill='rgba(0%2C0%2C0%2C0.04)' text-anchor='middle' font-style='italic'%3EWM%3C/text%3E%3C/svg%3E")`;

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#f8fafc', backgroundImage: WM_TILE, backgroundRepeat: 'repeat', backgroundSize: '140px 90px' }}
    >
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        {children}
      </div>
      <AppFooter />
    </div>
  );
}
