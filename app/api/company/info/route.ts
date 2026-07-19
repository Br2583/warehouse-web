import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

export async function PUT(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') || '';
  const userToken  = authHeader.replace('Bearer ', '').trim();
  if (!userToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

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
    return NextResponse.json({ error: 'Only the owner can update company info' }, { status: 403 });
  }

  const updateRes = await fetch(`${PB_URL}/api/collections/companies/records/${me.company_id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: body.name.trim() }),
  });
  if (!updateRes.ok) return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  const updated = await updateRes.json();

  return NextResponse.json({ name: updated.name });
}
