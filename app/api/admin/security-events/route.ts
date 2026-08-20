import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { getSecurityEvents, SecurityEventType } from '@/lib/security-events';

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const events = await getSecurityEvents(200);

  const stats: Record<SecurityEventType, number> = {
    rate_limit_hit: 0,
    admin_login_failed: 0,
  };
  for (const e of events) {
    if (e.type in stats) stats[e.type]++;
  }

  return NextResponse.json({ events, stats, ts: Date.now() });
}
