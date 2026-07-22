import { NextRequest, NextResponse } from 'next/server';
import { PB_URL } from '@/lib/pb-admin';

const TIMEOUT_MS = 28_000;

async function pbFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(tid);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const userToken = authHeader.replace('Bearer ', '').trim();
    if (!userToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const refreshRes = await pbFetch(`${PB_URL}/api/collections/users/auth-refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (!refreshRes.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const refreshData = await refreshRes.json();
    const authenticatedUserId = refreshData.record?.id;

    const { userId, avatar_base64 } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    if (avatar_base64 && avatar_base64.length > 110_000) {
      return NextResponse.json({ error: 'Image too large. Please compress before uploading.' }, { status: 413 });
    }
    if (userId !== authenticatedUserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const recordUrl = `${PB_URL}/api/collections/users/records/${userId}`;

    // Always save to avatar_base64 (TEXT/SQLite — persists on Railway)
    // Use the user's own token — PB updateRule allows users to update their own record
    const res = await pbFetch(recordUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ avatar_base64: avatar_base64 || null }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to update');

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'Connection timed out' : (e?.message || 'Failed to update');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
