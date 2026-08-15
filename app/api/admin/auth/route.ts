import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { hashAdminSecret } from '@/lib/admin-auth';
import { adminLoginRateLimit, checkLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!await checkLimit(adminLoginRateLimit, ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 30 seconds.' }, { status: 429 });
  }

  const { password } = await req.json().catch(() => ({}));
  const secret = process.env.ADMIN_SECRET || '';
  const passHash = createHash('sha256').update(password || '').digest();
  const secretHash = createHash('sha256').update(secret).digest();
  if (!password || !timingSafeEqual(passHash, secretHash)) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_session', hashAdminSecret(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400 * 2,
    path: '/',
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('admin_session');
  return res;
}
