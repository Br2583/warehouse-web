import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, snapshotReportEmail } from '@/lib/email';

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-production-e699.up.railway.app';

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return false;
  try {
    const res = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { to, warehouseName, date, total, pending, ready, delivered, vaults } = body;

    if (!to || !warehouseName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { subject, html } = snapshotReportEmail({ warehouseName, date, total, pending, ready, delivered, vaults });
    await sendEmail({ to, subject, html });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to send email' }, { status: 500 });
  }
}
