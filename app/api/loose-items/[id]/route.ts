import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL, verifySessionUser } from '@/lib/pb-admin';

// NOTE: create/edit for loose items runs client-side in lib/api.ts (straight to
// PocketBase, so File photos survive). Only DELETE still goes through this route.

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = _req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await verifySessionUser(token);
  if (!me?.company_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me.role !== 'owner' && me.role !== 'manager') {
    return NextResponse.json({ error: 'Only managers and owners can delete items' }, { status: 403 });
  }

  const { id } = await params;

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  const itemRes = await fetch(`${PB_URL}/api/collections/loose_items/records/${id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!itemRes.ok) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  const existing = await itemRes.json();
  if (existing.company_id !== me.company_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const delRes = await fetch(`${PB_URL}/api/collections/loose_items/records/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!delRes.ok && delRes.status !== 404) return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
