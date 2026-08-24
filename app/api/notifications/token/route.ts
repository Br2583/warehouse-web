import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

async function verifyUser(token: string) {
  const res = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const { record } = await res.json();
  return record as { id: string; company_id: string } | null;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await verifyUser(authHeader);
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token, platform } = await req.json();
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  const safeToken = token.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  // Upsert: check if this user+token combo already exists
  const existing = await fetch(
    `${PB_URL}/api/collections/device_tokens/records?filter=${encodeURIComponent(`user_id="${me.id}" && token="${safeToken}"`)}`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  const existingData = existing.ok ? await existing.json() : { items: [] };

  if (existingData.items?.length > 0) {
    // Token exists — update platform if needed
    return NextResponse.json({ ok: true });
  }

  // Save new token
  const res = await fetch(`${PB_URL}/api/collections/device_tokens/records`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id:    me.id,
      company_id: me.company_id,
      token,
      platform:   platform || 'android',
    }),
  });

  if (!res.ok) return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await verifyUser(authHeader);
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  const safeTokenDel = token.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const existing = await fetch(
    `${PB_URL}/api/collections/device_tokens/records?filter=${encodeURIComponent(`user_id="${me.id}" && token="${safeTokenDel}"`)}`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  const existingData = existing.ok ? await existing.json() : { items: [] };

  await Promise.allSettled(
    (existingData.items || []).map((record: any) =>
      fetch(`${PB_URL}/api/collections/device_tokens/records/${record.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
