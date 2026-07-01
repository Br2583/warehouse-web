import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';

export function hashAdminSecret(): string {
  const s = process.env.ADMIN_SECRET;
  if (!s) throw new Error('ADMIN_SECRET env var is required');
  return createHash('sha256').update(s).digest('hex');
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
