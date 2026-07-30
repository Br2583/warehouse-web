import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/tokens';
import { sendEmail, passwordResetEmail } from '@/lib/email';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

const _resetRateLimit = new Map<string, { count: number; resetAt: number }>();
function checkResetLimit(email: string): boolean {
  const key = email.toLowerCase();
  const now = Date.now();
  const entry = _resetRateLimit.get(key);
  if (!entry || now > entry.resetAt) {
    _resetRateLimit.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
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
    if (!checkResetLimit(email)) return NextResponse.json({ ok: true }); // silent — don't leak rate limit info

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
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to send email' }, { status: 500 });
  }
}
