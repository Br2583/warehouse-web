import { NextRequest, NextResponse } from 'next/server';

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-production-e699.up.railway.app';

async function getAdminToken(): Promise<string> {
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: process.env.PB_ADMIN_EMAIL, password: process.env.PB_ADMIN_PASSWORD }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('Admin auth failed');
  return data.token as string;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, avatar_base64 } = await req.json();
    if (!userId || !avatar_base64) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const token = await getAdminToken();
    const res = await fetch(`${PB_URL}/api/collections/users/records/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ avatar_base64 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to update photo');

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update photo' }, { status: 500 });
  }
}
