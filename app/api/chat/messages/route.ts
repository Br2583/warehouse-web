import { NextRequest, NextResponse } from 'next/server';

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-production-e699.up.railway.app';
const TIMEOUT_MS = 10_000;

async function pbFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(tid);
  }
}

async function getAdminToken(): Promise<string> {
  const res = await pbFetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: process.env.PB_ADMIN_EMAIL, password: process.env.PB_ADMIN_PASSWORD }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('Admin auth failed');
  return data.token as string;
}

async function getUserCompanyId(userToken: string): Promise<string> {
  const res = await pbFetch(`${PB_URL}/api/collections/users/auth-refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  if (!res.ok) throw new Error('Unauthorized');
  const data = await res.json();
  const companyId = data.record?.company_id;
  if (!companyId) throw new Error('No company associated with this account');
  return companyId;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const userToken = authHeader.replace('Bearer ', '').trim();
    if (!userToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = await getUserCompanyId(userToken);
    const adminToken = await getAdminToken();

    // chat_messages has no 'created' field — sort by id (PocketBase IDs are time-ordered)
    const res = await pbFetch(
      `${PB_URL}/api/collections/chat_messages/records?perPage=150&sort=id&filter=${encodeURIComponent(`company_id="${companyId}"`)}&fields=id,author_name,author_id,content`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to load messages');

    const msgs = (data.items as any[]).map((m: any) => ({
      id:           m.id,
      sender_name:  m.author_name,
      sender_email: m.author_id,
      text:         m.content,
      timestamp:    '',
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

    const adminToken = await getAdminToken();
    const res = await pbFetch(`${PB_URL}/api/collections/chat_messages/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        company_id:  companyId,
        author_id:   record.id,
        author_name: record.name || record.email || 'Unknown',
        content:     body.text.trim(),
        type:        'text',
      }),
    });
    const msg = await res.json();
    if (!res.ok) throw new Error(msg?.message || 'Failed to send message');

    return NextResponse.json({
      id:           msg.id,
      sender_name:  msg.author_name,
      sender_email: msg.author_id,
      text:         msg.content,
      timestamp:    (msg.created || '').replace(' ', 'T'),
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

    await getUserCompanyId(userToken);

    const adminToken = await getAdminToken();
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
