import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/tokens';

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
    const { token, password, passwordConfirm } = await req.json();
    if (!token || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    if (password !== passwordConfirm) return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: 'Password too short' }, { status: 400 });

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

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Reset failed' }, { status: 400 });
  }
}
