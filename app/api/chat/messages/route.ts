import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

const TIMEOUT_MS = 28_000;

const _rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = _rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    _rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

async function pbFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(tid);
  }
}

async function getUserInfo(userToken: string): Promise<{ companyId: string; userId: string }> {
  const res = await pbFetch(`${PB_URL}/api/collections/users/auth-refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  if (!res.ok) throw new Error('Unauthorized');
  const data = await res.json();
  const companyId = data.record?.company_id;
  const userId = data.record?.id;
  if (!companyId) throw new Error('No company associated with this account');
  if (!userId) throw new Error('User not found');
  return { companyId, userId };
}

async function getUserCompanyId(userToken: string): Promise<string> {
  return (await getUserInfo(userToken)).companyId;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const userToken = authHeader.replace('Bearer ', '').trim();
    if (!userToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [companyId, adminToken] = await Promise.all([
      getUserCompanyId(userToken),
      getPbAdminToken(),
    ]);

    const url = req.nextUrl;
    const perPage = Math.min(parseInt(url.searchParams.get('perPage') || '500', 10), 500).toString();
    const sort    = url.searchParams.get('sort')    || 'sent_at';

    const res = await pbFetch(
      `${PB_URL}/api/collections/chat_messages/records?perPage=${encodeURIComponent(perPage)}&sort=${encodeURIComponent(sort)}&filter=${encodeURIComponent(`company_id="${companyId}"`)}&fields=id,author_name,author_id,content,sent_at`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to load messages');

    const msgs = (data.items as any[]).map((m: any) => ({
      id:          m.id,
      sender_name: m.author_name,
      sender_id:   m.author_id,
      text:        m.content,
      timestamp:   m.sent_at || '',
    }));

    return NextResponse.json(msgs);
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'Connection timed out' : (e?.message || 'Failed to load messages');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const userToken = authHeader.replace('Bearer ', '').trim();
    if (!userToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.text?.trim()) return NextResponse.json({ error: 'Message text is required' }, { status: 400 });

    const refreshRes = await pbFetch(`${PB_URL}/api/collections/users/auth-refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (!refreshRes.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const refreshData = await refreshRes.json();
    const record = refreshData.record;
    const companyId = record?.company_id;
    if (!companyId) return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });

    if (!checkRateLimit(record.id)) {
      return NextResponse.json({ error: 'Too many messages. Please wait a moment.' }, { status: 429 });
    }

    const adminToken = await getPbAdminToken();
    const res = await pbFetch(`${PB_URL}/api/collections/chat_messages/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        company_id:  companyId,
        author_id:   record.id,
        author_name: record.name || record.email || 'Unknown',
        content:     body.text.trim(),
        type:        'text',
        sent_at:     new Date().toISOString(),
      }),
    });
    const msg = await res.json();
    if (!res.ok) throw new Error(msg?.message || 'Failed to send message');

    return NextResponse.json({
      id:          msg.id,
      sender_name: msg.author_name,
      sender_id:   msg.author_id,
      text:        msg.content,
      timestamp:   msg.sent_at || '',
    });
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'Connection timed out' : (e?.message || 'Failed to send message');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const userToken = authHeader.replace('Bearer ', '').trim();
    if (!userToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const [{ companyId, userId }, adminToken] = await Promise.all([
      getUserInfo(userToken),
      getPbAdminToken(),
    ]);

    // Verify the message belongs to the user's company AND was authored by them
    const msgRes = await pbFetch(`${PB_URL}/api/collections/chat_messages/records/${id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!msgRes.ok) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    const msgData = await msgRes.json();
    if (msgData.company_id !== companyId || msgData.author_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const res = await pbFetch(`${PB_URL}/api/collections/chat_messages/records/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok && res.status !== 204) throw new Error('Failed to delete');
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'Connection timed out' : (e?.message || 'Failed to delete');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
