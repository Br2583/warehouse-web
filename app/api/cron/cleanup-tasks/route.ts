import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken } from '@/lib/pb-admin';
import { cleanupDoneTasks } from '@/lib/cron-cleanups';

// Deletes tasks marked DONE more than 30 days ago (see lib/cron-cleanups). The
// worker ranking (users.tasks_completed / task_minutes) is persisted separately,
// so no ranking data is lost. Callable with the CRON_SECRET bearer, and also run
// automatically inside the chat-digest job.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('Authorization') || '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  const result = await cleanupDoneTasks(adminToken);
  return NextResponse.json({ ok: true, ...result });
}
