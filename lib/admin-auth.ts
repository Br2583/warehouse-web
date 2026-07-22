import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';

export function hashAdminSecret(): string {
  const s = process.env.ADMIN_SECRET;
  if (!s) throw new Error('ADMIN_SECRET env var is required');
  const dayBucket = Math.floor(Date.now() / 86_400_000).toString();
  return createHash('sha256').update(s + dayBucket).digest('hex');
}

export function isAdminRequest(req: NextRequest): boolean {
  const cookie = req.cookies.get('admin_session')?.value;
  if (!cookie) return false;
  try {
    return cookie === hashAdminSecret();
  } catch {
    return false;
  }
}
