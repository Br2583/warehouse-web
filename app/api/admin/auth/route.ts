import { NextRequest, NextResponse } from 'next/server';
import { hashAdminSecret } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));
  if (!password || password !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_session', hashAdminSecret(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400 * 7,
    path: '/',
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('admin_session');
  return res;
}
