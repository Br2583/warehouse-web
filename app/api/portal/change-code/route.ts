import { NextRequest, NextResponse } from 'next/server';

const PB_URL = 'https://pocketbase-production-e699.up.railway.app';

export async function POST(req: NextRequest) {
  // Verify caller is an owner via PocketBase token
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const pbRes = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
    method: 'POST',
    headers: { Authorization: authHeader },
  }).catch(() => null);

  if (!pbRes?.ok) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { record } = await pbRes.json();
  if (record?.role !== 'owner') {
    return NextResponse.json({ error: 'Owner role required.' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.current !== 'string' || typeof body.newCode !== 'string') {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { current, newCode } = body;

  if (!current || !newCode) {
    return NextResponse.json({ error: 'Both current and new codes are required.' }, { status: 400 });
  }
  if (newCode.length < 4) {
    return NextResponse.json({ error: 'New code must be at least 4 characters.' }, { status: 400 });
  }

  // Get the company's current portal_code (or fall back to env global code)
  const companyId = record.company_id;
  if (!companyId) {
    return NextResponse.json({ error: 'No company linked to this account.' }, { status: 400 });
  }

  const companyRes = await fetch(`${PB_URL}/api/collections/companies/records/${companyId}`, {
    headers: { Authorization: authHeader },
  }).catch(() => null);

  if (!companyRes?.ok) {
    return NextResponse.json({ error: 'Could not fetch company data.' }, { status: 500 });
  }

  const company = await companyRes.json();
  const currentCode = company.portal_code || process.env.PORTAL_CODE || '';

  if (!currentCode) {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  }

  if (current !== currentCode) {
    return NextResponse.json({ error: 'Current code is incorrect.' }, { status: 401 });
  }

  // Update the company's portal_code in PocketBase
  const updateRes = await fetch(`${PB_URL}/api/collections/companies/records/${companyId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({ portal_code: newCode }),
  }).catch(() => null);

  if (!updateRes?.ok) {
    return NextResponse.json({ error: 'Failed to update portal code.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
