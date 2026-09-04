import { NextRequest, NextResponse } from 'next/server';
import { getPbAdminToken, PB_URL, verifySessionUser } from '@/lib/pb-admin';
import { joinRateLimit, checkLimit } from '@/lib/rate-limit';

// A company invite code. Ambiguous characters removed; 8 chars.
function genCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

/**
 * Creates a company and makes the caller its owner — server-side with the admin
 * token. This exists because assigning company_id/role is a privileged action:
 * the `users` collection rules forbid a user from setting those fields on
 * themselves (doing so would let anyone plant an owner account inside another
 * company). All company assignment must therefore flow through this route or
 * /api/company/join, never a direct browser write.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await verifySessionUser(token);
  if (!me?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // A user who already belongs to a company cannot create another (prevents
  // re-assigning yourself into a different company).
  if (me.company_id) return NextResponse.json({ error: 'You already belong to a company' }, { status: 400 });

  if (!await checkLimit(joinRateLimit, me.id)) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
  if (name.length > 100) return NextResponse.json({ error: 'Company name too long' }, { status: 400 });

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  // Create the company (never trust client-supplied approval/plan state)
  const compRes = await fetch(`${PB_URL}/api/collections/companies/records`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      invite_code: genCode(),
      owner_id:    me.id,
      plan:        'active',
      max_members: 50,
      approved:    false,
      suspended:   false,
      rejected:    false,
    }),
  });
  const company = await compRes.json();
  if (!compRes.ok || !company?.id) {
    return NextResponse.json({ error: 'Could not create company' }, { status: 502 });
  }

  // Make the caller the owner of that company
  const userRes = await fetch(`${PB_URL}/api/collections/users/records/${me.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id: company.id, role: 'owner', pending_action: '', pending_company_name: '' }),
  });
  if (!userRes.ok) {
    // Roll back the orphaned company so the user can retry cleanly
    await fetch(`${PB_URL}/api/collections/companies/records/${company.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` },
    }).catch(() => {});
    return NextResponse.json({ error: 'Could not assign you to the company' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, companyId: company.id });
}
