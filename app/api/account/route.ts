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

  if (me.role === 'owner' && me.company_id) {
    // Clear company_id from all other members so they aren't left in limbo
    const membersRes = await fetch(
      `${PB_URL}/api/collections/users/records?filter=(company_id="${me.company_id}")&perPage=200&fields=id`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    if (membersRes.ok) {
      const membersData = await membersRes.json();
      await Promise.allSettled(
        (membersData.items || [])
          .filter((u: any) => u.id !== me.id)
          .map((u: any) =>
            fetch(`${PB_URL}/api/collections/users/records/${u.id}`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ company_id: '' }),
            })
          )
      );
    }
    // Delete the company (PocketBase cascades related records)
    await fetch(`${PB_URL}/api/collections/companies/records/${me.company_id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }

  const res = await fetch(`${PB_URL}/api/collections/users/records/${me.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!res.ok && res.status !== 204) {
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
