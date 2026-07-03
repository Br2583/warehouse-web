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

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await verifyUser(token);
  if (!me?.company_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  const filter = me.role === 'owner'
    ? `company_id="${me.company_id}"`
    : `company_id="${me.company_id}" && assigned_to="${me.id}"`;

  const res = await fetch(
    `${PB_URL}/api/collections/tasks/records?filter=${encodeURIComponent(filter)}&sort=-created&perPage=200`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  if (!res.ok) return NextResponse.json([], { status: 200 });
  const data = await res.json();
  return NextResponse.json(data.items || []);
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await verifyUser(token);
  if (!me?.company_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me.role !== 'owner') return NextResponse.json({ error: 'Only owners can create tasks' }, { status: 403 });

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  const body = await req.json();

  const res = await fetch(`${PB_URL}/api/collections/tasks/records`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title:       body.title,
      type:        body.type || 'Free',
      assigned_to: body.assigned_to || '',
      priority:    body.priority || 'normal',
      status:      'PENDING',
      vault_id:    body.vault_id || '',
      storage_id:  body.storage_id || '',
      due_date:    body.due_date || '',
      notes:       body.notes || '',
      company_id:  me.company_id,
      created_by:  me.id,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: (err as any)?.message || 'Failed to create task' }, { status: 500 });
  }
  return NextResponse.json(await res.json());
}
