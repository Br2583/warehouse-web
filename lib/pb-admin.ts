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

export { PB_URL };
