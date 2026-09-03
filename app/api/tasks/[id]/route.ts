import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL, verifySessionUser } from '@/lib/pb-admin';
import { sendEmail, taskStatusEmail } from '@/lib/email';
import { sendPush, getTokensForUser, getTokensForCompany } from '@/lib/push';
import { syncVaultStatus, syncStorageStatus } from '@/lib/task-sync';

function fmtStatus(s: string): string {
  return s === 'IN_PROGRESS' ? 'In Progress' : s.charAt(0) + s.slice(1).toLowerCase();
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await verifySessionUser(token);
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

  // Accept JSON (simple status changes) or multipart/form-data (photo capture).
  // Photo fields carry a mix of kept filenames (strings) and new uploads (Files),
  // so a target's set can be added to, replaced, or cleared. A field absent from
  // the request is left untouched; sending it with a single '' clears it.
  const contentType = req.headers.get('content-type') || '';
  const isMultipart = contentType.includes('multipart/form-data');
  const body: Record<string, any> = {};
  const beforeParts: (string | File)[] = [];
  const afterParts:  (string | File)[] = [];
  if (isMultipart) {
    const fd = await req.formData();
    for (const [k, v] of fd.entries()) {
      if (k === 'before_photos') beforeParts.push(v as string | File);
      else if (k === 'after_photos') afterParts.push(v as string | File);
      else body[k] = typeof v === 'string' ? v : '';
    }
  } else {
    Object.assign(body, await req.json());
  }
  const touchesPhotos = beforeParts.length > 0 || afterParts.length > 0;

  let updateData: Record<string, any>;

  if (me.role === 'worker') {
    if (task.assigned_to !== me.id) {
      return NextResponse.json({ error: 'Can only update your own tasks' }, { status: 403 });
    }
    // A worker may move their task through the workflow, add a completion note,
    // and manage the before/after photos — nothing else.
    const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'DONE'];
    updateData = {};
    if (body.status !== undefined && body.status !== '') {
      if (!VALID_STATUSES.includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      updateData.status = body.status;
    }
    if (body.completion_note !== undefined) {
      if (body.completion_note.length > 2000) return NextResponse.json({ error: 'Note must be 2000 characters or fewer' }, { status: 400 });
      updateData.completion_note = body.completion_note;
    }
    if (updateData.status === undefined && updateData.completion_note === undefined && !touchesPhotos) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }
  } else {
    const VALID_STATUSES  = ['PENDING', 'IN_PROGRESS', 'DONE'];
    const VALID_TYPES     = ['Free', 'Cleaning', 'Restoration', 'Delivery'];
    const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];
    if (body.status   && !VALID_STATUSES.includes(body.status))      return NextResponse.json({ error: 'Invalid status' },   { status: 400 });
    if (body.type     && !VALID_TYPES.includes(body.type))           return NextResponse.json({ error: 'Invalid type' },     { status: 400 });
    if (body.priority && !VALID_PRIORITIES.includes(body.priority))  return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    if (body.title && body.title.trim().length > 200) return NextResponse.json({ error: 'Title must be 200 characters or fewer' }, { status: 400 });
    if (body.notes && body.notes.length > 2000) return NextResponse.json({ error: 'Notes must be 2000 characters or fewer' }, { status: 400 });
    if (body.completion_note && body.completion_note.length > 2000) return NextResponse.json({ error: 'Note must be 2000 characters or fewer' }, { status: 400 });
    // Verify assigned_to belongs to the same company
    if (body.assigned_to) {
      const assigneeRes = await fetch(`${PB_URL}/api/collections/users/records/${body.assigned_to}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!assigneeRes.ok) return NextResponse.json({ error: 'Assigned user not found' }, { status: 400 });
      const assignee = await assigneeRes.json();
      if (assignee.company_id !== me.company_id) {
        return NextResponse.json({ error: 'Cannot assign task to user outside your company' }, { status: 403 });
      }
    }
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
      completion_note: body.completion_note,
    };
    Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);
  }

  // ── Timing — always the server clock, never the device's ────────────────────
  const nowIso    = new Date().toISOString();
  const newStatus = updateData.status as string | undefined;
  const wasDone   = task.status === 'DONE';
  const goingDone = newStatus === 'DONE' && !wasDone;
  const reopening = !!newStatus && newStatus !== 'DONE' && wasDone;
  if (newStatus === 'IN_PROGRESS' && !task.started_at) updateData.started_at = nowIso;
  if (goingDone) {
    updateData.completed_at = nowIso;
    if (!task.started_at) updateData.started_at = task.created || nowIso;
  }
  if (reopening) updateData.completed_at = '';

  // ── Persist (multipart when photos are touched, JSON otherwise) ─────────────
  let updateRes: Response;
  if (touchesPhotos) {
    const pbForm = new FormData();
    for (const [k, v] of Object.entries(updateData)) pbForm.append(k, v == null ? '' : String(v));
    // Kept filenames (strings) + new uploads (Files) define the resulting set.
    for (const p of beforeParts) pbForm.append('before_photos', p as string | Blob);
    for (const p of afterParts)  pbForm.append('after_photos', p as string | Blob);
    updateRes = await fetch(`${PB_URL}/api/collections/tasks/records/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: pbForm,
    });
  } else {
    updateRes = await fetch(`${PB_URL}/api/collections/tasks/records/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
  }

  if (!updateRes.ok) return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  const updated = await updateRes.json();

  // ── Sync the linked vault/storage workflow status from all its tasks ────────
  if (newStatus && newStatus !== task.status) {
    if (task.vault_id)   await syncVaultStatus(task.vault_id, me.company_id, adminToken);
    if (task.storage_id) await syncStorageStatus(task.storage_id, me.company_id, adminToken);
  }

  // ── On completion: bump the worker's ranking tally + post a chat note ───────
  if (goingDone) {
    const actorId     = task.assigned_to || me.id;
    const startMs     = Date.parse(updated.started_at || task.started_at || task.created || nowIso);
    const durationMin = Math.max(0, Math.round((Date.parse(nowIso) - startMs) / 60000));
    try {
      const uRes = await fetch(`${PB_URL}/api/collections/users/records/${actorId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (uRes.ok) {
        const u = await uRes.json();
        const workerName = u.name || 'Someone';
        await fetch(`${PB_URL}/api/collections/users/records/${actorId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tasks_completed: (Number(u.tasks_completed) || 0) + 1,
            task_minutes:    (Number(u.task_minutes) || 0) + durationMin,
          }),
        });
        // System note in the team chat (author is the worker, type = system)
        let vaultLabel = '';
        if (task.vault_id) {
          try {
            const vRes = await fetch(`${PB_URL}/api/collections/vaults/records/${task.vault_id}?fields=client_name,position`, {
              headers: { Authorization: `Bearer ${adminToken}` },
            });
            if (vRes.ok) { const v = await vRes.json(); vaultLabel = v.client_name || v.position || ''; }
          } catch { /* label is optional */ }
        }
        const content = `${workerName} completed "${task.title}"${vaultLabel ? ` · ${vaultLabel}` : ''}`;
        await fetch(`${PB_URL}/api/collections/chat_messages/records`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id:  me.company_id,
            author_id:   actorId,
            author_name: workerName,
            content,
            type:        'system',
            sent_at:     nowIso,
          }),
        });
        // Notify the whole team a task was finished (everyone except whoever finished it)
        try {
          const teamTokens = await getTokensForCompany(me.company_id, actorId, adminToken, PB_URL);
          if (teamTokens.length > 0) {
            await sendPush(teamTokens, { title: 'Task completed', body: content, route: '/tasks', tag: 'task' }, PB_URL, adminToken);
          }
        } catch { /* team push is best-effort */ }
      }
    } catch { /* ranking + chat note must never break the task update */ }
  }

  // Worker changes status → notify task creator (email + push). DONE is handled
  // by the team-wide "Task completed" push above, so skip it here to avoid dupes.
  if (me.role === 'worker' && body.status && body.status !== task.status && body.status !== 'DONE' && task.created_by) {
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
          sendEmail({ to: owner.email, toName: owner.name, subject, html }).catch(() => {});
        }
        const ownerTokens = await getTokensForUser(owner.id, adminToken, PB_URL);
        if (ownerTokens.length > 0) {
          sendPush(ownerTokens, {
            title: 'Task Updated',
            body: `${worker.name || 'A worker'} marked "${task.title}" as ${fmtStatus(body.status)}`,
            route: '/tasks',
          }, PB_URL, adminToken).catch(() => {});
        }
      }
    } catch { /* notifications never break the task update */ }
  }

  // Owner/manager changes status → notify assigned worker via push. DONE is
  // covered by the team-wide "Task completed" push above.
  if ((me.role === 'owner' || me.role === 'manager') && body.status && body.status !== task.status && body.status !== 'DONE' && task.assigned_to && task.assigned_to !== me.id) {
    try {
      const workerTokens = await getTokensForUser(task.assigned_to, adminToken, PB_URL);
      if (workerTokens.length > 0) {
        sendPush(workerTokens, {
          title: 'Task Updated',
          body: `Your task "${task.title}" was marked as ${fmtStatus(body.status)}`,
          route: '/tasks',
        }, PB_URL, adminToken).catch(() => {});
      }
    } catch { /* push failure never breaks the update */ }
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await verifySessionUser(token);
  if (!me?.company_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me.role !== 'owner' && me.role !== 'manager') return NextResponse.json({ error: 'Only managers and owners can delete tasks' }, { status: 403 });

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
