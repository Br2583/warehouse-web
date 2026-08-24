import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

const sf = (v: string) => v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

async function getAuthenticatedUser(req: NextRequest): Promise<{ id: string; company_id: string; name: string; role: string } | null> {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  try {
    const res = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const { record } = await res.json();
    return record ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ warehouseId: string }> }) {
  const { warehouseId } = await params;
  const me = await getAuthenticatedUser(req);
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!me.company_id) return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
  if (me.role !== 'owner' && me.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed — try again' }, { status: 500 }); }

  // Fetch vaults for this warehouse (or all if "all") — paginate to avoid truncation
  let vaultFilter = `company_id="${sf(me.company_id)}"`;
  if (warehouseId && warehouseId !== 'all') vaultFilter += ` && warehouse_id="${sf(warehouseId)}"`;

  const vaults: any[] = [];
  const FIELDS = 'id,warehouse_id,row,col,level,position,client_name,job_type,vault_status,content_type,room_location,packer,pack_date,comments,estado,company_id';
  let page = 1;
  while (true) {
    const vaultsRes = await fetch(
      `${PB_URL}/api/collections/vaults/records?filter=${encodeURIComponent(vaultFilter)}&perPage=500&page=${page}&fields=${FIELDS}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    if (!vaultsRes.ok) return NextResponse.json({ error: 'Failed to fetch vaults' }, { status: 502 });
    const vaultsData = await vaultsRes.json();
    const items: any[] = vaultsData.items || [];
    vaults.push(...items);
    if (items.length < 500) break;
    page++;
  }

  // Get warehouse name
  let warehouseName = 'All Warehouses';
  if (warehouseId && warehouseId !== 'all') {
    const whRes = await fetch(
      `${PB_URL}/api/collections/warehouses/records/${warehouseId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    if (whRes.ok) {
      const wh = await whRes.json();
      if (wh.company_id !== me.company_id) {
        return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
      }
      warehouseName = wh.name || warehouseName;
    }
  }

  // Create snapshot with admin token (bypasses collection create rules)
  const snapRes = await fetch(`${PB_URL}/api/collections/snapshots/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      company_id: me.company_id,
      date: new Date().toISOString().split('T')[0],
      data: {
        warehouse_name: warehouseName,
        box_count: vaults.length,
        vaults: vaults.map((v: any) => ({
          id: v.id,
          box_id: v.id,
          warehouse_id: v.warehouse_id,
          row: v.row,
          column: v.col,
          level: v.level,
          position: v.position,
          client_name: v.client_name,
          job_type: v.job_type,
          vault_status: v.vault_status,
          content_type: v.content_type,
          room_location: v.room_location,
          packer: v.packer,
          pack_date: v.pack_date,
          comments: v.comments,
          estado: v.estado,
          status: v.estado,
        })),
      },
      created_by: me.id,
    }),
  });

  if (!snapRes.ok) {
    const err = await snapRes.json().catch(() => ({}));
    return NextResponse.json({ error: err?.message || 'Failed to create snapshot' }, { status: 502 });
  }

  const snap = await snapRes.json();
  return NextResponse.json({ id: snap.id, date: snap.date });
}
