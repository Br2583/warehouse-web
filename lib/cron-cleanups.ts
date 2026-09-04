import { PB_URL } from '@/lib/pb-admin';

/**
 * 30-day retention cleanups, shared by the dedicated cron endpoints and the
 * chat-digest job (which already runs every 2h on cron-job.org) so no extra
 * cron registration is needed. Each is idempotent: it only ever removes items
 * already older than the window, so running it every couple of hours is cheap.
 */
const RETENTION_DAYS = 30;
const cutoffIso = () => new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

/**
 * Chat photos older than 30 days. A photo-only message is removed entirely; a
 * message that also has text keeps the text and loses the photo (type → text).
 * Deleting a record drops its R2 files automatically.
 */
export async function cleanupChatPhotos(adminToken: string) {
  const cutoff = cutoffIso();
  const filter = encodeURIComponent(`type="image" && sent_at<"${cutoff}"`);
  let deleted = 0, cleared = 0, failed = 0;
  for (let pass = 0; pass < 100; pass++) {
    const listRes = await fetch(
      `${PB_URL}/api/collections/chat_messages/records?perPage=100&page=1&sort=sent_at&filter=${filter}&fields=id,content`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    if (!listRes.ok) break;
    const items: any[] = (await listRes.json()).items || [];
    if (items.length === 0) break;
    for (const m of items) {
      const hasText = typeof m.content === 'string' && m.content.trim().length > 0;
      if (hasText) {
        const form = new FormData();
        form.append('photos', '');   // empty file field clears all photos
        form.append('type', 'text');
        const r = await fetch(`${PB_URL}/api/collections/chat_messages/records/${m.id}`, {
          method: 'PATCH', headers: { Authorization: `Bearer ${adminToken}` }, body: form,
        });
        r.ok ? cleared++ : failed++;
      } else {
        const r = await fetch(`${PB_URL}/api/collections/chat_messages/records/${m.id}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` },
        });
        (r.ok || r.status === 204) ? deleted++ : failed++;
      }
    }
    if (deleted + cleared === 0 && failed === items.length) break; // avoid a hot loop on persistent failure
  }
  return { deleted, cleared, failed, cutoff };
}

/**
 * Tasks marked DONE more than 30 days ago. The worker ranking tally lives on the
 * user record (tasks_completed / task_minutes), so removing old tasks never
 * loses ranking data. Deleting a task drops its before/after R2 photos too.
 */
export async function cleanupDoneTasks(adminToken: string) {
  const cutoff = cutoffIso();
  const filter = encodeURIComponent(`status="DONE" && completed_at!="" && completed_at<"${cutoff}"`);
  let deleted = 0, failed = 0;
  for (let pass = 0; pass < 100; pass++) {
    const listRes = await fetch(
      `${PB_URL}/api/collections/tasks/records?perPage=100&page=1&sort=completed_at&filter=${filter}&fields=id`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    if (!listRes.ok) break;
    const items: any[] = (await listRes.json()).items || [];
    if (items.length === 0) break;
    for (const t of items) {
      const r = await fetch(`${PB_URL}/api/collections/tasks/records/${t.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` },
      });
      (r.ok || r.status === 204) ? deleted++ : failed++;
    }
    if (deleted === 0 && failed === items.length) break;
  }
  return { deleted, failed, cutoff };
}
