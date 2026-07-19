import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

function genCode(): string {
  const arr = new Uint8Array(6);
  (globalThis.crypto || crypto).getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('').substring(0, 8).toUpperCase();
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') || '';
  const userToken  = authHeader.replace('Bearer ', '').trim();
  if (!userToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  const meRes = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  if (!meRes.ok) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  const { record: me } = await meRes.json();
  if (!me?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 });

  const companyRes = await fetch(`${PB_URL}/api/collections/companies/records/${me.company_id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!companyRes.ok) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  const company = await companyRes.json();

  if (company.owner_id !== me.id) {
    return NextResponse.json({ error: 'Only the owner can generate invite codes' }, { status: 403 });
  }

  const code = genCode();
  const updateRes = await fetch(`${PB_URL}/api/collections/companies/records/${me.company_id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ invite_code: code }),
  });
  if (!updateRes.ok) return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });

  return NextResponse.json({ invite_code: code });
}
