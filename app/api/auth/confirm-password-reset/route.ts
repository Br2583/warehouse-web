import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/tokens';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

// In-memory dedup (fast path across requests in same process).
const usedTokens = new Map<string, number>();

function markTokenUsed(token: string, expSec: number) {
  usedTokens.set(token, expSec * 1000);
  const now = Date.now();
  for (const [t, exp] of usedTokens) {
    if (now > exp) usedTokens.delete(t);
  }
}

function isTokenUsedMemory(token: string): boolean {
  const exp = usedTokens.get(token);
  if (exp === undefined) return false;
  if (Date.now() > exp) { usedTokens.delete(token); return false; }
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { token, password, passwordConfirm } = await req.json();
    if (!token || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    if (password !== passwordConfirm) return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: 'Password too short' }, { status: 400 });

    if (isTokenUsedMemory(token)) throw new Error('This reset link has already been used. Request a new one.');
    const payload = verifyToken(token);
    if (payload.purpose !== 'reset') throw new Error('Wrong token type');

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

    markTokenUsed(token, payload.exp as number);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Reset failed' }, { status: 400 });
  }
}
