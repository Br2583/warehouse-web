import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';
import { sendEmail, taskStatusEmail } from '@/lib/email';

async function verifyUser(token: string) {
  const res = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const { record } = await res.json();
  return record as { id: string; company_id: string; role: string } | null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await verifyUser(token);
  if (!me?.company_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  const taskRes = await fetch(`${PB_URL}/api/collections/tasks/records/${id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!taskRes.ok) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  const task = await taskRes.json();

  if (task.company_id !== me.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  let updateData: Record<string, any>;

  if (me.role !== 'owner') {
    if (task.assigned_to !== me.id) {
      return NextResponse.json({ error: 'Can only update your own tasks' }, { status: 403 });
    }
    updateData = { status: body.status };
  } else {
    updateData = {
      title:       body.title,
      type:        body.type,
      assigned_to: body.assigned_to,
      priority:    body.priority,
      status:      body.status,
      vault_id:    body.vault_id,
      storage_id:  body.storage_id,
      due_date:    body.due_date,
      notes:       body.notes,
    };
    Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);
  }

  const updateRes = await fetch(`${PB_URL}/api/collections/tasks/records/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });

  if (!updateRes.ok) return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  const updated = await updateRes.json();

  // Notify owner when a worker changes the status
  if (me.role !== 'owner' && body.status && body.status !== task.status && task.created_by) {
    try {
      const [ownerRes, workerRes] = await Promise.all([
        fetch(`${PB_URL}/api/collections/users/records/${task.created_by}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        fetch(`${PB_URL}/api/collections/users/records/${me.id}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      ]);
      if (ownerRes.ok && workerRes.ok) {
        const owner = await ownerRes.json();
        const worker = await workerRes.json();
        if (owner.email) {
          const { subject, html } = taskStatusEmail(
            owner.name || owner.email,
            worker.name || worker.email,
            task.title,
            task.status,
            body.status,
          );
          await sendEmail({ to: owner.email, toName: owner.name, subject, html });
        }
      }
    } catch { /* email failure should never break the task update */ }
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await verifyUser(token);
  if (!me?.company_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me.role !== 'owner') return NextResponse.json({ error: 'Only owners can delete tasks' }, { status: 403 });

  const { id } = await params;

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  const taskRes = await fetch(`${PB_URL}/api/collections/tasks/records/${id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!taskRes.ok) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  const task = await taskRes.json();

  if (task.company_id !== me.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const delRes = await fetch(`${PB_URL}/api/collections/tasks/records/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (!delRes.ok) return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
