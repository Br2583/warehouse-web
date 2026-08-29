import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const userToken = auth.replace('Bearer ', '');
  if (!userToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify user token is valid
  const meRes = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
    method: 'POST',
    headers: { Authorization: userToken },
  });
  if (!meRes.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const meData = await meRes.json();
  const userCompanyId = meData.record?.company_id as string | undefined;

  const body = await req.json().catch(() => ({}));
  const { originalVaultId, dvId, companyId } = body as {
    originalVaultId?: string;
    dvId?: string;
    companyId?: string;
  };

  if (!companyId || companyId !== userCompanyId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const adminToken = await getPbAdminToken();
    const ids = new Set<string>();

    const collectIds = async (filter: string) => {
      const url = `${PB_URL}/api/collections/activity_logs/records?filter=${encodeURIComponent(filter)}&fields=id&perPage=200`;
      const r = await fetch(url, { headers: { Authorization: adminToken } });
      if (!r.ok) return;
      const data = await r.json();
      for (const item of data.items ?? []) ids.add(item.id as string);
    };

    // CREATED / EDITED / MOVED logs use originalVaultId as entity_id
    if (originalVaultId) {
      await collectIds(`company_id="${companyId}" && entity_id="${originalVaultId}"`);
    }
    // Since vaults are soft-deleted, every log for a vault shares the same entity_id
    if (dvId) {
      await collectIds(`company_id="${companyId}" && entity_id="${dvId}"`);
    }

    await Promise.allSettled(
      [...ids].map(id =>
        fetch(`${PB_URL}/api/collections/activity_logs/records/${id}`, {
          method: 'DELETE',
          headers: { Authorization: adminToken },
        })
      )
    );

    return NextResponse.json({ deleted: ids.size });
  } catch {
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
