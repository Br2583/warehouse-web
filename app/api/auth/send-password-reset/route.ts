import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/tokens';
import { sendEmail, passwordResetEmail } from '@/lib/email';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';
import { emailRateLimit, checkLimit } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, turnstileToken } = body as { email?: string; turnstileToken?: string };
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
    if (!await verifyTurnstile(turnstileToken, ip)) {
      return NextResponse.json({ error: 'Human verification failed' }, { status: 403 });
    }
    if (!await checkLimit(emailRateLimit, email.toLowerCase())) return NextResponse.json({ ok: true }); // silent

    const adminToken = await getPbAdminToken();
    const safeEmail = email.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const search = await fetch(
      `${PB_URL}/api/collections/users/records?filter=${encodeURIComponent(`email="${safeEmail}"`)}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const { items } = await search.json();
    if (!items?.length) {
      return NextResponse.json({ ok: true }); // silent — don't leak
    }
    const user = items[0];

    const token = signToken({ userId: user.id, email: user.email, purpose: 'reset' }, 3600);
    const { subject, html } = passwordResetEmail(user.name || email, token);
    try {
      await sendEmail({ to: email, toName: user.name, subject, html });
    } catch {
      // Don't leak whether the address was deliverable
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to send email. Try again.' }, { status: 500 });
  }
}
