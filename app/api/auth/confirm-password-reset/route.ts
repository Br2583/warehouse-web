import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/tokens';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

// Map of token → expiry timestamp (ms). Entries are cleaned up after expiry.
// Note: this is in-memory; tokens could be reused across process restarts within
// their 1-hour expiry window. The JWT expiry is the primary protection.
const usedTokens = new Map<string, number>();

function markTokenUsed(token: string, expSec: number) {
  usedTokens.set(token, expSec * 1000);
  // Purge expired entries to avoid memory growth
  const now = Date.now();
  for (const [t, exp] of usedTokens) {
    if (now > exp) usedTokens.delete(t);
  }
}

function isTokenUsed(token: string): boolean {
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

    if (isTokenUsed(token)) throw new Error('This reset link has already been used. Request a new one.');
    const payload = verifyToken(token);
    if (payload.purpose !== 'reset') throw new Error('Wrong token type');

    const adminToken = await getPbAdminToken();
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
