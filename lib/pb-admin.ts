const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-production-e699.up.railway.app';
const TTL = 25 * 60 * 1000; // 25 min — PB admin tokens last 30 days

let _token = '';
let _tokenAt = 0;
let _inflight: Promise<string> | null = null;

export async function getPbAdminToken(): Promise<string> {
  if (_token && Date.now() - _tokenAt < TTL) return _token;
  if (_inflight) return _inflight;
  _inflight = (async () => {
    const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: process.env.PB_ADMIN_EMAIL, password: process.env.PB_ADMIN_PASSWORD }),
    });
    const data = await res.json();
    if (!data.token) throw new Error('PocketBase admin auth failed');
    _token = data.token as string;
    _tokenAt = Date.now();
    return _token;
  })().finally(() => { _inflight = null; });
  return _inflight;
}

export type SessionUser = {
  id: string;
  company_id: string;
  role: string;
};

/**
 * Verifies the caller's PocketBase session from an API route's Bearer token.
 * Returns null for a missing, expired or invalid token — the caller decides
 * the status code, and checks `role` itself when the route needs one.
 *
 * Seven routes each carried their own copy of this. A security fix applied to
 * one of them would have silently left the other six behind.
 */
export async function verifySessionUser(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const res = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const { record } = await res.json();
    if (!record?.id) return null;
    return record as SessionUser;
  } catch {
    return null;
  }
}

export { PB_URL };
