import { NextRequest, NextResponse } from 'next/server';

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-production-e699.up.railway.app';
const TIMEOUT_MS = 28_000;

let _adminToken = '';
let _adminTokenAt = 0;
const ADMIN_TOKEN_TTL = 20 * 60 * 1000;

async function pbFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(tid);
  }
}

async function getAdminToken(): Promise<string> {
  if (_adminToken && Date.now() - _adminTokenAt < ADMIN_TOKEN_TTL) return _adminToken;
  const res = await pbFetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: process.env.PB_ADMIN_EMAIL, password: process.env.PB_ADMIN_PASSWORD }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('Admin auth failed');
  _adminToken = data.token as string;
  _adminTokenAt = Date.now();
  return _adminToken;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, avatar_base64 } = await req.json();
    if (!userId || !avatar_base64) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const token = await getAdminToken();
    const res = await pbFetch(`${PB_URL}/api/collections/users/records/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ avatar_base64 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to update photo');

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = (e as any)?.name === 'AbortError' ? 'Connection timed out' : ((e as any)?.message || 'Failed to update photo');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
