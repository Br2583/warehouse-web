import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

async function countCollection(token: string, collection: string): Promise<number> {
  try {
    const res = await fetch(
      `${PB_URL}/api/collections/${collection}/records?perPage=1&fields=id`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return -1;
    const data = await res.json();
    return data.totalItems ?? -1;
  } catch {
    return -1;
  }
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const token = await getPbAdminToken();
    const [users, companies, boxes, tasks] = await Promise.all([
      countCollection(token, 'users'),
      countCollection(token, 'companies'),
      countCollection(token, 'vaults'),
      countCollection(token, 'tasks'),
    ]);
    return NextResponse.json({ users, companies, boxes, tasks, ts: Date.now() });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
