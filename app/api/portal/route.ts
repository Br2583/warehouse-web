import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 1000; // 30 seconds

// In-memory rate limiter per IP (resets on server restart)
const store = new Map<string, { count: number; resetAt: number }>();

function getPortalCode(): string {
  try {
    const filePath = join(process.cwd(), 'data', 'portal-code.json');
    const { code } = JSON.parse(readFileSync(filePath, 'utf-8'));
    if (code && typeof code === 'string') return code;
  } catch {
    // fall through to env var
  }
  return process.env.PORTAL_CODE ?? '';
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  const now = Date.now();
  let record = store.get(ip);

  // Reset expired window
  if (record && now >= record.resetAt) {
    store.delete(ip);
    record = undefined;
  }

  // Block if locked out
  if (record && record.count >= MAX_ATTEMPTS) {
    const wait = Math.ceil((record.resetAt - now) / 1000);
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${wait}s.` },
      { status: 429 }
    );
  }

  const { code } = await req.json().catch(() => ({ code: '' }));
  const correctCode = getPortalCode();

  if (!correctCode) {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  }

  if (code !== correctCode) {
    // Register failed attempt
    if (!record) {
      record = { count: 1, resetAt: now + LOCKOUT_MS };
    } else {
      record.count += 1;
    }
    store.set(ip, record);

    const remaining = MAX_ATTEMPTS - record.count;
    const msg =
      remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} left.`
        : `Too many attempts. Try again in ${LOCKOUT_MS / 1000}s.`;

    return NextResponse.json({ error: msg }, { status: 401 });
  }

  // Correct — clear attempts and set secure cookie
  store.delete(ip);

  const res = NextResponse.json({ success: true });
  res.cookies.set('portal_unlocked', 'true', {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 2 * 60 * 60, // 2 hours, refreshed on every request by middleware
    path: '/',
  });

  return res;
}
