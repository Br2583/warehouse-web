import { NextRequest, NextResponse } from 'next/server';

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes
const PB_URL = 'https://pocketbase-production-e699.up.railway.app';

// In-memory rate limiter per IP (resets on server restart)
const store = new Map<string, { count: number; resetAt: number }>();

// Cached admin token — refreshed on 401
let cachedAdminToken: string | null = null;

async function getPBAdminToken(): Promise<string | null> {
  if (cachedAdminToken) return cachedAdminToken;
  try {
    const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: process.env.PB_ADMIN_EMAIL,
        password: process.env.PB_ADMIN_PASSWORD,
      }),
    });
    if (!res.ok) return null;
    const { token } = await res.json();
    cachedAdminToken = token;
    return token;
  } catch { return null; }
}

async function isValidPortalCode(code: string): Promise<boolean> {
  // 1. Check global env code (always works — admin / first-time entry)
  const envCode = process.env.PORTAL_CODE ?? '';
  if (envCode && code === envCode) return true;

  // 2. Check any company's portal_code in PocketBase
  let adminToken = await getPBAdminToken();
  if (!adminToken) return false;

  const tryQuery = async (token: string) =>
    fetch(
      `${PB_URL}/api/collections/companies/records?filter=(portal_code="${code}")&perPage=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

  let res = await tryQuery(adminToken).catch(() => null);

  // Retry once if token expired
  if (res?.status === 401) {
    cachedAdminToken = null;
    adminToken = await getPBAdminToken();
    if (!adminToken) return false;
    res = await tryQuery(adminToken).catch(() => null);
  }

  if (!res?.ok) return false;
  const data = await res.json();
  return (data.items?.length ?? 0) > 0;
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

  const valid = await isValidPortalCode(code);

  if (!valid) {
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
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7200,
    path: '/',
  });

  return res;
}
