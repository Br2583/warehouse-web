import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/tokens';
import { sendEmail, verificationEmail } from '@/lib/email';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

const _verifyRateLimit = new Map<string, { count: number; resetAt: number }>();
function checkVerifyLimit(email: string): boolean {
  const key = email.toLowerCase();
  const now = Date.now();
  const entry = _verifyRateLimit.get(key);
  if (!entry || now > entry.resetAt) {
    _verifyRateLimit.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
    if (!checkVerifyLimit(email)) return NextResponse.json({ ok: true }); // silent

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
