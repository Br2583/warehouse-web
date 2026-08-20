import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/tokens';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';
import { dedupToken } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 });

    const payload = verifyToken(token);
    if (payload.purpose !== 'activate' || !payload.companyId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    // Cross-process dedup via Redis SET NX (prevents replay on multi-instance Railway)
    const ttlRemaining = Math.max((payload.exp as number) - Math.floor(Date.now() / 1000), 1);
    const dedup = await dedupToken(token, ttlRemaining);
    if (dedup === 'used') {
      return NextResponse.json({ error: 'This activation link has already been used.' }, { status: 400 });
    }
    // dedup === 'unknown' → Redis unavailable; PB timestamp check below still protects

    const adminToken = await getPbAdminToken();

    // Durable replay check — works across all Railway processes/dynos.
    // If the company was approved AFTER this token was issued, the token was already used.
    const companyRes = await fetch(
      `${PB_URL}/api/collections/companies/records/${payload.companyId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    if (!companyRes.ok) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    const company = await companyRes.json();
    const tokenIssuedMs = (payload.iat as number) * 1000;
    const companyUpdatedMs = new Date(company.updated).getTime();
    if (company.approved === true && companyUpdatedMs > tokenIssuedMs + 5000) {
      return NextResponse.json({ error: 'This activation link has already been used.' }, { status: 400 });
    }

    const res = await fetch(`${PB_URL}/api/collections/companies/records/${payload.companyId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: true, suspended: false, rejected: false }),
    });

    if (!res.ok) return NextResponse.json({ error: 'No se pudo activar la empresa' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Activation failed. The link may be invalid or expired.' }, { status: 400 });
  }
}
