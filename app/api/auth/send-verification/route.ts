import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/tokens';
import { sendEmail, verificationEmail } from '@/lib/email';
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

    // Find user by email
    const adminToken = await getPbAdminToken();
    const safeEmail = email.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const search = await fetch(
      `${PB_URL}/api/collections/users/records?filter=${encodeURIComponent(`email="${safeEmail}"`)}`,
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
    try {
      await sendEmail({ to: email, toName: user.name, subject, html });
    } catch {
      // Don't leak whether the address was deliverable
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to send email' }, { status: 500 });
  }
}
