import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') || '';
  const userToken  = authHeader.replace('Bearer ', '').trim();
  if (!userToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { inviteCode } = body as { inviteCode?: string };
  if (!inviteCode || inviteCode.trim().length < 8) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 });
  }
  const code = inviteCode.trim().toUpperCase();
  const safeCode = code.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

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
    `${PB_URL}/api/collections/companies/records?filter=(invite_code%3D%22${encodeURIComponent(safeCode)}%22)&perPage=1`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );
  if (!searchRes.ok) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  const { items } = await searchRes.json();
  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Invitation code not found or expired' }, { status: 404 });
  }
  const company = items[0];

  // A-10: Block if company is not active
  if (!company.approved || company.suspended || company.rejected) {
    return NextResponse.json({ error: 'This company is not currently accepting new members' }, { status: 403 });
  }

  // A-11: Enforce member limit
  if (company.max_members) {
    const countRes = await fetch(
      `${PB_URL}/api/collections/users/records?filter=(company_id%3D%22${company.id}%22)&perPage=1&fields=id`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    if (countRes.ok) {
      const countData = await countRes.json();
      if ((countData.totalItems ?? 0) >= company.max_members) {
        return NextResponse.json({ error: 'This company has reached its member limit' }, { status: 403 });
      }
    }
  }

  // Update user to join the company
  const updateRes = await fetch(`${PB_URL}/api/collections/users/records/${me.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id: company.id, role: 'worker', pending_action: '', pending_company_name: '' }),
  });
  if (!updateRes.ok) return NextResponse.json({ error: 'Failed to join company' }, { status: 500 });

  return NextResponse.json({ ok: true, company_id: company.id });
}
