import { NextRequest, NextResponse } from 'next/server';

const PB_URL = 'https://pocketbase-production-e699.up.railway.app';
const TWO_HOURS = 7200;

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'No token' }, { status: 400 });
    }

    // Verify token is valid with PocketBase
    const pbRes = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
      method: 'POST',
      headers: { Authorization: token },
    });

    if (!pbRes.ok) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set('portal_unlocked', 'true', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: TWO_HOURS,
      path: '/',
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
