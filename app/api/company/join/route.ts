import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') || '';
  const userToken  = authHeader.replace('Bearer ', '').trim();
  if (!userToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { inviteCode } = body as { inviteCode?: string };
  if (!inviteCode || inviteCode.trim().length < 4) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 });
  }
  const code = inviteCode.trim().toUpperCase();

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  // Verify the user token to get their ID
  const meRes = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  if (!meRes.ok) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  const { record: me } = await meRes.json();
  if (!me?.id) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  if (me.company_id) return NextResponse.json({ error: 'Already in a company' }, { status: 409 });

  // Find company by invite code — using admin token so PB rules don't block the lookup
  const searchRes = await fetch(
    `${PB_URL}/api/collections/companies/records?filter=(invite_code%3D%22${encodeURIComponent(code)}%22)&perPage=1`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );
  if (!searchRes.ok) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  const { items } = await searchRes.json();
  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Invitation code not found or expired' }, { status: 404 });
  }
  const company = items[0];

  // Update user to join the company
  const updateRes = await fetch(`${PB_URL}/api/collections/users/records/${me.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id: company.id, role: 'worker', pending_action: '', pending_company_name: '' }),
  });
  if (!updateRes.ok) return NextResponse.json({ error: 'Failed to join company' }, { status: 500 });

  return NextResponse.json({ ok: true, company_id: company.id });
}
