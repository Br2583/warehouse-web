import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-production-e699.up.railway.app';

async function adminPb() {
  const pb = new PocketBase(PB_URL);
  await pb.collection('_superusers').authWithPassword(
    process.env.PB_ADMIN_EMAIL!,
    process.env.PB_ADMIN_PASSWORD!,
  );
  return pb;
}

export async function GET(req: NextRequest) {
  try {
    const companyId = req.nextUrl.searchParams.get('company_id');
    if (!companyId) return NextResponse.json([], { status: 200 });

    const pb = await adminPb();
    const page = await pb.collection('chat_messages').getList(1, 150, {
      filter: `company_id="${companyId}"`,
      sort: '-created',
      fields: 'id,author_name,author_id,content,created',
    });

    const msgs = page.items.reverse().map((m: any) => ({
      id:           m.id,
      sender_name:  m.author_name,
      sender_email: m.author_id,
      text:         m.content,
      timestamp:    m.created?.replace(' ', 'T') ?? new Date().toISOString(),
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

    const pb = await adminPb();
    const msg = await pb.collection('chat_messages').create({
      company_id,
      author_id:   author_id || '',
      author_name: author_name || 'Unknown',
      content:     text,
      type:        'text',
    });

    return NextResponse.json({
      id:           msg.id,
      sender_name:  msg.author_name,
      sender_email: msg.author_id,
      text:         msg.content,
      timestamp:    msg.created?.replace(' ', 'T') ?? new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to send message' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const pb = await adminPb();
    await pb.collection('chat_messages').delete(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete' }, { status: 500 });
  }
}
