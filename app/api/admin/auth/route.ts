import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { hashAdminSecret } from '@/lib/admin-auth';
import { adminLoginRateLimit, checkLimit } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  // fallbackMax=5, fallbackWindowMs=30_000 → same limits as Upstash but in-memory when Redis is down
  if (!await checkLimit(adminLoginRateLimit, ip, 5, 30_000)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 30 seconds.' }, { status: 429 });
  }

  const { password, turnstileToken } = await req.json().catch(() => ({}));
  if (!await verifyTurnstile(turnstileToken, ip)) {
    return NextResponse.json({ error: 'Human verification failed' }, { status: 403 });
  }
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
