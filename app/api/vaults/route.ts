import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

async function verifyUser(token: string) {
  const res = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const { record } = await res.json();
  return record as { id: string; company_id: string; role: string } | null;
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await verifyUser(token);
  if (!me?.company_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  // Single record by ID
  const id = req.nextUrl.searchParams.get('id')?.trim();
  if (id) {
    const res = await fetch(
      `${PB_URL}/api/collections/vaults/records/${id}?fields=id,client_name,position`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(await res.json());
  }

  // Search by query string
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json([]);

  const filter = `company_id="${me.company_id}" && (client_name~"${q}" || position~"${q}")`;
  const res = await fetch(
    `${PB_URL}/api/collections/vaults/records?filter=${encodeURIComponent(filter)}&fields=id,client_name,position&sort=-created&perPage=20`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );

  if (!res.ok) return NextResponse.json([]);
  const data = await res.json();
  return NextResponse.json(data.items || []);
}
