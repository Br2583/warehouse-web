import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

// Deletes chat photos older than 30 days. A photo-only message (no text) is
// removed entirely; a message that also has text keeps the text and loses the
// photo (its type falls back to "text"). Triggered by cron-job.org with the
// CRON_SECRET bearer, same as the chat-digest job.
const RETENTION_DAYS = 30;

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('Authorization') || '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const filter = encodeURIComponent(`type="image" && sent_at<"${cutoff}"`);

  let deleted = 0, cleared = 0, failed = 0;
  // Each pass re-queries page 1 because the previous pass shrinks the result set.
  for (let pass = 0; pass < 100; pass++) {
    const listRes = await fetch(
      `${PB_URL}/api/collections/chat_messages/records?perPage=100&page=1&sort=sent_at&filter=${filter}&fields=id,content`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    if (!listRes.ok) return NextResponse.json({ error: 'Failed to list messages' }, { status: 500 });
    const data = await listRes.json();
    const items: any[] = data.items || [];
    if (items.length === 0) break;

    for (const m of items) {
      const hasText = typeof m.content === 'string' && m.content.trim().length > 0;
      if (hasText) {
        // Keep the text, drop the photos: multipart with an empty photos field clears it.
        const form = new FormData();
        form.append('photos', '');
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
    // Safety: if nothing changed this pass (all failed), stop to avoid a loop.
    if (deleted + cleared === 0 && failed === items.length) break;
  }

  return NextResponse.json({ ok: true, deleted, cleared, failed, cutoff });
}
