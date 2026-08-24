import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, snapshotReportEmail } from '@/lib/email';
import { PB_URL } from '@/lib/pb-admin';

async function getAuthenticatedUser(req: NextRequest): Promise<{ id: string; email: string; company_id: string } | null> {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  try {
    const res = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const { record } = await res.json();
    return record ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const me = await getAuthenticatedUser(req);
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!me.company_id) return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });

  try {
    const body = await req.json();
    const { to, warehouseName, date, total, pending, ready, delivered, vaults } = body;

    // Only allow sending to the authenticated user's own email to prevent relay abuse
    if (!to || to !== me.email) {
      return NextResponse.json({ error: 'Can only send report to your own email address' }, { status: 403 });
    }

    if (!warehouseName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (vaults !== undefined && !Array.isArray(vaults)) {
      return NextResponse.json({ error: 'Invalid vaults data' }, { status: 400 });
    }
    if (Array.isArray(vaults) && vaults.length > 5000) {
      return NextResponse.json({ error: 'Report too large' }, { status: 400 });
    }

    const { subject, html } = snapshotReportEmail({ warehouseName, date, total, pending, ready, delivered, vaults });
    await sendEmail({ to, subject, html });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to send email. Try again.' }, { status: 500 });
  }
}
