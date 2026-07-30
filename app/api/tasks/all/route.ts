import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

async function verifyOwner(token: string) {
  const res = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const { record } = await res.json();
  if (record?.role !== 'owner') return null;
  return record as { id: string; company_id: string };
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await verifyOwner(token);
  if (!me) return NextResponse.json({ error: 'Only owners can delete all tasks' }, { status: 403 });

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  const filter = encodeURIComponent(`company_id="${me.company_id}"`);
  const listRes = await fetch(
    `${PB_URL}/api/collections/tasks/records?filter=${filter}&perPage=500&fields=id`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );
  if (!listRes.ok) return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });

  const { items } = await listRes.json();
  if (!items?.length) return NextResponse.json({ deleted: 0 });

  await Promise.allSettled(
    (items as { id: string }[]).map(t =>
      fetch(`${PB_URL}/api/collections/tasks/records/${t.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    ),
  );

  return NextResponse.json({ deleted: items.length });
}
