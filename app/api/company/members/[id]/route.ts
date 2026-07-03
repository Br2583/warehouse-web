import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('Authorization') || '';
  const userToken  = authHeader.replace('Bearer ', '').trim();
  if (!userToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: targetUserId } = await params;

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  // Verify requester token and get their record
  const meRes = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  if (!meRes.ok) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  const { record: me } = await meRes.json();
  if (!me?.id || !me.company_id) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

  // Only owners can remove members
  if (me.role !== 'owner') return NextResponse.json({ error: 'Only the company owner can remove members' }, { status: 403 });

  // Cannot remove yourself
  if (me.id === targetUserId) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });

  // Fetch target user via admin token to verify they're in the same company
  const targetRes = await fetch(`${PB_URL}/api/collections/users/records/${targetUserId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!targetRes.ok) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  const target = await targetRes.json();

  if (target.company_id !== me.company_id) {
    return NextResponse.json({ error: 'Member not in your company' }, { status: 403 });
  }
  if (target.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove the company owner' }, { status: 400 });
  }

  // Clear the user's company association
  const updateRes = await fetch(`${PB_URL}/api/collections/users/records/${targetUserId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id: '', role: 'worker', pending_action: '', pending_company_name: '' }),
  });
  if (!updateRes.ok) return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
