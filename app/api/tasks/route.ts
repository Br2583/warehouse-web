import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';
import { sendEmail, taskAssignedEmail } from '@/lib/email';

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
  if (!res.ok) return NextResponse.json({ error: 'Failed to load tasks' }, { status: 502 });
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

  // Cross-check: verify the authenticated user is actually the company owner
  const compRes = await fetch(`${PB_URL}/api/collections/companies/records/${me.company_id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (compRes.ok) {
    const comp = await compRes.json();
    if (comp.owner_id && comp.owner_id !== me.id) {
      return NextResponse.json({ error: 'Only the company owner can create tasks' }, { status: 403 });
    }
  }

  const body = await req.json();

  if (!body.title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });
  const VALID_TYPES     = ['Free', 'Cleaning', 'Restoration', 'Delivery'];
  const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];
  if (body.type     && !VALID_TYPES.includes(body.type))       return NextResponse.json({ error: 'Invalid task type' },     { status: 400 });
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) return NextResponse.json({ error: 'Invalid priority' },   { status: 400 });

  // Verify assigned_to user belongs to same company
  if (body.assigned_to) {
    const assigneeRes = await fetch(`${PB_URL}/api/collections/users/records/${body.assigned_to}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!assigneeRes.ok) return NextResponse.json({ error: 'Assigned user not found' }, { status: 400 });
    const assignee = await assigneeRes.json();
    if (assignee.company_id !== me.company_id) return NextResponse.json({ error: 'Cannot assign task to user outside your company' }, { status: 403 });
  }

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
  const created = await res.json();

  if (body.assigned_to) {
    try {
      const [workerRes, ownerRes] = await Promise.all([
        fetch(`${PB_URL}/api/collections/users/records/${body.assigned_to}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        fetch(`${PB_URL}/api/collections/users/records/${me.id}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      ]);
      if (workerRes.ok && ownerRes.ok) {
        const worker = await workerRes.json();
        const owner = await ownerRes.json();
        if (worker.email) {
          const { subject, html } = taskAssignedEmail(
            worker.name || worker.email,
            body.title,
            body.type || 'Free',
            body.priority || 'normal',
            body.due_date || '',
            owner.name || owner.email,
          );
          await sendEmail({ to: worker.email, toName: worker.name, subject, html });
        }
      }
    } catch { /* email failure should never break task creation */ }
  }

  return NextResponse.json(created);
}
