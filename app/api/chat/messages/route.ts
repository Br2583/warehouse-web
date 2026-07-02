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

export async function GET(req: NextRequest) {
  try {
    const companyId = req.nextUrl.searchParams.get('company_id');
    if (!companyId) return NextResponse.json([]);

    const token = await getAdminToken();
    const res = await fetch(
      `${PB_URL}/api/collections/chat_messages/records?perPage=150&sort=-created&filter=${encodeURIComponent(`company_id="${companyId}"`)}&fields=id,author_name,author_id,content,created`,
      { headers: { Authorization: `Bearer ${token}` } },
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
    const body = await req.json();
    const { company_id, author_id, author_name, text } = body;
    if (!company_id || !text) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const token = await getAdminToken();
    const res = await fetch(`${PB_URL}/api/collections/chat_messages/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ company_id, author_id: author_id || '', author_name: author_name || 'Unknown', content: text, type: 'text' }),
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
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const token = await getAdminToken();
    const res = await fetch(`${PB_URL}/api/collections/chat_messages/records/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 204) throw new Error('Failed to delete');
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete' }, { status: 500 });
  }
}
