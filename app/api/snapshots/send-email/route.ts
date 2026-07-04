import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, snapshotReportEmail } from '@/lib/email';

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-production-e699.up.railway.app';

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
  if (!me) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    const { subject, html } = snapshotReportEmail({ warehouseName, date, total, pending, ready, delivered, vaults });
    await sendEmail({ to, subject, html });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to send email' }, { status: 500 });
  }
}
