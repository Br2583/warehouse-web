import { NextRequest, NextResponse } from 'next/server';

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-production-e699.up.railway.app';
const ADMIN_EMAIL = process.env.ADMIN_USER_EMAIL!;

async function getPbAdminToken() {
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: process.env.PB_ADMIN_EMAIL, password: process.env.PB_ADMIN_PASSWORD }),
  });
  const data = await res.json();
  return data.token as string;
}

async function getCallerEmail(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  try {
    const res = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.record?.email || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const callerEmail = await getCallerEmail(req);
  if (callerEmail !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminToken = await getPbAdminToken();

  const [companiesRes, usersRes] = await Promise.all([
    fetch(`${PB_URL}/api/collections/companies/records?perPage=200&sort=-created`, {
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

  return NextResponse.json({ companies });
}
