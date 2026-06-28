import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/tokens';
import { sendEmail, verificationEmail } from '@/lib/email';

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-production-e699.up.railway.app';

async function getPbAdminToken() {
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: process.env.PB_ADMIN_EMAIL,
      password: process.env.PB_ADMIN_PASSWORD,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PB admin auth failed: ${data?.message ?? res.status}`);
  return data.token as string;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    // Find user by email
    const adminToken = await getPbAdminToken();
    const search = await fetch(
      `${PB_URL}/api/collections/users/records?filter=${encodeURIComponent(`email="${email}"`)}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const { items } = await search.json();
    if (!items?.length) {
      // Don't leak whether email exists — silently succeed
      return NextResponse.json({ ok: true });
    }
    const user = items[0];

    const token = signToken({ userId: user.id, email: user.email, purpose: 'verify' }, 86400);
    const { subject, html } = verificationEmail(user.name || email, token);
    await sendEmail({ to: email, toName: user.name, subject, html });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to send email' }, { status: 500 });
  }
}
