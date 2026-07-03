import { NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

export async function GET() {
  const t0 = Date.now();

  // Pre-warm PocketBase and cache admin token (non-blocking — fails silently)
  getPbAdminToken().catch(() => {});

  // Lightweight PB health check (no auth needed, just wakes up PocketBase)
  const pbOk = await fetch(`${PB_URL}/api/health`, {
    signal: AbortSignal.timeout(6000),
  }).then(r => r.ok).catch(() => false);

  return NextResponse.json({ ok: true, pb: pbOk, ms: Date.now() - t0 });
}
