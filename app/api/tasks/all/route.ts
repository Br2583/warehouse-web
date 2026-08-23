import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

async function verifyUser(token: string) {
  const res = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const { record } = await res.json();
  return record as { id: string; company_id: string; role: string } | null;
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await verifyUser(token);
  if (!me?.company_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me.role !== 'owner' && me.role !== 'manager') {
    return NextResponse.json({ error: 'Only managers and owners can delete all tasks' }, { status: 403 });
  }

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  // Fetch all task IDs for this company
  const listRes = await fetch(
    `${PB_URL}/api/collections/tasks/records?filter=${encodeURIComponent(`company_id="${me.company_id}"`)}&fields=id&perPage=500`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  if (!listRes.ok) return NextResponse.json({ error: 'Failed to list tasks' }, { status: 502 });
  const { items } = await listRes.json();

  if (!items?.length) return NextResponse.json({ deleted: 0 });

  // Delete in batches of 20 to avoid overwhelming PocketBase
  const BATCH = 20;
  let deleted = 0;
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    await Promise.allSettled(
      batch.map((t: { id: string }) =>
        fetch(`${PB_URL}/api/collections/tasks/records/${t.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        }).then(r => { if (r.ok || r.status === 404) deleted++; })
      )
    );
  }

  return NextResponse.json({ deleted });
}
