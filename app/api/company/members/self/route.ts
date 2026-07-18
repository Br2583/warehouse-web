import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') || '';
  const userToken  = authHeader.replace('Bearer ', '').trim();
  if (!userToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  const meRes = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  if (!meRes.ok) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  const { record: me } = await meRes.json();
  if (!me?.id) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  if (!me.company_id) return NextResponse.json({ error: 'You are not in a company' }, { status: 400 });

  if (me.role === 'owner') {
    return NextResponse.json(
      { error: 'Company owners cannot leave. Transfer ownership first.' },
      { status: 400 }
    );
  }

  const res = await fetch(`${PB_URL}/api/collections/users/records/${me.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id: '', role: 'worker' }),
  });
  if (!res.ok) return NextResponse.json({ error: 'Failed to leave company' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
