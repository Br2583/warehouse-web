import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL, verifySessionUser } from '@/lib/pb-admin';

export async function DELETE(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await verifySessionUser(token);
  if (!me?.company_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me.role !== 'owner') {
    return NextResponse.json({ error: 'Only owners can clear chat' }, { status: 403 });
  }

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  let deleted = 0;
  // Paginate in case of large chat history
  for (let page = 1; page <= 20; page++) {
    const filter = encodeURIComponent(`company_id="${me.company_id}"`);
    const res = await fetch(
      `${PB_URL}/api/collections/chat_messages/records?filter=${filter}&perPage=500&fields=id&page=${page}`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    if (!res.ok) break;
    const { items, totalPages } = await res.json();
    if (!items?.length) break;

    await Promise.allSettled(
      (items as { id: string }[]).map(m =>
        fetch(`${PB_URL}/api/collections/chat_messages/records/${m.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      ),
    );
    deleted += items.length;
    if (page >= (totalPages || 1)) break;
  }

  return NextResponse.json({ deleted });
}
