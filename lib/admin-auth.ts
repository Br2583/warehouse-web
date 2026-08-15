import { createHash, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

function buildInput(dayBucket: string | number): string {
  const s = process.env.ADMIN_SECRET || '';
  const salt = process.env.ADMIN_SESSION_SALT || '';
  return s + dayBucket + salt;
}

export function hashAdminSecret(): string {
  if (!process.env.ADMIN_SECRET) throw new Error('ADMIN_SECRET env var is required');
  const dayBucket = Math.floor(Date.now() / 86_400_000).toString();
  return createHash('sha256').update(buildInput(dayBucket)).digest('hex');
}

export function isAdminRequest(req: NextRequest): boolean {
  const cookie = req.cookies.get('admin_session')?.value;
  if (!cookie) return false;
  try {
    if (!process.env.ADMIN_SECRET) return false;
    const now = Math.floor(Date.now() / 86_400_000);
    for (const bucket of [now, now - 1]) {
      const hash = createHash('sha256').update(buildInput(bucket)).digest('hex');
      if (cookie.length === hash.length && timingSafeEqual(Buffer.from(cookie, 'hex'), Buffer.from(hash, 'hex'))) return true;
    }
    return false;
  } catch {
    return false;
  }
}
