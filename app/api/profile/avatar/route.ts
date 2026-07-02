import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-production-e699.up.railway.app';

export async function POST(req: NextRequest) {
  try {
    const { userId, avatar_base64 } = await req.json();
    if (!userId || !avatar_base64) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const pb = new PocketBase(PB_URL);
    await pb.collection('_superusers').authWithPassword(adminEmail, adminPassword);
    await pb.collection('users').update(userId, { avatar_base64 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update photo' }, { status: 500 });
  }
}
