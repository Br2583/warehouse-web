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

  const url = new URL(req.url);
  const warehouseId = url.searchParams.get('warehouse_id') || '';
  const q = url.searchParams.get('q') || '';

  function sf(v: string) { return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

  let filter = `company_id="${sf(me.company_id)}"`;
  if (warehouseId) filter += ` && warehouse_id="${sf(warehouseId)}"`;
  if (q) filter += ` && (client_name~"${sf(q)}" || comments~"${sf(q)}" || furniture_type~"${sf(q)}")`;

  const res = await fetch(
    `${PB_URL}/api/collections/loose_items/records?filter=${encodeURIComponent(filter)}&sort=id&perPage=500`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  if (!res.ok) return NextResponse.json({ error: 'Failed to load loose items' }, { status: 502 });
  const data = await res.json();
  return NextResponse.json(data.items || []);
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await verifyUser(token);
  if (!me?.company_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me.role !== 'owner' && me.role !== 'manager') {
    return NextResponse.json({ error: 'Only managers and owners can create items' }, { status: 403 });
  }

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  const body = await req.json();
  if (!body.client_name?.trim()) return NextResponse.json({ error: 'Client name is required' }, { status: 400 });

  const photos = body.photos || [];
  if (photos.length > 4) return NextResponse.json({ error: 'Maximum 4 photos allowed' }, { status: 400 });

  const res = await fetch(`${PB_URL}/api/collections/loose_items/records`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      warehouse_id:   body.warehouse_id || '',
      company_id:     me.company_id,
      client_name:    body.client_name.trim(),
      grid_x:         body.grid_x || '1',
      grid_y:         body.grid_y || '1',
      item_type:      body.item_type || 'Boxes',
      furniture_type: body.furniture_type || '',
      color:          body.color || '',
      condition:      body.condition || [],
      status:         body.status || 'PENDING',
      photos,
      comments:       body.comments || '',
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: (err as any)?.message || 'Failed to create item' }, { status: 500 });
  }
  return NextResponse.json(await res.json());
}
