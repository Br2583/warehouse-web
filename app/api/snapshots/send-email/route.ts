import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, snapshotReportEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
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
