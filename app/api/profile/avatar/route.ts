import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

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
    if (userId !== authenticatedUserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const token = await getPbAdminToken();
    const recordUrl = `${PB_URL}/api/collections/users/records/${userId}`;
    let res: Response;

    if (avatar_base64?.startsWith('data:image/')) {
      // Photo: convert base64 to binary, upload as PocketBase file field
      const b64 = avatar_base64.replace(/^data:image\/\w+;base64,/, '');
      const binary = Buffer.from(b64, 'base64');
      const formData = new FormData();
      formData.append('avatar', new Blob([binary], { type: 'image/jpeg' }), 'avatar.jpg');
      formData.append('avatar_base64', ''); // clear any icon preset
      res = await pbFetch(recordUrl, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    } else {
      // Icon preset or removal: store short string in avatar_base64 text field
      res = await pbFetch(recordUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar_base64: avatar_base64 || null }),
      });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to update');

    // Return PocketBase file URL if a photo was uploaded
    const avatarUrl = data.avatar
      ? `${PB_URL}/api/files/users/${userId}/${data.avatar}`
      : null;

    return NextResponse.json({ ok: true, avatarUrl });
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'Connection timed out' : (e?.message || 'Failed to update');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
