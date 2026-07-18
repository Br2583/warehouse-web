import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let adminToken: string;
  try { adminToken = await getPbAdminToken(); }
  catch { return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 }); }

  const [companiesRes, usersRes] = await Promise.all([
    fetch(`${PB_URL}/api/collections/companies/records?perPage=200`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }),
    fetch(`${PB_URL}/api/collections/users/records?perPage=500&fields=id,name,email,role,company_id`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }),
  ]);

  const companiesData = await companiesRes.json();
  const usersData = await usersRes.json();

  const usersByCompany: Record<string, any[]> = {};
  for (const u of usersData.items || []) {
    if (!usersByCompany[u.company_id]) usersByCompany[u.company_id] = [];
    usersByCompany[u.company_id].push(u);
  }

  const companies = (companiesData.items || []).map((c: any) => ({
    id:        c.id,
    name:      c.name,
    owner_id:  c.owner_id,
    approved:  c.approved ?? false,
    suspended: c.suspended ?? false,
    rejected:  c.rejected ?? false,
    created:   c.created,
    members:   usersByCompany[c.id] || [],
    owner:     (usersByCompany[c.id] || []).find((u: any) => u.id === c.owner_id) || null,
  }));

  return NextResponse.json({
    companies,
    truncated: companiesData.totalItems > 200 || usersData.totalItems > 500,
    totalCompanies: companiesData.totalItems,
  });
}
