import { NextRequest, NextResponse } from 'next/server';

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-production-e699.up.railway.app';

async function getAdminToken(): Promise<string> {
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: process.env.PB_ADMIN_EMAIL, password: process.env.PB_ADMIN_PASSWORD }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('Admin auth failed');
  return data.token as string;
}

// Validate the user's PocketBase token and return their company_id
async function getUserCompanyId(userToken: string): Promise<string> {
  const res = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
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

    const res = await fetch(
      `${PB_URL}/api/collections/chat_messages/records?perPage=150&sort=-created&filter=${encodeURIComponent(`company_id="${companyId}"`)}&fields=id,author_name,author_id,content,created`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to load messages');

    const msgs = (data.items as any[]).reverse().map((m: any) => ({
      id:           m.id,
      sender_name:  m.author_name,
      sender_email: m.author_id,
      text:         m.content,
      timestamp:    (m.created || '').replace(' ', 'T'),
    }));

    return NextResponse.json(msgs);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load messages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const userToken = authHeader.replace('Bearer ', '').trim();
    if (!userToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.text?.trim()) return NextResponse.json({ error: 'Message text is required' }, { status: 400 });

    // Get user data from their own token — authoritative source
    const refreshRes = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (!refreshRes.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const refreshData = await refreshRes.json();
    const record = refreshData.record;
    const companyId = record?.company_id;
    if (!companyId) return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });

    const adminToken = await getAdminToken();
    const res = await fetch(`${PB_URL}/api/collections/chat_messages/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        company_id:  companyId,
        author_id:   record.email || record.id,
        author_name: record.name || 'Unknown',
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
    return NextResponse.json({ error: e?.message || 'Failed to send message' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const userToken = authHeader.replace('Bearer ', '').trim();
    if (!userToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // Verify the message belongs to this user's company before deleting
    await getUserCompanyId(userToken);

    const adminToken = await getAdminToken();
    const res = await fetch(`${PB_URL}/api/collections/chat_messages/records/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok && res.status !== 204) throw new Error('Failed to delete');
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete' }, { status: 500 });
  }
}
