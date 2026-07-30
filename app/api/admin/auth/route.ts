import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { hashAdminSecret } from '@/lib/admin-auth';

const _loginAttempts = new Map<string, { count: number; resetAt: number }>();
function checkAdminRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = _loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    _loginAttempts.set(ip, { count: 1, resetAt: now + 30_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkAdminRateLimit(ip)) {
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
