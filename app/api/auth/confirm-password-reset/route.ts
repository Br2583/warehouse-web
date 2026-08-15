import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/tokens';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';
import { dedupToken } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const { token, password, passwordConfirm } = await req.json();
    if (!token || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    if (password !== passwordConfirm) return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: 'Password too short' }, { status: 400 });

    const payload = verifyToken(token);
    if (payload.purpose !== 'reset') throw new Error('Wrong token type');

    // Cross-process dedup via Redis SET NX (prevents replay on multi-instance Railway)
    const ttlRemaining = Math.max((payload.exp as number) - Math.floor(Date.now() / 1000), 1);
    const dedup = await dedupToken(token, ttlRemaining);
    if (dedup === 'used') throw new Error('This reset link has already been used. Request a new one.');
    // dedup === 'unknown' → Redis unavailable; PB updated-timestamp check below still protects

    const adminToken = await getPbAdminToken();

    // Durable replay check: if user's record was updated AFTER this token was issued,
    // the password was already changed and this link is stale.
    const userRes = await fetch(`${PB_URL}/api/collections/users/records/${payload.userId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!userRes.ok) throw new Error('User not found. Please request a new reset link.');
    const userRecord = await userRes.json();
    const tokenIssuedMs = (payload.iat as number) * 1000;
    const userUpdatedMs = new Date(userRecord.updated).getTime();
    if (userUpdatedMs > tokenIssuedMs + 5000) {
      throw new Error('This reset link has already been used. Request a new one.');
    }

    const pbRes = await fetch(`${PB_URL}/api/collections/users/records/${payload.userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ password, passwordConfirm }),
    });
    if (!pbRes.ok) throw new Error('Failed to update password. Try again.');

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Reset failed' }, { status: 400 });
  }
}
