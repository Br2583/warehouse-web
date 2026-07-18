import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/tokens';
import { sendEmail, clientApprovedEmail, clientRejectedEmail, clientDeletedEmail, activationEmail } from '@/lib/email';
import { isAdminRequest } from '@/lib/admin-auth';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://managerwarehouse.cc';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  const [companyRes, ownerRes] = await Promise.all([
    fetch(`${PB_URL}/api/collections/companies/records/${id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }),
    fetch(`${PB_URL}/api/collections/users/records?filter=(company_id="${id}")&fields=id,name,email,role&perPage=200`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }),
  ]);

  if (!companyRes.ok) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  const company = await companyRes.json();
  const usersData = await ownerRes.json();
  const owner = (usersData.items || []).find((u: any) => u.id === company.owner_id) || null;

  if (action === 'send_code') {
    if (!owner?.email) return NextResponse.json({ error: 'Owner email not found' }, { status: 400 });
    const token = signToken({ purpose: 'activate', companyId: id }, 3600);
    const link = `${APP_URL}/activate?token=${token}`;
    const email = activationEmail(owner.name || 'Cliente', company.name, link);
    await sendEmail({ to: owner.email, toName: owner.name, ...email });
    return NextResponse.json({ ok: true });
  }

  if (action === 'approve') {
    const patchRes = await fetch(`${PB_URL}/api/collections/companies/records/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: true, suspended: false, rejected: false }),
    });
    if (!patchRes.ok) return NextResponse.json({ error: 'PocketBase update failed' }, { status: 502 });
    if (owner?.email) {
      const email = clientApprovedEmail(owner.name || 'Cliente', company.name);
      await sendEmail({ to: owner.email, toName: owner.name, ...email }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  if (action === 'reject') {
    const patchRes = await fetch(`${PB_URL}/api/collections/companies/records/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: false, rejected: true }),
    });
    if (!patchRes.ok) return NextResponse.json({ error: 'PocketBase update failed' }, { status: 502 });
    if (owner?.email) {
      const email = clientRejectedEmail(owner.name || 'Cliente', company.name);
      await sendEmail({ to: owner.email, toName: owner.name, ...email }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  if (action === 'suspend') {
    const patchRes = await fetch(`${PB_URL}/api/collections/companies/records/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspended: true }),
    });
    if (!patchRes.ok) return NextResponse.json({ error: 'PocketBase update failed' }, { status: 502 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'reactivate') {
    const patchRes = await fetch(`${PB_URL}/api/collections/companies/records/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspended: false, approved: true, rejected: false }),
    });
    if (!patchRes.ok) return NextResponse.json({ error: 'PocketBase update failed' }, { status: 502 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  const [companyRes, usersRes] = await Promise.all([
    fetch(`${PB_URL}/api/collections/companies/records/${id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }),
    fetch(`${PB_URL}/api/collections/users/records?filter=(company_id="${id}")&perPage=200`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }),
  ]);

  if (!companyRes.ok) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  const company = await companyRes.json();
  const usersData = await usersRes.json();
  const owner = (usersData.items || []).find((u: any) => u.id === company.owner_id);

  // Delete users first; tolerate individual failures but stop if all fail
  const userDels = await Promise.allSettled(
    (usersData.items || []).map((u: any) =>
      fetch(`${PB_URL}/api/collections/users/records/${u.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    )
  );
  const failures = userDels.filter(r => r.status === 'rejected');
  if (failures.length > 0 && failures.length === userDels.length && userDels.length > 0) {
    return NextResponse.json({ error: 'Failed to delete company users' }, { status: 500 });
  }

  await fetch(`${PB_URL}/api/collections/companies/records/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (owner?.email) {
    const email = clientDeletedEmail(owner.name || 'Cliente', company.name);
    await sendEmail({ to: owner.email, toName: owner.name, ...email }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
