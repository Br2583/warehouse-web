import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

async function getAuthenticatedUser(req: NextRequest): Promise<{ id: string; company_id: string } | null> {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  try {
    const res = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const { record } = await res.json();
    return record ?? null;
  } catch {
    return null;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getAuthenticatedUser(req);
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminToken = await getPbAdminToken();

  // Verify snapshot belongs to this user's company before deleting
  const snapRes = await fetch(`${PB_URL}/api/collections/snapshots/records/${id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!snapRes.ok) return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });

  const snap = await snapRes.json();
  if (snap.company_id !== me.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const delRes = await fetch(`${PB_URL}/api/collections/snapshots/records/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!delRes.ok && delRes.status !== 204) {
    return NextResponse.json({ error: 'Failed to delete snapshot' }, { status: 502 });
  }

  return new NextResponse(null, { status: 204 });
}
