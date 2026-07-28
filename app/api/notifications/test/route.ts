import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';
import { sendPush, getTokensForUser } from '@/lib/push';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authHeader}` },
  });
  if (!res.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { record } = await res.json();

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  const tokens = await getTokensForUser(record.id, adminToken, PB_URL);

  if (tokens.length === 0) {
    return NextResponse.json({
      ok: false,
      message: 'No device tokens found for this user. Make sure the app is installed and notifications are enabled.',
      userId: record.id,
    });
  }

  await sendPush(tokens, {
    title: '✅ Notifications working!',
    body: 'Warehouse Manager push notifications are configured correctly.',
    route: '/dashboard',
  });

  return NextResponse.json({
    ok: true,
    message: `Push sent to ${tokens.length} device(s)`,
    tokens: tokens.length,
  });
}
