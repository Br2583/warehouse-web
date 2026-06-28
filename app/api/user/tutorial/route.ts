import { NextRequest, NextResponse } from 'next/server';

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-production-e699.up.railway.app';

async function getAdminToken() {
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: process.env.PB_ADMIN_EMAIL, password: process.env.PB_ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error('Admin auth failed');
  return (await res.json()).token as string;
}

let fieldReady = false;
async function ensureField(adminToken: string) {
  if (fieldReady) return;
  const col = await (await fetch(`${PB_URL}/api/collections/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })).json();
  const fields: any[] = col.fields ?? col.schema ?? [];
  if (fields.some((f: any) => f.name === 'tutorial_seen')) { fieldReady = true; return; }
  await fetch(`${PB_URL}/api/collections/users`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ fields: [...fields, { name: 'tutorial_seen', type: 'text', required: false }] }),
  });
  fieldReady = true;
}

function getUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id ?? payload.sub ?? null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  if (!auth) return NextResponse.json({ tutorial_seen: '' });
  const token = auth.replace('Bearer ', '');
  const userId = getUserIdFromToken(token);
  if (!userId) return NextResponse.json({ tutorial_seen: '' });
  try {
    const adminToken = await getAdminToken();
    await ensureField(adminToken);
    const rec = await (await fetch(`${PB_URL}/api/collections/users/records/${userId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })).json();
    return NextResponse.json({ tutorial_seen: rec.tutorial_seen || '' });
  } catch {
    return NextResponse.json({ tutorial_seen: '' });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = auth.replace('Bearer ', '');
  const userId = getUserIdFromToken(token);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { tutorial_seen } = await req.json();
    const adminToken = await getAdminToken();
    await ensureField(adminToken);
    await fetch(`${PB_URL}/api/collections/users/records/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ tutorial_seen }),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
