import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/tokens';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

    const payload = verifyToken(token);
    if (payload.purpose !== 'verify') throw new Error('Wrong token type');

    const adminToken = await getPbAdminToken();
    const pbRes = await fetch(`${PB_URL}/api/collections/users/records/${payload.userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ verified: true }),
    });
    if (pbRes.status === 404) throw new Error('This verification link has expired or the account no longer exists. Please sign up again or click Resend on the verification page.');
    if (!pbRes.ok) throw new Error('Failed to verify account. Try again.');

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Verification failed' }, { status: 400 });
  }
}
