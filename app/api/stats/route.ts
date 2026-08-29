import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

async function pbGet(path: string, adminToken: string) {
  const res = await fetch(`${PB_URL}${path}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!res.ok) throw new Error('PocketBase error');
  return res.json();
}

export async function GET(req: NextRequest) {
  try {
  const authHeader = req.headers.get('authorization') || '';
  const userToken  = authHeader.replace('Bearer ', '').trim();
  if (!userToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const refreshRes = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  if (!refreshRes.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { record } = await refreshRes.json();
  const companyId = record?.company_id;
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 });

  const adminToken = await getPbAdminToken();

  const cFilter = encodeURIComponent(`company_id="${companyId}"`);
  // Vaults in the recycle bin must not count towards any statistic
  const vFilter = encodeURIComponent(`company_id="${companyId}" && deleted_at = ""`);
  const warehousesData = await pbGet(`/api/collections/warehouses/records?perPage=100&filter=${cFilter}&fields=id,name`, adminToken);
  const warehouses: any[] = warehousesData.items || [];

  // Paginate vaults to avoid silent truncation at server-side perPage limits
  const vaults: any[] = [];
  let vPage = 1;
  while (true) {
    const vd = await pbGet(`/api/collections/vaults/records?perPage=500&page=${vPage}&filter=${vFilter}&fields=id,estado,warehouse_id,job_type,created,client_name,position`, adminToken);
    const items: any[] = vd.items || [];
    vaults.push(...items);
    if (items.length < 500) break;
    vPage++;
  }

  const whMap: Record<string, string> = {};
  for (const w of warehouses) whMap[w.id] = w.name;

  const statuses: Record<string, number>      = {};
  const by_warehouse: Record<string, number>  = {};
  const job_types: Record<string, number>     = {};
  let sla_count = 0;
  const now = Date.now();

  for (const v of vaults) {
    const s = v.estado || 'PENDING';
    statuses[s]                        = (statuses[s]                          || 0) + 1;
    by_warehouse[v.warehouse_id]       = (by_warehouse[v.warehouse_id]         || 0) + 1;
    job_types[v.job_type || 'Other']   = (job_types[v.job_type || 'Other']     || 0) + 1;
    if (s === 'PENDING') {
      const dateStr = v.created;
      if (dateStr) {
        const ts = new Date(dateStr.replace(' ', 'T')).getTime();
        if (now - ts > 3 * 24 * 60 * 60 * 1000) sla_count++;
      }
    }
  }

  // Oldest PENDING vaults — need most attention
  const attention = vaults
    .filter(v => (v.estado || 'PENDING') === 'PENDING')
    .sort((a, b) => (a.created || '') > (b.created || '') ? 1 : -1)
    .slice(0, 5)
    .map(v => ({ box_id: v.id, client_name: v.client_name, position: v.position, warehouse_id: v.warehouse_id, estado: v.estado, created: v.created }));

  const histogram: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    histogram.push({
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: vaults.filter(v => (v.created || '').split(/[ T]/)[0] === dateStr).length,
    });
  }

  return NextResponse.json({
    total_boxes: vaults.length,
    statuses,
    by_warehouse,
    job_types,
    attention,
    sla_count,
    wh_map: whMap,
  });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load stats' }, { status: 500 });
  }
}
