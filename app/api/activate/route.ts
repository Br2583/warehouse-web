import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/tokens';

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-production-e699.up.railway.app';

async function getPbAdminToken() {
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: process.env.PB_ADMIN_EMAIL, password: process.env.PB_ADMIN_PASSWORD }),
  });
  const data = await res.json();
  return data.token as string;
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 });

    const payload = verifyToken(token);
    if (payload.purpose !== 'activate' || !payload.companyId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    const adminToken = await getPbAdminToken();
    const res = await fetch(`${PB_URL}/api/collections/companies/records/${payload.companyId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: true, suspended: false, rejected: false }),
    });

    if (!res.ok) return NextResponse.json({ error: 'No se pudo activar la empresa' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error al activar' }, { status: 400 });
  }
}
