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
  const [vaultsData, warehousesData] = await Promise.all([
    pbGet(`/api/collections/vaults/records?perPage=5000&filter=${cFilter}&fields=id,estado,warehouse_id,job_type,created,pack_date,client_name,position`, adminToken),
    pbGet(`/api/collections/warehouses/records?perPage=100&filter=${cFilter}&fields=id,name`, adminToken),
  ]);

  const vaults: any[]     = vaultsData.items    || [];
  const warehouses: any[] = warehousesData.items || [];

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
      const dateStr = v.pack_date || v.created;
      if (dateStr) {
        const ts = new Date(dateStr.replace(' ', 'T')).getTime();
        if (now - ts > 3 * 24 * 60 * 60 * 1000) sla_count++;
      }
    }
  }

  const recent = [...vaults]
    .sort((a, b) => (b.created || '') > (a.created || '') ? 1 : -1)
    .slice(0, 5)
    .map(v => ({ box_id: v.id, client_name: v.client_name, position: v.position, estado: v.estado, status: v.estado, created: v.created }));

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
    recent,
    sla_count,
    histogram,
    wh_map: whMap,
  });
}
