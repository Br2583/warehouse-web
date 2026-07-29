import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';
import { sendEmail, chatDigestEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('Authorization') || '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  // Fetch all users with an email (up to 500 — adjust perPage if company grows)
  const usersRes = await fetch(
    `${PB_URL}/api/collections/users/records?perPage=500&fields=id,email,name,company_id,chat_notified_at`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );
  if (!usersRes.ok) return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  const usersData = await usersRes.json();
  const users: any[] = usersData.items || [];

  const companyCache: Record<string, string> = {};
  let sent = 0;

  async function processUser(user: any): Promise<boolean> {
    if (!user.email || !user.company_id) return false;

    const since = user.chat_notified_at
      ? user.chat_notified_at
      : new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const filter = `company_id="${user.company_id}" && sent_at>"${since}" && author_id!="${user.id}"`;
    const msgRes = await fetch(
      `${PB_URL}/api/collections/chat_messages/records?perPage=3&sort=-sent_at&filter=${encodeURIComponent(filter)}&fields=author_name,content`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    if (!msgRes.ok) return false;
    const msgData = await msgRes.json();
    const totalCount: number = msgData.totalItems ?? 0;
    if (totalCount === 0) return false;

    // Company name resolved serially to avoid cache races in concurrent batch
    if (!companyCache[user.company_id]) {
      try {
        const compRes = await fetch(
          `${PB_URL}/api/collections/companies/records/${user.company_id}`,
          { headers: { Authorization: `Bearer ${adminToken}` } },
        );
        if (compRes.ok) {
          const comp = await compRes.json();
          companyCache[user.company_id] = comp.name || 'your company';
        }
      } catch {}
      if (!companyCache[user.company_id]) companyCache[user.company_id] = 'your company';
    }
    const companyName = companyCache[user.company_id];

    const previews: { sender: string; text: string }[] = (msgData.items || [])
      .reverse()
      .map((m: any) => ({ sender: m.author_name || 'Someone', text: m.content || '' }));

    try {
      const { subject, html } = chatDigestEmail(
        user.name || user.email,
        companyName,
        totalCount,
        previews,
      );
      await sendEmail({ to: user.email, toName: user.name, subject, html });

      await fetch(`${PB_URL}/api/collections/users/records/${user.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_notified_at: new Date().toISOString() }),
      });
      return true;
    } catch {
      return false;
    }
  }

  // Process in batches of 10 to avoid saturating PB with serial requests
  const BATCH = 10;
  for (let i = 0; i < users.length; i += BATCH) {
    const batch = users.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(processUser));
    sent += results.filter(r => r.status === 'fulfilled' && r.value).length;
  }

  return NextResponse.json({ ok: true, sent, total: users.length });
}
