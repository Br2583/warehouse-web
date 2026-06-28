import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, clientApprovedEmail, clientRejectedEmail, clientDeletedEmail } from '@/lib/email';

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-production-e699.up.railway.app';
const ADMIN_USER_ID = process.env.ADMIN_USER_ID!;

async function getPbAdminToken() {
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: process.env.PB_ADMIN_EMAIL, password: process.env.PB_ADMIN_PASSWORD }),
  });
  const data = await res.json();
  return data.token as string;
}

function getCallerId(req: NextRequest): string | null {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return payload.id || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const callerEmail = getCallerId(req);
  if (callerEmail !== ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  const companyRes = await fetch(`${PB_URL}/api/collections/companies/records/${id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!companyRes.ok) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  const company = await companyRes.json();

  const ownerRes = company.owner_id
    ? await fetch(`${PB_URL}/api/collections/users/records/${company.owner_id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    : null;
  const owner = ownerRes ? await ownerRes.json() : null;

  if (action === 'approve') {
    await fetch(`${PB_URL}/api/collections/companies/records/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: true, rejected: false, suspended: false }),
    });
    if (owner?.email) {
      const email = clientApprovedEmail(owner.name || 'Cliente', company.name);
      await sendEmail({ to: owner.email, toName: owner.name, ...email }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  if (action === 'reject') {
    await fetch(`${PB_URL}/api/collections/companies/records/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejected: true, approved: false }),
    });
    if (owner?.email) {
      const email = clientRejectedEmail(owner.name || 'Cliente', company.name);
      await sendEmail({ to: owner.email, toName: owner.name, ...email }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  if (action === 'suspend') {
    await fetch(`${PB_URL}/api/collections/companies/records/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspended: true }),
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'reactivate') {
    await fetch(`${PB_URL}/api/collections/companies/records/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspended: false, approved: true, rejected: false }),
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const callerEmail = getCallerId(req);
  if (callerEmail !== ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const adminToken = await getPbAdminToken();

  const companyRes = await fetch(`${PB_URL}/api/collections/companies/records/${id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const company = await companyRes.json();

  const usersRes = await fetch(`${PB_URL}/api/collections/users/records?filter=(company_id="${id}")&perPage=200`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const usersData = await usersRes.json();
  const owner = (usersData.items || []).find((u: any) => u.id === company.owner_id);

  // Delete all users in company
  for (const u of usersData.items || []) {
    await fetch(`${PB_URL}/api/collections/users/records/${u.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }

  // Delete company record
  await fetch(`${PB_URL}/api/collections/companies/records/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  // Notify owner
  if (owner?.email) {
    const email = clientDeletedEmail(owner.name || 'Cliente', company.name);
    await sendEmail({ to: owner.email, toName: owner.name, ...email }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
