import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/tokens';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

// Fast-path in-memory dedup for same-process replays
const _usedTokens = new Map<string, number>();
function _isUsedMemory(token: string): boolean {
  const exp = _usedTokens.get(token);
  if (exp === undefined) return false;
  if (Date.now() > exp) { _usedTokens.delete(token); return false; }
  return true;
}
function _markUsed(token: string, expSec: number) {
  _usedTokens.set(token, expSec * 1000);
  const now = Date.now();
  for (const [t, exp] of _usedTokens) { if (now > exp) _usedTokens.delete(t); }
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 });

    // Fast path: same-process replay
    if (_isUsedMemory(token)) {
      return NextResponse.json({ error: 'This activation link has already been used.' }, { status: 400 });
    }

    const payload = verifyToken(token);
    if (payload.purpose !== 'activate' || !payload.companyId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

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
    _markUsed(token, payload.exp as number);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error al activar' }, { status: 400 });
  }
}
